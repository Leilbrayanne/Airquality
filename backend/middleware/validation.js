const Joi = require("joi");

// Validation schemas
const schemas = {
  // Auth schemas
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  register: Joi.object({
    username: Joi.string().min(3).max(50).required(),
    password: Joi.string().min(8).required(),
    email: Joi.string().email().required(),
    role: Joi.string().valid("ADMIN", "STAFF", "TECHNICIAN").required(),
  }),

  setup: Joi.object({
    username: Joi.string().min(3).max(50).required(),
    password: Joi.string().min(8).required(),
    email: Joi.string().email().required(),
  }),

  // Room schema
  room: Joi.object({
    roomId: Joi.string().max(50).required(),
    name: Joi.string().max(100).required(),
    type: Joi.string()
      .valid("Standard", "Critical", "Surgery", "Laboratory", "Pharmacy", "ICU")
      .required(),
    thresholdProfile: Joi.string().optional().allow("", null),
    customThresholds: Joi.object({
      pm10Warning: Joi.number().min(0).optional(),
      pm10Critical: Joi.number().min(0).optional(),
      pm25Warning: Joi.number().min(0).optional(),
      pm25Critical: Joi.number().min(0).optional(),
      tvocWarning: Joi.number().min(0).optional(),
      tvocCritical: Joi.number().min(0).optional(),
      tempWarningLow: Joi.number().optional(),
      tempWarningHigh: Joi.number().optional(),
      tempCriticalHigh: Joi.number().optional(),
      humidityWarningLow: Joi.number().min(0).max(100).optional(),
      humidityWarningHigh: Joi.number().min(0).max(100).optional(),
    }).optional(),
  }),
  // Validation schema for updating a room (partial updates)
  roomUpdate: Joi.object({
    roomId: Joi.string().max(50).optional(),
    name: Joi.string().max(100).optional(),
    type: Joi.string()
      .valid("Standard", "Critical", "Surgery", "Laboratory", "Pharmacy", "ICU")
      .optional(),
    thresholdProfile: Joi.string().optional().allow("", null),
    customThresholds: Joi.object({
      pm10Warning: Joi.number().min(0).optional(),
      pm10Critical: Joi.number().min(0).optional(),
      pm25Warning: Joi.number().min(0).optional(),
      pm25Critical: Joi.number().min(0).optional(),
      tvocWarning: Joi.number().min(0).optional(),
      tvocCritical: Joi.number().min(0).optional(),
      tempWarningLow: Joi.number().optional(),
      tempWarningHigh: Joi.number().optional(),
      tempCriticalHigh: Joi.number().optional(),
      humidityWarningLow: Joi.number().min(0).max(100).optional(),
      humidityWarningHigh: Joi.number().min(0).max(100).optional(),
    }).optional(),
  }),

  // Threshold schema
  threshold: Joi.object({
    name: Joi.string().required(),
    pm10: Joi.object({
      warning: Joi.number().min(0).required(),
      critical: Joi.number().min(0).required(),
    }),
    pm25: Joi.object({
      warning: Joi.number().min(0).required(),
      critical: Joi.number().min(0).required(),
    }),
    tvoc: Joi.object({
      warning: Joi.number().min(0).required(),
      critical: Joi.number().min(0).required(),
    }),
    temperature: Joi.object({
      warningLow: Joi.number().required(),
      warningHigh: Joi.number().required(),
      criticalHigh: Joi.number().required(),
    }),
    humidity: Joi.object({
      warningLow: Joi.number().min(0).max(100).required(),
      warningHigh: Joi.number().min(0).max(100).required(),
    }),
    _id: Joi.string().optional(),
  }),

  // Maintenance schema
  maintenance: Joi.object({
    roomId: Joi.string().required(),
    actionType: Joi.string()
      .valid(
        "CALIBRATION",
        "FILTER_REPLACEMENT",
        "SENSOR_CHECK",
        "REPAIR",
        "OTHER",
      )
      .required(),
    details: Joi.string().min(3).max(1000).required(),
  }),

  // Notification schema
  notifications: Joi.object({
    emailRecipients: Joi.array()
      .items(
        Joi.object({
          email: Joi.string().email().required(),
          isActive: Joi.boolean().default(true),
        }),
      )
      .required(),
    alertCooldown: Joi.number()
      .integer()
      .min(60000)
      .max(3600000)
      .default(300000),
  }),

  // User creation (admin only)
  userCreate: Joi.object({
    username: Joi.string().min(3).max(50).required(),
    password: Joi.string().min(8).required(),
    email: Joi.string().email().required(),
    role: Joi.string().valid("ADMIN", "STAFF", "TECHNICIAN").required(),
  }),

  nodeCreate: Joi.object({
    node_id: Joi.string().max(100).required(),
    mac_address: Joi.string().max(50).optional(),
    firmware: Joi.string().max(50).optional(),
    hardware_version: Joi.string().max(50).optional(),
    room_id: Joi.string().max(50).optional(),
    status: Joi.string()
      .valid(
        "COMMISSIONING",
        "ONLINE",
        "OFFLINE",
        "DEGRADED",
        "MAINTENANCE",
        "DECOMMISSIONED",
      )
      .optional(),
    location_method: Joi.string().valid("TOPIC", "MANUAL", "HYBRID").optional(),
    location_confidence: Joi.number().min(0).max(100).optional(),
  }),

  nodeUpdate: Joi.object({
    node_id: Joi.string().max(100).optional(),
    mac_address: Joi.string().max(50).optional(),
    firmware: Joi.string().max(50).optional(),
    hardware_version: Joi.string().max(50).optional(),
    room_id: Joi.string().max(50).optional(),
    status: Joi.string()
      .valid(
        "COMMISSIONING",
        "ONLINE",
        "OFFLINE",
        "DEGRADED",
        "MAINTENANCE",
        "DECOMMISSIONED",
      )
      .optional(),
    location_method: Joi.string().valid("TOPIC", "MANUAL", "HYBRID").optional(),
    location_confidence: Joi.number().min(0).max(100).optional(),
    battery_level: Joi.number().min(0).max(100).optional(),
    rssi: Joi.number().optional(),
    uptime: Joi.number().optional(),
    packet_loss_rate: Joi.number().min(0).optional(),
    last_reboot: Joi.date().optional(),
  }),

  nodeCommand: Joi.object({
    command: Joi.string().max(100).required(),
    parameters: Joi.object().optional(),
  }),

  nodeHealth: Joi.object({
    connectivity: Joi.object({
      mqtt_connected: Joi.boolean().optional(),
      connection_duration: Joi.number().min(0).optional(),
      reconnect_count: Joi.number().min(0).optional(),
      last_disconnect_reason: Joi.string().max(256).optional(),
    }).optional(),
    signal: Joi.object({
      rssi: Joi.number().optional(),
      snr: Joi.number().optional(),
      channel: Joi.number().optional(),
      tx_power: Joi.number().optional(),
    }).optional(),
    power: Joi.object({
      battery_level: Joi.number().min(0).max(100).optional(),
      battery_voltage: Joi.number().optional(),
      charging_status: Joi.string().max(50).optional(),
      estimated_runtime: Joi.number().optional(),
    }).optional(),
    sensors: Joi.object({
      pm_sensor_status: Joi.string()
        .valid("OK", "DEGRADED", "FAILED")
        .optional(),
      temp_humidity_status: Joi.string()
        .valid("OK", "DEGRADED", "FAILED")
        .optional(),
      gas_sensor_status: Joi.string()
        .valid("OK", "DEGRADED", "FAILED")
        .optional(),
      last_calibration: Joi.date().optional(),
    }).optional(),
    data_quality: Joi.object({
      packet_loss_rate: Joi.number().min(0).optional(),
      outlier_count: Joi.number().min(0).optional(),
      transmission_interval: Joi.number().min(0).optional(),
      data_completeness: Joi.number().min(0).max(100).optional(),
    }).optional(),
  }),

  commissionDiscover: Joi.object({
    provisional_id: Joi.string().max(100).required(),
    node_id: Joi.string().max(100).optional(),
    mac_address: Joi.string().max(50).optional(),
    capabilities: Joi.array().items(Joi.string()).optional(),
    signal_data: Joi.object().optional(),
  }),

  commissionAssign: Joi.object({
    provisional_id: Joi.string().max(100).required(),
    room_id: Joi.string().max(50).required(),
    confirmed_by: Joi.string().required(),
    assignment_method: Joi.string()
      .valid("MANUAL_CONFIRMATION", "AUTO_ASSIGNMENT")
      .required(),
  }),

  commissionValidate: Joi.object({
    node_id: Joi.string().max(100).required(),
    room_id: Joi.string().max(50).required(),
    validation_tests: Joi.array().items(Joi.string()).required(),
  }),
  // Validation schema for forgot password
  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),

  // Validation schema for reset password
  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).required(),
  }),
};

// Validation middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json({ error: "Validation schema not found" });
    }
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((d) => ({
          field: d.path.join("."),
          message: d.message,
        })),
      });
    }
    next();
  };
};

module.exports = { validate };
