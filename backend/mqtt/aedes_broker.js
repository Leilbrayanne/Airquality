const fs = require('fs');
const tls = require('tls');
const SensorReading = require('../models/SensorReading');
const SensorNode = require('../models/SensorNode');
const NodeHealth = require('../models/NodeHealth');
const Room = require('../models/Room');
const Beacon = require('../models/Beacon');
const { processReadingForAlerts } = require('../services/notifier');
const { calculateAQI } = require('../services/aqi');

const MQTT_PORT = process.env.MQTT_PORT || 1886;
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;

if (!MQTT_USERNAME || !MQTT_PASSWORD) {
  console.warn('WARNING: MQTT_USERNAME / MQTT_PASSWORD env vars not set. MQTT client auth will reject all connections.');
}

let aedesBroker = null;

async function setupAedesBroker(io) {
  const aedes = await require('aedes').Aedes.createBroker();
  aedesBroker = aedes;
  const server = require('net').createServer(aedes.handle);

  server.listen(MQTT_PORT, '0.0.0.0', function () {
    console.log(`Aedes MQTT broker running on port ${MQTT_PORT} (IPv4)`);
  });

  // Optional TLS/mTLS server
  const MQTT_TLS_PORT = process.env.MQTT_TLS_PORT || 8883;
  const TLS_KEY = process.env.MQTT_TLS_KEY; // path to key
  const TLS_CERT = process.env.MQTT_TLS_CERT; // path to cert
  const TLS_CA = process.env.MQTT_TLS_CA; // optional CA to request client certs
  const REQUEST_CLIENT_CERT = process.env.MQTT_TLS_REQUEST_CLIENT_CERT === 'true';

  if (TLS_KEY && TLS_CERT) {
    try {
      const tlsOptions = {
        key: fs.readFileSync(TLS_KEY),
        cert: fs.readFileSync(TLS_CERT),
        requestCert: REQUEST_CLIENT_CERT,
        rejectUnauthorized: true
      };
      if (TLS_CA) tlsOptions.ca = fs.readFileSync(TLS_CA);

      const tlsServer = tls.createServer(tlsOptions, (socket) => {
        aedes.handle(socket);
      });

      tlsServer.listen(MQTT_TLS_PORT, () => {
        console.log(`Aedes MQTT TLS broker running on port ${MQTT_TLS_PORT} (mTLS request: ${REQUEST_CLIENT_CERT})`);
      });
    } catch (err) {
      console.error('Failed to start TLS MQTT server:', err);
    }
  }

  // Authenticate MQTT clients (supports optional mTLS verification and JWT token auth)
  const { recordAudit } = require('../services/audit');
  const { verifyMqttToken } = require('../mqtt/authHelper');
  aedes.authenticate = async (client, username, password, callback) => {
    const REQUEST_CLIENT_CERT = process.env.MQTT_TLS_REQUEST_CLIENT_CERT === 'true';
    const MQTT_AUTH_ENABLED = process.env.MQTT_AUTH_ENABLED === 'true';

    // 1️⃣ mTLS verification (if required)
    if (REQUEST_CLIENT_CERT) {
      try {
        const stream = client && client.conn && client.conn.stream;
        if (!stream) {
          const err = new Error('No underlying TLS stream');
          err.returnCode = 4;
          await recordAudit('SYSTEM', 'MQTT_CLIENT_CERT_REJECT', { clientId: client ? client.id : null, reason: 'no_stream' });
          return callback(err, false);
        }
        if (!stream.authorized) {
          const err = new Error('Client TLS certificate not authorized');
          err.returnCode = 4;
          await recordAudit('SYSTEM', 'MQTT_CLIENT_CERT_REJECT', { clientId: client.id, reason: 'not_authorized' });
          return callback(err, false);
        }
        const cert = stream.getPeerCertificate && stream.getPeerCertificate();
        const certCN = cert && cert.subject && (cert.subject.CN || cert.subject.commonName);
        if (!certCN) {
          const err = new Error('Client TLS certificate missing CN');
          err.returnCode = 4;
          await recordAudit('SYSTEM', 'MQTT_CLIENT_CERT_REJECT', { clientId: client.id, reason: 'missing_cn' });
          return callback(err, false);
        }
        const matchedNode = await SensorNode.findOne({ $or: [{ node_id: certCN }, { mac_address: certCN }] });
        if (!matchedNode) {
          const err = new Error('Certificate CN not mapped to a registered node');
          err.returnCode = 4;
          await recordAudit('SYSTEM', 'MQTT_CLIENT_CERT_REJECT', { clientId: client.id, certCN });
          return callback(err, false);
        }
        if (client.id !== matchedNode.node_id) {
          const err = new Error('Client ID does not match certificate CN');
          err.returnCode = 4;
          await recordAudit('SYSTEM', 'MQTT_CLIENT_CERT_REJECT', { clientId: client.id, certCN, expectedNodeId: matchedNode.node_id });
          return callback(err, false);
        }
        await recordAudit('SYSTEM', 'MQTT_CLIENT_CERT_AUTH', { clientId: client.id, certCN });
        // Continue to optional JWT check after mTLS success
      } catch (err) {
        err.returnCode = 4;
        console.error('Error during mTLS authentication:', err);
        await recordAudit('SYSTEM', 'MQTT_CLIENT_CERT_REJECT', { clientId: client ? client.id : null, error: err.message });
        return callback(err, false);
      }
    }

    // 2️⃣ JWT token authentication (optional, enabled via MQTT_AUTH_ENABLED)
    if (MQTT_AUTH_ENABLED) {
      try {
        const token = password && password.toString(); // Expect JWT in password field
        const decoded = verifyMqttToken(token);
        // Attach decoded payload to client for downstream use if needed
        client.user = decoded;
        return callback(null, true);
      } catch (authErr) {
        console.warn(`MQTT JWT auth failed for client ${client.id}: ${authErr.message}`);
        const err = new Error('Invalid MQTT token');
        err.returnCode = 4;
        await recordAudit('SYSTEM', 'MQTT_CLIENT_JWT_REJECT', { clientId: client.id, reason: authErr.message });
        return callback(err, false);
      }
    }

    // 3️⃣ Fallback to classic username/password auth (if JWT not enabled)
    const validUser = username === MQTT_USERNAME;
    const validPass = password && password.toString() === MQTT_PASSWORD;
    if (validUser && validPass) {
      return callback(null, true);
    }
    console.warn(`MQTT auth failed for client: ${client.id} (user: ${username})`);
    const error = new Error('Authentication failed');
    error.returnCode = 4;
    return callback(error, false);
  };

  // Handle client connections — mark node ONLINE
  aedes.on('client', async function (client) {
    console.log(`Client Connected: \x1b[33m${(client ? client.id : client)}\x1b[0m`, 'to broker', aedes.id);
    if (client) {
      await SensorNode.findOneAndUpdate(
        { node_id: client.id },
        { status: 'ONLINE', last_heartbeat: new Date() },
        { upsert: true, new: true }
      );
    }
  });

  // Handle client disconnections — mark node OFFLINE
  aedes.on('clientDisconnect', async function (client) {
    console.log(`Client Disconnected: \x1b[31m${(client ? client.id : client)}\x1b[0m`, 'to broker', aedes.id);
    if (client) {
      await SensorNode.findOneAndUpdate(
        { node_id: client.id },
        { status: 'OFFLINE' }
      );
    }
  });

  // Handle published messages
  aedes.on('publish', async function (packet, client) {
    if (client) {
      console.log(`Message from client ${client.id}:`, packet.topic);
      
      const topicParts = packet.topic.split('/');
      // Expected format: hospital/{room_id}/airquality
      if (topicParts.length === 3 && topicParts[0] === 'hospital' && topicParts[2] === 'airquality') {
        const roomIdStr = topicParts[1];
        
        try {
          const payload = JSON.parse(packet.payload.toString());
          
          // Find or create room (for prototype simplicity)
          let room = await Room.findOne({ roomId: roomIdStr });
          if (!room) {
            room = new Room({ roomId: roomIdStr, name: roomIdStr, type: 'General' });
            await room.save();
          }

          // Calculate AQI from PM2.5 reading
          const { aqi, status: aqi_status } = calculateAQI(payload.pm25 || 0);

          // Store the reading with AQI data
          const newReading = new SensorReading({
            room: room._id,
            node_id: client.id,
            pm1: payload.pm1,
            pm25: payload.pm25,
            pm10: payload.pm10,
            tvoc: payload.tvoc,
            eco2: payload.eco2,
            temperature: payload.temperature,
            humidity: payload.humidity,
            methane: payload.methane,
            lpg: payload.lpg,
            co: payload.co,
            gas: payload.gas,
            aqi,
            aqi_status
          });

          await newReading.save();

          const telemetryFields = {};
          if (payload.rssi !== undefined) telemetryFields.rssi = payload.rssi;
          if (payload.battery_level !== undefined) telemetryFields.battery_level = payload.battery_level;
          if (payload.battery_voltage !== undefined) telemetryFields.battery_voltage = payload.battery_voltage;
          if (payload.uptime !== undefined) telemetryFields.uptime = payload.uptime;
          if (payload.packet_loss_rate !== undefined) telemetryFields.packet_loss_rate = payload.packet_loss_rate;
          if (payload.last_reboot !== undefined) telemetryFields.last_reboot = new Date(payload.last_reboot);
          if (payload.mac_address) telemetryFields.mac_address = payload.mac_address;
          if (payload.firmware) telemetryFields.firmware = payload.firmware;
          if (payload.wifi_ssid) telemetryFields.wifi_ssid = payload.wifi_ssid;

          // Beacon-based room detection (if device reported beacons)
          if (payload.beacons && Array.isArray(payload.beacons) && payload.beacons.length > 0) {
            // find strongest beacon and map to room
            const sorted = payload.beacons.sort((a,b) => (b.rssi||0) - (a.rssi||0));
            const strongest = sorted[0];
            try {
              const b = await Beacon.findOne({ uuid: strongest.uuid });
              if (b && b.room) {
                telemetryFields.detected_room = b.room;
                telemetryFields.location_method = 'BLE_BEACON';
                telemetryFields.location_confidence = 90;
              }
            } catch (err) {
              console.warn('Error resolving beacon to room', err);
            }
          }

          await SensorNode.findOneAndUpdate(
            { node_id: client.id },
            {
              status: 'ONLINE',
              last_heartbeat: new Date(),
              last_data_received: new Date(),
              last_location_update: new Date(),
              room: room._id,
              configured_room: room._id,
              detected_room: room._id,
              location_method: 'TOPIC',
              location_confidence: 100,
              ...telemetryFields
            },
            { upsert: true }
          );

          if (payload.rssi !== undefined || payload.battery_level !== undefined || payload.battery_voltage !== undefined || payload.packet_loss_rate !== undefined) {
            const healthEntry = new NodeHealth({
              node_id: client.id,
              signal: {
                rssi: payload.rssi,
                snr: payload.snr,
                channel: payload.channel,
                tx_power: payload.tx_power
              },
              power: {
                battery_level: payload.battery_level,
                battery_voltage: payload.battery_voltage,
                charging_status: payload.charging_status,
                estimated_runtime: payload.estimated_runtime
              },
              data_quality: {
                packet_loss_rate: payload.packet_loss_rate,
                outlier_count: payload.outlier_count,
                transmission_interval: payload.transmission_interval,
                data_completeness: payload.data_completeness
              }
            });
            await healthEntry.save();
          }

          // Check against thresholds and create alerts
          await processReadingForAlerts(newReading, room, io);

          // Emit real-time data to frontend via WebSockets
          io.to('airquality/live').emit('sensor-update', {
            roomId: roomIdStr,
            ...newReading.toObject()
          });

          io.to(`room-${roomIdStr}`).emit('sensor-update', {
            roomId: roomIdStr,
            ...newReading.toObject()
          });
          
        } catch (err) {
          console.error('Error processing MQTT message in Aedes:', err);
        }
      }
    }
  });

  return aedes;
}

function publishMqttCommand(topic, payload) {
  return new Promise((resolve, reject) => {
    if (!aedesBroker) {
      return reject(new Error('MQTT broker not initialized'));
    }

    const packet = {
      topic,
      payload: JSON.stringify(payload),
      qos: 1,
      retain: false
    };

    aedesBroker.publish(packet, (err) => {
      if (err) {
        console.error('Failed to publish MQTT command:', err);
        return reject(err);
      }
      resolve();
    });
  });
}

module.exports = { setupAedesBroker, publishMqttCommand };
