/**
 * PurpleAir Local Network Poller
 *
 * Polls a PurpleAir PA-II sensor on the local network via its built-in
 * HTTP JSON endpoint. The sensor exposes live data at http://<IP>/json.
 *
 * This service:
 *  1. Fetches the JSON every PURPLEAIR_POLL_INTERVAL seconds
 *  2. Parses dual-laser channels (A + B), averages PM2.5 and PM10
 *  3. Converts temperature from Fahrenheit → Celsius
 *  4. Calculates AQI using the EPA breakpoints
 *  5. Saves a SensorReading to MongoDB
 *  6. Pushes the reading to the React dashboard via Socket.io
 *  7. Triggers alert processing via the notifier service
 */

const http = require("http");
const SensorReading = require("../models/SensorReading");
const SensorNode = require("../models/SensorNode");
const Room = require("../models/Room");
const { calculateAQI } = require("./aqi");
const { processReadingForAlerts } = require("./notifier");
const logger = require("../utils/logger");

// Configuration from environment
const PURPLEAIR_IP = process.env.PURPLEAIR_LOCAL_IP || "";
const POLL_INTERVAL = parseInt(process.env.PURPLEAIR_POLL_INTERVAL, 10) || 30; // seconds
const PURPLEAIR_NODE_ID = process.env.PURPLEAIR_NODE_ID || "";
const PURPLEAIR_ROOM_ID = process.env.PURPLEAIR_ROOM_ID || "";

let pollTimer = null;
let isPolling = false;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 10;

/**
 * Fetch JSON data from the PurpleAir sensor's local endpoint.
 * Returns a parsed JSON object or throws on failure.
 */
function fetchPurpleAirJSON(ip) {
  return new Promise((resolve, reject) => {
    const url = `http://${ip}/json`;
    const req = http.get(url, { timeout: 10000 }, (res) => {
      let data = "";

      if (res.statusCode !== 200) {
        res.resume(); // consume response to free memory
        return reject(new Error(`PurpleAir HTTP ${res.statusCode}`));
      }

      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`PurpleAir JSON parse error: ${e.message}`));
        }
      });
    });

    req.on("error", (err) =>
      reject(new Error(`PurpleAir fetch error: ${err.message}`)),
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("PurpleAir request timeout (10s)"));
    });
  });
}

/**
 * Process a single poll cycle: fetch → parse → save → emit.
 */
async function pollOnce(io) {
  if (isPolling) return; // Prevent overlapping polls
  isPolling = true;

  try {
    const payload = await fetchPurpleAirJSON(PURPLEAIR_IP);

    // --- Identify the sensor MAC/ID ---
    const sensorMac =
      payload.SensorId ||
      payload.mac_address ||
      payload.mac ||
      PURPLEAIR_NODE_ID;
    if (!sensorMac) {
      logger.warn(
        "[PurpleAir Poller] No sensor MAC/ID found in response or config. Skipping.",
      );
      isPolling = false;
      return;
    }

    // --- Find or auto-create the node + room ---
    let node = await SensorNode.findOne({
      $or: [
        { mac_address: sensorMac },
        { node_id: sensorMac },
        { node_id: PURPLEAIR_NODE_ID },
      ],
    });

    let room = null;

    if (node && node.room) {
      room = await Room.findById(node.room);
    }

    // Auto-register node and room if not found (first-run convenience)
    if (!node || !room) {
      const roomId = PURPLEAIR_ROOM_ID || "PurpleAir-Zone";
      room = await Room.findOne({ roomId });
      if (!room) {
        room = new Room({ roomId, name: "PurpleAir Zone", type: "External" });
        await room.save();
        logger.info(`[PurpleAir Poller] Auto-created room: ${roomId}`);
      }

      const nodeId =
        PURPLEAIR_NODE_ID ||
        sensorMac ||
        `PA-${PURPLEAIR_IP.replace(/\./g, "-")}`;
      node = await SensorNode.findOneAndUpdate(
        { node_id: nodeId },
        {
          node_id: nodeId,
          mac_address: sensorMac,
          firmware: payload.version || payload.firmware_version || "PurpleAir",
          hardware_version: "PA-II",
          room: room._id,
          configured_room: room._id,
          status: "ONLINE",
          last_heartbeat: new Date(),
        },
        { upsert: true, new: true },
      );
      logger.info(`[PurpleAir Poller] Auto-registered node: ${nodeId}`);
    }

    // --- Extract and Process Readings ---
    const pm25_a = payload.pm2_5_atm || payload.pm25_a || 0;
    const pm25_b = payload.pm2_5_atm_b || payload.pm25_b || pm25_a;
    const pm10_a = payload.pm10_0_atm || payload.pm10_a || 0;
    const pm10_b = payload.pm10_0_atm_b || payload.pm10_b || pm10_a;

    const pm25 = (pm25_a + pm25_b) / 2;
    const pm10 = (pm10_a + pm10_b) / 2;

    const { aqi, status: aqi_status } = calculateAQI(pm25);

    const newReading = new SensorReading({
      room: room._id,
      node_id: node.node_id,
      pm1: payload.pm1_0_atm || 0,
      pm25_a,
      pm25_b,
      pm10_a,
      pm10_b,
      pm25,
      pm10,
      temperature: payload.current_temp_f
        ? ((payload.current_temp_f - 32) * 5) / 9
        : payload.temperature || 0,
      humidity: payload.current_humidity || payload.humidity || 0,
      aqi,
      aqi_status,
    });

    await newReading.save();
    consecutiveErrors = 0; // Reset error count

    // Process alerts
    try {
      await processReadingForAlerts(newReading, room, io);
    } catch (alertErr) {
      logger.error("[PurpleAir Poller] Alert processing error:", alertErr);
    }

    // Emit live updates
    io.to("airquality/live").emit("sensor-update", {
      roomId: room.roomId,
      ...newReading.toObject(),
    });

    io.to(`room-${room.roomId}`).emit("sensor-update", {
      roomId: room.roomId,
      ...newReading.toObject(),
    });

    // Mark node as online and update heartbeat
    await SensorNode.findByIdAndUpdate(node._id, {
      status: "ONLINE",
      last_heartbeat: new Date(),
      last_data_received: new Date(),
    });

  } catch (err) {
    consecutiveErrors++;
    logger.error(`[PurpleAir Poller] Poll attempt failed (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${err.message}`);
    
    // If consecutive errors are high, mark node as offline
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS && PURPLEAIR_NODE_ID) {
      try {
        await SensorNode.findOneAndUpdate(
          { node_id: PURPLEAIR_NODE_ID },
          { status: "OFFLINE" }
        );
      } catch (dbErr) {
        logger.error("[PurpleAir Poller] Failed to mark node offline:", dbErr.message);
      }
    }
  } finally {
    isPolling = false;
  }
}

/**
 * Start the polling loop.
 */
function startPurpleAirPoller(io) {
  if (!PURPLEAIR_IP) {
    logger.info("[PurpleAir Poller] PURPLEAIR_LOCAL_IP not configured. Poller disabled.");
    return;
  }

  logger.info(`[PurpleAir Poller] Starting poller. Target: http://${PURPLEAIR_IP}/json, Interval: ${POLL_INTERVAL}s`);
  
  // Poll once immediately, then start interval
  pollOnce(io);
  
  pollTimer = setInterval(() => {
    pollOnce(io);
  }, POLL_INTERVAL * 1000);
}

/**
 * Stop the polling loop.
 */
void function stopPurpleAirPoller() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    logger.info("[PurpleAir Poller] Poller stopped.");
  }
}

module.exports = { startPurpleAirPoller };