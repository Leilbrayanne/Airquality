require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const bcrypt = require("bcryptjs");
// Ensure JWT secret is set
if (!process.env.JWT_SECRET) {
  console.error("🚨 JWT_SECRET environment variable is missing. Exiting.");
  process.exit(1);
}
const { Server } = require("socket.io");
const cors = require("cors");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");
const { calculateAQI, predictTrend } = require("./services/aqi");
const {
  initNotifier,
  processReadingForAlerts,
} = require("./services/notifier");
const { startPurpleAirPoller } = require("./services/purpleairPoller");
const { setupAedesBroker, publishMqttCommand } = require("./mqtt/aedes_broker");
const { verifyToken, requireRole } = require("./middleware/auth");
const { cacheGet, cacheSetex } = require("./redisClient");
const { validate } = require("./middleware/validation");
const {
  apiLimiter,
  authLimiter,
  reportLimiter,
} = require("./middleware/rateLimit");
const rateLimit = require('express-rate-limit');
const asyncHandler = require("./middleware/asyncHandler");
const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");
const securityHeaders = require("./middleware/securityHeaders");
const { securityEnhancements, inputValidation, securityLogger } = require("./middleware/securityEnhancements");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger/swagger.json");
const client = require("prom-client");
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Models
const SensorReading = require("./models/SensorReading");
const Room = require("./models/Room");
const Alert = require("./models/Alert");
const User = require("./models/User");
const ThresholdProfile = require("./models/ThresholdProfile");
const NotificationConfig = require("./models/NotificationConfig");
const MaintenanceLog = require("./models/MaintenanceLog");
const AuditLog = require("./models/AuditLog");
const SensorNode = require("./models/SensorNode");
const NodeHealth = require("./models/NodeHealth");
const CommissioningSession = require("./models/CommissioningSession");
const { recordAudit } = require("./services/audit");

const PORT = process.env.PORT || 5002;
const app = express();
const server = http.createServer(app);
// CORS Configuration - Production Safety
let allowedOrigins = [];

// Read from environment variable first (comma-separated list)
if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  console.log(`CORS: Using origins from ALLOWED_ORIGINS: ${allowedOrigins.join(', ')}`);
} else {
  // Fallback to default configuration
  allowedOrigins = process.env.NODE_ENV === "production"
    ? ["https://pureair-monitoring.com"] // Default production domain
    : [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
      ];

  // Add Vite's default ports for better development experience
  if (process.env.NODE_ENV !== "production") {
    // Add common Vite/React ports
    for (let port of [
      3000, 3001, 3002, 3003, 3004, 5173, 5174, 5175, 5176, 5177, 5178, 5179,
      5180,
    ]) {
      allowedOrigins.push(`http://localhost:${port}`);
      allowedOrigins.push(`http://127.0.0.1:${port}`);
    }
  }
}

// Add FRONTEND_URL if specified
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  },
});

// Middleware

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};
app.use((req, res, next) => {
  logger.info(
    `[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`,
  );
  next();
});

app.use(cors(corsOptions));
app.use(express.json());
// Development-only request logging (no sensitive data)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`,
    );
    // Safe logging - filter sensitive headers and bodies only when explicitly enabled
    if (process.env.LOG_REQUEST_BODY === 'true') {
      const safeHeaders = { ...req.headers };
      delete safeHeaders.authorization;
      delete safeHeaders.cookie;
      console.log("Safe Headers:", JSON.stringify(safeHeaders));

      // Only log non-sensitive body parts
      if (
        req.body &&
        typeof req.body === "object" &&
        Object.keys(req.body).length
      ) {
        const safeBody = { ...req.body };
        if (safeBody.password) safeBody.password = "[FILTERED]";
        if (safeBody.currentPassword) safeBody.currentPassword = "[FILTERED]";
        if (safeBody.newPassword) safeBody.newPassword = "[FILTERED]";
        console.log("Safe Body:", JSON.stringify(safeBody));
      }
    }
    next();
  });
}
// Apply security headers
app.use(securityHeaders);
// Apply enhanced security middleware for production
if (process.env.NODE_ENV === "production") {
  securityEnhancements(app);
  app.use(inputValidation);
  app.use(securityLogger);
}
// Global rate limiting
app.use("/api/", apiLimiter);
// Swagger UI documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// Prometheus metrics endpoint (Admin and Technician)
app.get(
  "/metrics",
  async (req, res) => {
    // Allow scraping with a bearer token header or from localhost if enabled
    try {
      const token = process.env.PROMETHEUS_SCRAPE_TOKEN;
      const localAllowed = process.env.PROMETHEUS_ALLOW_LOCAL === 'true';
      const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || (req.ip && req.ip.startsWith('::ffff:127.0.0.1'));

      if (token && req.headers['x-prometheus-scrape-token'] === token) {
        const metrics = await client.register.metrics();
        res.set('Content-Type', client.register.contentType);
        return res.send(metrics);
      }

      if (localAllowed && isLocal) {
        const metrics = await client.register.metrics();
        res.set('Content-Type', client.register.contentType);
        return res.send(metrics);
      }

      // Fallback to JWT auth + role check
      return verifyToken(req, res, () => {
        return requireRole(["ADMIN", "TECHNICIAN"])(req, res, async () => {
          try {
            const metrics = await client.register.metrics();
            res.set('Content-Type', client.register.contentType);
            res.send(metrics);
          } catch (ex) {
            res.status(500).end(ex);
          }
        });
      });
    } catch (ex) {
      res.status(500).end(ex);
    }
  },
);

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hospital_aqi")
  .then(() => logger.info("✓ Connected to MongoDB"))
  .catch((err) => logger.error("✗ MongoDB connection error:", err));

// Health check endpoint (for Docker/K8s)
app.get("/health", (req, res) => {
  res.json({ status: "healthy", uptime: process.uptime() });
});

// ============================================================================
// PUBLIC API ENDPOINTS (No authentication required)
// ============================================================================

// Public system status (for landing page)
app.get("/api/public/status", asyncHandler(async (req, res) => {
  const cacheKey = "public_status";
  const cached = await cacheGet(cacheKey);
  
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  try {
    // Get sanitized, anonymous statistics
    const nodeCount = await SensorNode.countDocuments({ status: "ONLINE" });
    const totalRooms = await Room.countDocuments();
    
    // Get latest readings (limited and sanitized)
    const latestReadings = await SensorReading.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .select('readings.pm25 readings.temperature readings.humidity timestamp -_id');
    
    // Calculate averages (sanitized)
    const avgStats = await SensorReading.aggregate([
      { $match: { timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
      { $group: {
        _id: null,
        avgPM25: { $avg: "$readings.pm25" },
        avgTemperature: { $avg: "$readings.temperature" },
        avgHumidity: { $avg: "$readings.humidity" }
      }}
    ]);

    const publicData = {
      system: {
        status: "operational",
        onlineNodes: nodeCount,
        totalRooms: totalRooms,
        uptime: process.uptime()
      },
      airQuality: {
        overallStatus: avgStats.length > 0 && avgStats[0].avgPM25 < 35 ? "GOOD" : "MODERATE",
        averagePM25: avgStats.length > 0 ? Math.round(avgStats[0].avgPM25 * 10) / 10 : 15.5,
        averageTemperature: avgStats.length > 0 ? Math.round(avgStats[0].avgTemperature * 10) / 10 : 22.5,
        averageHumidity: avgStats.length > 0 ? Math.round(avgStats[0].avgHumidity) : 55
      },
      lastUpdated: new Date().toISOString(),
      disclaimer: "This is anonymized, aggregated data for public display only."
    };

    // Cache for 5 minutes
    await cacheSetex(cacheKey, 300, JSON.stringify(publicData));
    res.json(publicData);
  } catch (error) {
    // Fallback demo data if database is unavailable
    res.json({
      system: {
        status: "operational",
        onlineNodes: 3,
        totalRooms: 8,
        uptime: process.uptime()
      },
      airQuality: {
        overallStatus: "GOOD",
        averagePM25: 18.3,
        averageTemperature: 23.4,
        averageHumidity: 58
      },
      lastUpdated: new Date().toISOString(),
      disclaimer: "Demo data - system initializing"
    });
  }
}));

// Public demo data endpoint (for landing page without authentication)
app.get("/api/public/demo", (req, res) => {
  res.json({
    demo: true,
    data: {
      pm10: 18.3,
      tvoc: 210,
      temperature: 23.4,
      humidity: 58,
      aqi_status: "GOOD",
      timestamp: new Date().toISOString()
    },
    message: "This is demo data. Login to see real-time sensor data."
  });
});

// Rate limiting for public endpoints
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/public/", publicLimiter);

// Detailed system health for Dashboard
app.get(
  "/api/health",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  asyncHandler(async (req, res) => {
    const cacheKey = "api_health";
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const nodeCount = await SensorNode.countDocuments();
    const readingCount = await SensorReading.countDocuments();
    const nodes = await SensorNode.find().populate("room");

    const mappedNodes = nodes.map((n) => ({
      id: n.node_id,
      room: n.room ? n.room.name : "Unassigned",
      status: n.status ? n.status.toLowerCase() : "offline",
      rssi: n.rssi !== undefined ? n.rssi : null,
      battery_level: n.battery_level !== undefined ? n.battery_level : null,
      battery_voltage:
        n.battery_voltage !== undefined ? n.battery_voltage : null,
      fw: n.firmware || "1.0.0",
      lastSeen: n.last_heartbeat
        ? new Date(n.last_heartbeat).toLocaleTimeString()
        : "Unknown",
    }));

    const healthEntryCount = await NodeHealth.countDocuments();
    const healthData = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
      mqtt: {
        label: "Aedes Broker",
        detail: "Internal MQTT Server",
        status: "online",
        uptime: Math.floor(process.uptime()) + "s",
        clients: nodeCount,
        msgs: readingCount,
      },
      websocket: {
        label: "Socket.io",
        detail: "Real-time Updates",
        status: "online",
        uptime: Math.floor(process.uptime()) + "s",
        connections: io.engine.clientsCount,
        messages: readingCount * 2,
      },
      database: {
        readingCount,
        nodeCount,
        healthEntryCount,
      },
      nodes: mappedNodes,
    };
    await cacheSetex(cacheKey, 30, JSON.stringify(healthData)); // TTL 30s
    res.json(healthData);
  }),
);

// Initialize Notifier
initNotifier();

// MQTT Setup
setupAedesBroker(io);

// PurpleAir Local Polling (reads PURPLEAIR_LOCAL_IP from .env)
startPurpleAirPoller(io);

// --- API Routes ---

const authRoutes = require("./routes/auth");
app.use("/api/auth", authLimiter, authRoutes);

// Users - Admin Only
app.get(
  "/api/users",
  verifyToken,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const users = await User.find().select("-password_hash");
    res.json(users);
  }),
);

app.put(
  "/api/users/:id",
  verifyToken,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const { username, role, email, is_active } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (username) user.username = username;
    if (role) user.role = role;
    if (email) user.email = email;
    if (is_active !== undefined) user.is_active = is_active;

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(req.body.password, salt);
    }

    await user.save();
    await recordAudit(req.userId, "UPDATE_USER", {
      targetUserId: user._id,
      targetUsername: user.username,
    });
    res.json({ message: "User updated successfully", user });
  }),
);

app.delete(
  "/api/users/:id",
  verifyToken,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (user) {
      await recordAudit(req.userId, "DELETE_USER", {
        targetUserId: user._id,
        targetUsername: user.username,
      });
    }
    res.json({ message: "User deleted successfully" });
  }),
);

// Rooms - Protected GET, Protected POST
app.get(
  "/api/rooms",
  verifyToken,
  asyncHandler(async (req, res) => {
    const cacheKey = "rooms_all";
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const rooms = await Room.find().populate("thresholdProfile");
    await cacheSetex(cacheKey, 60, JSON.stringify(rooms)); // TTL 60s
    res.json(rooms);
  }),
);

app.post(
  "/api/rooms",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  validate("room"),
  asyncHandler(async (req, res) => {
    const { roomId, name, type, thresholdProfile, customThresholds } = req.body;

    let profileId = thresholdProfile;
    if (customThresholds) {
      const profileName = `Custom Room ${roomId}`;
      let customProfile = await ThresholdProfile.findOne({ name: profileName });
      if (!customProfile) {
        customProfile = new ThresholdProfile({ name: profileName });
      }
      const cT = customThresholds;
      if (cT.pm10Warning !== undefined)
        customProfile.pm10.warning = cT.pm10Warning;
      if (cT.pm10Critical !== undefined)
        customProfile.pm10.critical = cT.pm10Critical;
      if (cT.pm25Warning !== undefined)
        customProfile.pm25.warning = cT.pm25Warning;
      if (cT.pm25Critical !== undefined)
        customProfile.pm25.critical = cT.pm25Critical;
      if (cT.tvocWarning !== undefined)
        customProfile.tvoc.warning = cT.tvocWarning;
      if (cT.tvocCritical !== undefined)
        customProfile.tvoc.critical = cT.tvocCritical;
      if (cT.tempWarningLow !== undefined)
        customProfile.temperature.warningLow = cT.tempWarningLow;
      if (cT.tempWarningHigh !== undefined)
        customProfile.temperature.warningHigh = cT.tempWarningHigh;
      if (cT.tempCriticalHigh !== undefined)
        customProfile.temperature.criticalHigh = cT.tempCriticalHigh;
      if (cT.humidityWarningLow !== undefined)
        customProfile.humidity.warningLow = cT.humidityWarningLow;
      if (cT.humidityWarningHigh !== undefined)
        customProfile.humidity.warningHigh = cT.humidityWarningHigh;
      await customProfile.save();
      profileId = customProfile._id;
    } else if (!profileId) {
      let defaultProfile = await ThresholdProfile.findOne({ name: "Default" });
      if (!defaultProfile) {
        defaultProfile = new ThresholdProfile({ name: "Default" });
        await defaultProfile.save();
      }
      profileId = defaultProfile._id;
    }

    const room = await Room.findOneAndUpdate(
      { roomId },
      { roomId, name, type, thresholdProfile: profileId },
      { upsert: true, new: true },
    );

    // Invalidate rooms cache
    const { cacheDel } = require("./redisClient");
    await cacheDel("rooms_all");

    await recordAudit(req.userId, "CREATE_ROOM", { roomId, name, type });

    res.status(201).json(room);
  }),
);

app.put(
  "/api/rooms/:id",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  validate("roomUpdate"),
  asyncHandler(async (req, res) => {
    const { roomId, name, type, thresholdProfile, customThresholds } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });

    let profileId = thresholdProfile;
    if (customThresholds) {
      const profileName = `Custom Room ${roomId || room.roomId}`;
      let customProfile = await ThresholdProfile.findOne({ name: profileName });
      if (!customProfile) {
        customProfile = new ThresholdProfile({ name: profileName });
      }
      const cT = customThresholds;
      if (cT.pm10Warning !== undefined)
        customProfile.pm10.warning = cT.pm10Warning;
      if (cT.pm10Critical !== undefined)
        customProfile.pm10.critical = cT.pm10Critical;
      if (cT.pm25Warning !== undefined)
        customProfile.pm25.warning = cT.pm25Warning;
      if (cT.pm25Critical !== undefined)
        customProfile.pm25.critical = cT.pm25Critical;
      if (cT.tvocWarning !== undefined)
        customProfile.tvoc.warning = cT.tvocWarning;
      if (cT.tvocCritical !== undefined)
        customProfile.tvoc.critical = cT.tvocCritical;
      if (cT.tempWarningLow !== undefined)
        customProfile.temperature.warningLow = cT.tempWarningLow;
      if (cT.tempWarningHigh !== undefined)
        customProfile.temperature.warningHigh = cT.tempWarningHigh;
      if (cT.tempCriticalHigh !== undefined)
        customProfile.temperature.criticalHigh = cT.tempCriticalHigh;
      if (cT.humidityWarningLow !== undefined)
        customProfile.humidity.warningLow = cT.humidityWarningLow;
      if (cT.humidityWarningHigh !== undefined)
        customProfile.humidity.warningHigh = cT.humidityWarningHigh;
      await customProfile.save();
      profileId = customProfile._id;
    }

    room.roomId = roomId || room.roomId;
    room.name = name || room.name;
    room.type = type || room.type;
    if (profileId) room.thresholdProfile = profileId;

    await room.save();

    // Invalidate rooms cache
    const { cacheDel } = require("./redisClient");
    await cacheDel("rooms_all");

    await recordAudit(req.userId, "UPDATE_ROOM", { roomId: room.roomId });
    res.json(room);
  }),
);

app.delete(
  "/api/rooms/:id",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  asyncHandler(async (req, res) => {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (room) {
      await recordAudit(req.userId, "DELETE_ROOM", { roomId: room.roomId });
    }
    res.json({ message: "Room deleted successfully" });
  }),
);

// Current Sensors
app.get(
  "/api/sensors/current",
  verifyToken,
  asyncHandler(async (req, res) => {
    const rooms = await Room.find();
    const currentData = await Promise.all(
      rooms.map(async (room) => {
        const latest = await SensorReading.findOne({ room: room._id }).sort({
          timestamp: -1,
        });
        return { room, latest };
      }),
    );
    res.json(currentData);
  }),
);

// History
app.get(
  "/api/sensors/history/:roomIdStr",
  verifyToken,
  asyncHandler(async (req, res) => {
    const room = await Room.findOne({ roomId: req.params.roomIdStr });
    if (!room) return res.status(404).json({ error: "Room not found" });

    const history = await SensorReading.find({ room: room._id })
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(history);
  }),
);

// Trends and Prediction
app.get(
  "/api/sensors/trends/:roomIdStr",
  verifyToken,
  asyncHandler(async (req, res) => {
    const room = await Room.findOne({ roomId: req.params.roomIdStr });
    if (!room) return res.status(404).json({ error: "Room not found" });

    const history = await SensorReading.find({ room: room._id })
      .sort({ timestamp: -1 })
      .limit(20);

    const prediction = predictTrend(history);
    res.json({ roomId: req.params.roomIdStr, ...prediction });
  }),
);

// Simple webhook authentication middleware
const verifyWebhook = (req, res, next) => {
  // Check for API key in query parameter or header
  const apiKey = req.query.api_key || req.headers["x-api-key"];
  const expectedKey = process.env.PURPLEAIR_API_KEY;

  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }
  next();
};

// PurpleAir Webhook Ingestion
app.post(
  "/api/sensors/purpleair",
  verifyWebhook,
  asyncHandler(async (req, res) => {
    // PurpleAir sends JSON data. It includes pm2.5_a, pm2.5_b, etc.
    const payload = req.body;
    const sensorMac = payload.SensorId || payload.mac_address || payload.mac;

    if (!sensorMac) {
      return res
        .status(400)
        .json({ error: "Missing sensor identification (MAC/SensorId)" });
    }

    // Find node mapped to this PurpleAir MAC
    const node = await SensorNode.findOne({
      $or: [{ mac_address: sensorMac }, { node_id: sensorMac }],
    });
    if (!node || !node.room) {
      return res
        .status(404)
        .json({
          error: "Sensor node not registered or not assigned to a room",
        });
    }

    const room = await Room.findById(node.room);

    // Extract A/B sensors (Assume standard PurpleAir PA-II format)
    const pm25_a = payload.pm2_5_atm || payload.pm25_a || 0;
    const pm25_b = payload.pm2_5_atm_b || payload.pm25_b || pm25_a; // fallback to a if single sensor
    const pm10_a = payload.pm10_0_atm || payload.pm10_a || 0;
    const pm10_b = payload.pm10_0_atm_b || payload.pm10_b || pm10_a;

    // Average for consolidated value
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

    try {
      await processReadingForAlerts(newReading, room, io);
    } catch (alertErr) {
      logger.error("PurpleAir webhook alert processing error:", alertErr);
    }

    io.to("airquality/live").emit("sensor-update", {
      roomId: room.roomId,
      ...newReading.toObject(),
    });

    io.to(`room-${room.roomId}`).emit("sensor-update", {
      roomId: room.roomId,
      ...newReading.toObject(),
    });

    res.status(200).json({ success: true, readingId: newReading._id });
  }),
);

// Export CSV
app.get(
  "/api/reports/export/:roomIdStr",
  verifyToken,
  reportLimiter,
  asyncHandler(async (req, res) => {
    const room = await Room.findOne({ roomId: req.params.roomIdStr });
    if (!room) return res.status(404).json({ error: "Room not found" });

    const history = await SensorReading.find({ room: room._id })
      .sort({ timestamp: -1 })
      .limit(5000);
    if (history.length === 0) {
      return res.status(404).json({ error: "No data found for this room" });
    }

    const fields = [
      "timestamp",
      "pm1",
      "pm25",
      "pm10",
      "tvoc",
      "eco2",
      "temperature",
      "humidity",
      "methane",
      "lpg",
      "co",
    ];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(history);

    res.header("Content-Type", "text/csv");
    // Use room.roomId from DB (not raw route param) to prevent header injection
    res.attachment(
      `hospital_iaq_${room.roomId}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    return res.send(csv);
  }),
);

// Export PDF Report
app.get(
  "/api/reports/pdf/:roomIdStr",
  verifyToken,
  reportLimiter,
  asyncHandler(async (req, res) => {
    const room = await Room.findOne({ roomId: req.params.roomIdStr });
    if (!room) return res.status(404).json({ error: "Room not found" });

    const history = await SensorReading.find({ room: room._id })
      .sort({ timestamp: -1 })
      .limit(200);
    if (history.length === 0)
      return res.status(404).json({ error: "No data found for this room" });

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    // Use room.roomId from DB (not raw route param) to prevent header injection
    const filename = `hospital_iaq_${room.roomId}_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // --- Header ---
    doc.rect(0, 0, doc.page.width, 80).fill("#1e3a5f");
    doc
      .fillColor("white")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("PUREAIR MONITORING - AUDIT REPORT", 50, 20);
    doc
      .fontSize(11)
      .font("Helvetica")
      .text(
        `Air Quality Audit Report — Room: ${room.name || req.params.roomIdStr}`,
        50,
        48,
      );
    doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 63);

    doc.moveDown(3).fillColor("#1e3a5f");

    // --- Summary Stats ---
    const avgPm25 = (
      history.reduce((s, r) => s + (r.pm25 || 0), 0) / history.length
    ).toFixed(1);
    const avgTemp = (
      history.reduce((s, r) => s + (r.temperature || 0), 0) / history.length
    ).toFixed(1);
    const avgHumidity = (
      history.reduce((s, r) => s + (r.humidity || 0), 0) / history.length
    ).toFixed(1);
    const maxPm25 = Math.max(...history.map((r) => r.pm25 || 0)).toFixed(1);

    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Summary Statistics", { underline: true });
    doc.moveDown(0.5).fontSize(11).font("Helvetica").fillColor("#333333");
    doc.text(`Total Readings: ${history.length}`);
    doc.text(
      `Period: ${new Date(history[history.length - 1].timestamp).toLocaleString()} → ${new Date(history[0].timestamp).toLocaleString()}`,
    );
    doc.text(`Avg PM2.5: ${avgPm25} µg/m³   |   Max PM2.5: ${maxPm25} µg/m³`);
    doc.text(
      `Avg Temperature: ${avgTemp} °C   |   Avg Humidity: ${avgHumidity} %`,
    );

    // --- Prediction Summary ---
    const prediction = predictTrend(history);
    doc
      .moveDown(0.5)
      .fillColor("#1e3a5f")
      .font("Helvetica-Bold")
      .text("Intelligent Prediction: ", { continued: true })
      .font("Helvetica")
      .fillColor(prediction.trend === "RISING" ? "#e11d48" : "#059669")
      .text(
        `${prediction.trend} trend detected (Rate: ${prediction.rate} µg/m³ per cycle)`,
      );
    doc
      .fillColor("#333333")
      .fontSize(10)
      .text(
        `Future Outlook: Expected AQI ${prediction.predictedAqi} (${prediction.predictedStatus}) if conditions persist.`,
      );

    doc.moveDown(1);

    // --- AQI Status Breakdown ---
    const statusCounts = history.reduce((acc, r) => {
      const s = r.aqi_status || "Unknown";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#1e3a5f")
      .text("AQI Status Breakdown", { underline: true });
    doc.moveDown(0.5).fontSize(11).font("Helvetica").fillColor("#333333");
    Object.entries(statusCounts).forEach(([status, count]) => {
      const pct = ((count / history.length) * 100).toFixed(1);
      doc.text(`${status}: ${count} readings (${pct}%)`);
    });

    doc.moveDown(1);

    // --- Reading Table ---
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#1e3a5f")
      .text("Recent Readings", { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const headers = ["Timestamp", "PM2.5", "Temp", "Humidity", "AQI", "Status"];
    const colWidths = [150, 70, 60, 70, 50, 80];
    const colX = colWidths.reduce((acc, w, i) => {
      acc.push(i === 0 ? 50 : acc[i - 1] + colWidths[i - 1]);
      return acc;
    }, []);

    // Header row
    doc.rect(50, tableTop, 495, 20).fill("#1e3a5f");
    doc.fillColor("white").fontSize(9).font("Helvetica-Bold");
    headers.forEach((h, i) =>
      doc.text(h, colX[i], tableTop + 5, { width: colWidths[i] }),
    );

    // Data rows (last 50)
    doc.font("Helvetica").fontSize(8).fillColor("#333333");
    const rows = history.slice(0, 50).reverse();
    rows.forEach((r, idx) => {
      const y = tableTop + 20 + idx * 16;
      if (y > doc.page.height - 70) return;
      if (idx % 2 === 0) doc.rect(50, y, 495, 16).fill("#f0f4f8");
      doc.fillColor("#333333");
      doc.text(new Date(r.timestamp).toLocaleString(), colX[0], y + 3, {
        width: colWidths[0],
      });
      doc.text(`${(r.pm25 || 0).toFixed(1)}`, colX[1], y + 3, {
        width: colWidths[1],
      });
      doc.text(`${(r.temperature || 0).toFixed(1)}°C`, colX[2], y + 3, {
        width: colWidths[2],
      });
      doc.text(`${(r.humidity || 0).toFixed(0)}%`, colX[3], y + 3, {
        width: colWidths[3],
      });
      doc.text(`${r.aqi || "-"}`, colX[4], y + 3, { width: colWidths[4] });
      doc.text(r.aqi_status || "-", colX[5], y + 3, { width: colWidths[5] });
    });

    // Footer
    doc
      .fontSize(8)
      .fillColor("#999999")
      .text(
        "CONFIDENTIAL — Hospital Environmental Health Record",
        50,
        doc.page.height - 40,
        { align: "center", width: 495 },
      );

    doc.end();
  }),
);

// Alerts are handled in the consolidated section below

// --- Admin Only Routes ---

// Sensor Nodes
app.get(
  "/api/nodes",
  verifyToken,
  asyncHandler(async (req, res) => {
    const nodes = await SensorNode.find().populate("room");
    res.json(nodes);
  }),
);

app.post(
  "/api/nodes",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  validate("nodeCreate"),
  asyncHandler(async (req, res) => {
    const {
      node_id,
      mac_address,
      firmware,
      hardware_version,
      room_id,
      status,
      location_method,
      location_confidence,
    } = req.body;

    let room = null;
    if (room_id) {
      room = await Room.findOne({ roomId: room_id });
      if (!room) {
        room = new Room({ roomId: room_id, name: room_id, type: "General" });
        await room.save();
      }
    }

    const node = await SensorNode.findOneAndUpdate(
      { node_id },
      {
        node_id,
        mac_address,
        firmware,
        hardware_version,
        room: room?._id,
        configured_room: room?._id,
        status: status || "ONLINE",
        location_method: location_method || "TOPIC",
        location_confidence: location_confidence ?? 100,
        last_heartbeat: new Date(),
      },
      { upsert: true, new: true },
    );

    await recordAudit(req.userId, "REGISTER_NODE", { node_id, room_id });
    res.status(201).json(node);
  }),
);

app.put(
  "/api/nodes/:id",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  validate("nodeUpdate"),
  asyncHandler(async (req, res) => {
    const {
      node_id,
      mac_address,
      firmware,
      hardware_version,
      room_id,
      status,
      location_method,
      location_confidence,
      battery_level,
      rssi,
      uptime,
      packet_loss_rate,
      last_reboot,
    } = req.body;

    const node = await SensorNode.findById(req.params.id);
    if (!node) return res.status(404).json({ error: "Sensor node not found" });

    if (node_id) node.node_id = node_id;
    if (mac_address) node.mac_address = mac_address;
    if (firmware) node.firmware = firmware;
    if (hardware_version) node.hardware_version = hardware_version;
    if (status) node.status = status;
    if (location_method) node.location_method = location_method;
    if (location_confidence !== undefined)
      node.location_confidence = location_confidence;
    if (battery_level !== undefined) node.battery_level = battery_level;
    if (rssi !== undefined) node.rssi = rssi;
    if (uptime !== undefined) node.uptime = uptime;
    if (packet_loss_rate !== undefined)
      node.packet_loss_rate = packet_loss_rate;
    if (last_reboot) node.last_reboot = last_reboot;

    if (room_id) {
      let room = await Room.findOne({ roomId: room_id });
      if (!room) {
        room = new Room({ roomId: room_id, name: room_id, type: "General" });
        await room.save();
      }
      node.room = room._id;
    }

    await node.save();
    await recordAudit(req.userId, "UPDATE_NODE", { node_id: node.node_id });
    res.json(node);
  }),
);

app.delete(
  "/api/nodes/:id",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  asyncHandler(async (req, res) => {
    await SensorNode.findByIdAndDelete(req.params.id);
    res.json({ message: "Node deleted successfully" });
  }),
);

// Beacon management (Admin)
const Beacon = require("./models/Beacon");

app.get(
  "/api/beacons",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  asyncHandler(async (req, res) => {
    const beacons = await Beacon.find().populate("room");
    res.json(beacons);
  }),
);

app.post(
  "/api/beacons",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  asyncHandler(async (req, res) => {
    const { uuid, room_id, description } = req.body;
    let room = null;
    if (room_id) {
      room = await Room.findOne({ roomId: room_id });
      if (!room) {
        room = new Room({ roomId: room_id, name: room_id, type: "General" });
        await room.save();
      }
    }
    const b = await Beacon.findOneAndUpdate(
      { uuid },
      { uuid, room: room?._id, description },
      { upsert: true, new: true },
    );
    res.status(201).json(b);
  }),
);

app.delete(
  "/api/beacons/:id",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  asyncHandler(async (req, res) => {
    await Beacon.findByIdAndDelete(req.params.id);
    res.json({ message: "Beacon deleted" });
  }),
);

// Remote Sensor Calibration
app.post(
  "/api/nodes/:nodeId/calibrate",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  validate("nodeCommand"),
  asyncHandler(async (req, res) => {
    const { nodeId } = req.params;
    const { command, parameters } = req.body;
    const node = await SensorNode.findOne({ node_id: nodeId }).populate("room");
    if (!node) return res.status(404).json({ error: "Sensor node not found" });

    if (!node.room || !node.room.roomId) {
      return res
        .status(400)
        .json({
          error: "Node must be assigned to a room before sending commands",
        });
    }

    const commandPayload = {
      command,
      parameters: parameters || {},
    };
    const topic = `hospital/${node.room.roomId}/commands`;

    await publishMqttCommand(topic, commandPayload);
    await recordAudit(req.userId, "SEND_NODE_COMMAND", {
      node_id: nodeId,
      command,
      parameters,
    });

    io.emit("system/node-command", {
      nodeId,
      command,
      topic,
      timestamp: Date.now(),
    });

    res.json({
      message: `Command ${command} sent to node ${nodeId}`,
      status: "SUCCESS",
      topic,
    });
  }),
);

// Node Health
app.get(
  "/api/nodes/:nodeId/health",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  asyncHandler(async (req, res) => {
    const node = await SensorNode.findOne({ node_id: req.params.nodeId });
    if (!node) return res.status(404).json({ error: "Sensor node not found" });
    const entries = await NodeHealth.find({ node_id: node.node_id })
      .sort({ timestamp: -1 })
      .limit(20);
    res.json(entries);
  }),
);

app.post(
  "/api/nodes/:nodeId/health",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  validate("nodeHealth"),
  asyncHandler(async (req, res) => {
    const node = await SensorNode.findOne({ node_id: req.params.nodeId });
    if (!node) return res.status(404).json({ error: "Sensor node not found" });

    const health = new NodeHealth({ node_id: node.node_id, ...req.body });
    await health.save();
    await recordAudit(req.userId, "CREATE_NODE_HEALTH", {
      node_id: node.node_id,
    });
    res.status(201).json(health);
  }),
);

// Commissioning workflow
app.get(
  "/api/nodes/commission/sessions",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  asyncHandler(async (req, res) => {
    const sessions = await CommissioningSession.find()
      .populate("room")
      .populate("assigned_by", "username email");
    res.json(sessions);
  }),
);

app.post(
  "/api/nodes/commission/discover",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  validate("commissionDiscover"),
  asyncHandler(async (req, res) => {
    const { provisional_id, node_id, mac_address, capabilities, signal_data } =
      req.body;
    const session = await CommissioningSession.findOneAndUpdate(
      { provisional_id },
      {
        node_id,
        mac_address,
        capabilities,
        signal_data,
        status: "DISCOVERED",
      },
      { upsert: true, new: true },
    );
    await recordAudit(req.userId, "DISCOVER_NODE", {
      provisional_id,
      node_id,
      mac_address,
    });
    res.status(201).json(session);
  }),
);

app.post(
  "/api/nodes/commission/assign",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  validate("commissionAssign"),
  asyncHandler(async (req, res) => {
    const { provisional_id, room_id, confirmed_by, assignment_method } =
      req.body;
    const session = await CommissioningSession.findOne({ provisional_id });
    if (!session)
      return res.status(404).json({ error: "Commissioning session not found" });

    let room = await Room.findOne({ roomId: room_id });
    if (!room) {
      room = new Room({ roomId: room_id, name: room_id, type: "General" });
      await room.save();
    }

    session.room = room._id;
    session.assigned_by = req.userId;
    session.assigned_at = new Date();
    session.status = "ASSIGNED";
    await session.save();

    if (session.node_id) {
      await SensorNode.findOneAndUpdate(
        { node_id: session.node_id },
        {
          room: room._id,
          configured_room: room._id,
          commissioning_method:
            assignment_method === "MANUAL_CONFIRMATION" ? "MANUAL" : "AUTO",
          commissioned_by: req.userId,
          commissioned_at: new Date(),
          status: "ONLINE",
        },
        { upsert: true, new: true },
      );
    }

    await recordAudit(req.userId, "ASSIGN_NODE", {
      provisional_id,
      room_id,
      confirmed_by,
    });
    res.json(session);
  }),
);

app.post(
  "/api/nodes/commission/validate",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  validate("commissionValidate"),
  asyncHandler(async (req, res) => {
    const { node_id, room_id, validation_tests } = req.body;
    const node = await SensorNode.findOne({ node_id }).populate("room");
    if (!node) return res.status(404).json({ error: "Sensor node not found" });

    const room = await Room.findOne({ roomId: room_id });
    if (!room) return res.status(404).json({ error: "Room not found" });

    const pass = node.room && node.room.roomId === room_id;
    const validation_result = {
      passed: pass,
      checked: validation_tests,
      nodeRoom: node.room ? node.room.roomId : null,
      expectedRoom: room_id,
    };

    await CommissioningSession.findOneAndUpdate(
      { node_id },
      {
        status: pass ? "VALIDATED" : "FAILED",
        validation_tests,
        validation_result,
        validation_notes: pass
          ? "Commissioning validation passed"
          : "Room mismatch or node not assigned",
      },
      { upsert: true, new: true },
    );

    await recordAudit(req.userId, "VALIDATE_NODE", {
      node_id,
      room_id,
      validation_tests,
      result: validation_result.passed,
    });
    res.json(validation_result);
  }),
);

// Consolidated section follows...

// --- Compliance & Maintenance Endpoints ---

// Maintenance Logs
app.get(
  "/api/maintenance",
  verifyToken,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      MaintenanceLog.find()
        .populate("room")
        .populate("technician", "username")
        .sort({ performedAt: -1 })
        .skip(skip)
        .limit(limit),
      MaintenanceLog.countDocuments(),
    ]);
    res.json({ total, page, limit, logs });
  }),
);

app.post(
  "/api/maintenance",
  verifyToken,
  requireRole(["TECHNICIAN", "ADMIN"]),
  validate("maintenance"),
  asyncHandler(async (req, res) => {
    const { roomId, actionType, details } = req.body;
    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: "Room not found" });

    const log = new MaintenanceLog({
      room: room._id,
      technician: req.userId,
      actionType,
      details,
    });
    await log.save();
    await recordAudit(req.userId, "LOG_MAINTENANCE", { roomId, actionType });
    res.status(201).json(log);
  }),
);

app.put(
  "/api/maintenance/:id",
  verifyToken,
  requireRole(["TECHNICIAN", "ADMIN"]),
  validate("maintenance"),
  asyncHandler(async (req, res) => {
    const { roomId, actionType, details } = req.body;
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log)
      return res.status(404).json({ error: "Maintenance log not found" });

    if (roomId) {
      const room = await Room.findOne({ roomId });
      if (room) log.room = room._id;
    }
    if (actionType) log.actionType = actionType;
    if (details) log.details = details;

    await log.save();
    await recordAudit(req.userId, "UPDATE_MAINTENANCE", { logId: log._id });
    res.json(log);
  }),
);

app.delete(
  "/api/maintenance/:id",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  asyncHandler(async (req, res) => {
    await MaintenanceLog.findByIdAndDelete(req.params.id);
    res.json({ message: "Maintenance log deleted successfully" });
  }),
);

// --- Threshold Profiles ---
app.get(
  "/api/thresholds",
  verifyToken,
  asyncHandler(async (req, res) => {
    const profiles = await ThresholdProfile.find();
    res.json(profiles);
  }),
);

app.post(
  "/api/thresholds",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  validate("threshold"),
  asyncHandler(async (req, res) => {
    const { name, pm10, pm25, tvoc, temperature, humidity } = req.body;
    const profile = await ThresholdProfile.findOneAndUpdate(
      { name },
      { name, pm10, pm25, tvoc, temperature, humidity },
      { upsert: true, new: true },
    );
    await recordAudit(req.userId, "UPDATE_THRESHOLD", { profileName: name });
    res.json(profile);
  }),
);

app.delete(
  "/api/thresholds/:id",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  asyncHandler(async (req, res) => {
    await ThresholdProfile.findByIdAndDelete(req.params.id);
    res.json({ message: "Threshold profile deleted successfully" });
  }),
);

// --- Alerts ---
app.get(
  "/api/alerts",
  verifyToken,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const total = await Alert.countDocuments();
    const alerts = await Alert.find()
      .populate("room")
      .sort({ triggeredAt: -1 })
      .skip(skip)
      .limit(limit);
    res.json({ data: alerts, page, limit, total });
  }),
);

app.patch(
  "/api/alerts/:id/acknowledge",
  verifyToken,
  asyncHandler(async (req, res) => {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: "Alert not found" });

    if (alert.status !== "ACKNOWLEDGED") {
      alert.status = "ACKNOWLEDGED";
      alert.acknowledgedBy = req.userId;
      alert.acknowledgedAt = new Date();
      await alert.save();
      await recordAudit(req.userId, "ACKNOWLEDGE_ALERT", {
        alertId: alert._id,
      });
    }

    res.json(alert);
  }),
);

app.delete(
  "/api/alerts/:id",
  verifyToken,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    await Alert.findByIdAndDelete(req.params.id);
    res.json({ message: "Alert deleted successfully" });
  }),
);

// Consolidation Point

app.get(
  "/api/notifications/config",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN", "STAFF"]),
  asyncHandler(async (req, res) => {
    let config = await NotificationConfig.findOne();
    if (!config) {
      config = new NotificationConfig({
        emailRecipients: [{ email: "admin@PureAir.cm", isActive: true }],
      });
      await config.save();
    }
    res.json(config);
  }),
);

app.put(
  "/api/notifications/config",
  verifyToken,
  requireRole(["ADMIN", "TECHNICIAN"]),
  asyncHandler(async (req, res) => {
    const {
      emailRecipients,
      alertCooldown,
      maintenanceMode,
      predictiveEnabled,
    } = req.body;
    let config = await NotificationConfig.findOne();
    if (!config) {
      config = new NotificationConfig({
        emailRecipients,
        alertCooldown,
        maintenanceMode,
        predictiveEnabled,
      });
    } else {
      if (emailRecipients) config.emailRecipients = emailRecipients;
      if (alertCooldown !== undefined) config.alertCooldown = alertCooldown;
      if (maintenanceMode !== undefined)
        config.maintenanceMode = maintenanceMode;
      if (predictiveEnabled !== undefined)
        config.predictiveEnabled = predictiveEnabled;
    }
    config.lastUpdated = Date.now();
    await config.save();

    if (maintenanceMode !== undefined) {
      await recordAudit(
        req.userId,
        maintenanceMode ? "ENTER_MAINTENANCE" : "EXIT_MAINTENANCE",
        { maintenanceMode },
      );
      // Broadcast change to all clients via Socket.io
      io.emit("system/config", config);
    }

    res.json(config);
  }),
);

// Audit Logs (Admin Only)
app.get(
  "/api/audit-logs",
  verifyToken,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const logs = await AuditLog.find()
      .populate("user", "username role")
      .sort({ timestamp: -1 })
      .limit(200);
    res.json(logs);
  }),
);

// Socket.io connection
io.on("connection", (socket) => {
  logger.info("Client connected to WebSocket:", socket.id);

  socket.on("join-room", (roomId) => {
    if (roomId === "airquality/live" || roomId === "alerts/live") {
      socket.join(roomId);
    } else {
      socket.join(`room-${roomId}`);
    }
  });

  socket.on("disconnect", () => {
    logger.info("Client disconnected:", socket.id);
  });
});

// Error handling (must be last middleware, but before listen)
app.use(errorHandler);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(
      `Port ${PORT} is already in use. Please stop the process using this port or set PORT to a different value.`,
    );
    process.exit(1);
  }
  logger.error("Server error:", err);
});

server.listen(PORT, () => {
  logger.info(`✓ Backend API running on port ${PORT}`);
  logger.info(
    `✓ MQTT Broker: mqtt://localhost:${process.env.MQTT_PORT || 1886}`,
  );
  logger.info(`✓ Demo data: npm run demo`);
});
