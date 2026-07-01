// MongoDB initialization script for production deployment
// This script runs when MongoDB container starts for the first time

db = db.getSiblingDB('admin');

// Create application user with proper permissions
const appPassword = process.env.MONGO_APP_PASSWORD;
if (!appPassword) {
  print('ERROR: MONGO_APP_PASSWORD environment variable is not set. Aborting init.');
  quit(1);
}

db.createUser({
  user: "pureair_app",
  pwd: appPassword,
  roles: [
    { role: "readWrite", db: "hospital_aqi" },
    { role: "read", db: "admin" }
  ]
});

// Switch to application database
db = db.getSiblingDB('hospital_aqi');

// Create collections with proper indexes
db.createCollection('users');
db.createCollection('rooms');
db.createCollection('sensor_readings');
db.createCollection('sensor_nodes');
db.createCollection('alerts');
db.createCollection('audit_logs');
db.createCollection('threshold_profiles');
db.createCollection('maintenance_logs');
db.createCollection('node_health');
db.createCollection('commissioning_sessions');
db.createCollection('notification_configs');

// Create indexes for performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ is_active: 1 });

db.rooms.createIndex({ roomId: 1 }, { unique: true });
db.rooms.createIndex({ type: 1 });

db.sensor_readings.createIndex({ roomId: 1, timestamp: -1 });
db.sensor_readings.createIndex({ nodeId: 1, timestamp: -1 });
db.sensor_readings.createIndex({ timestamp: -1 });
db.sensor_readings.createIndex({ "readings.pm25": 1 });
db.sensor_readings.createIndex({ "readings.temperature": 1 });

db.sensor_nodes.createIndex({ node_id: 1 }, { unique: true });
db.sensor_nodes.createIndex({ mac_address: 1 }, { unique: true });
db.sensor_nodes.createIndex({ room_id: 1 });
db.sensor_nodes.createIndex({ status: 1 });
db.sensor_nodes.createIndex({ lastSeen: -1 });

db.alerts.createIndex({ roomId: 1, createdAt: -1 });
db.alerts.createIndex({ acknowledged: 1 });
db.alerts.createIndex({ severity: 1 });
db.alerts.createIndex({ createdAt: -1 });

db.audit_logs.createIndex({ userId: 1, timestamp: -1 });
db.audit_logs.createIndex({ action: 1 });
db.audit_logs.createIndex({ timestamp: -1 });
db.audit_logs.createIndex({ resourceType: 1, resourceId: 1 });

db.threshold_profiles.createIndex({ name: 1 }, { unique: true });

db.maintenance_logs.createIndex({ roomId: 1, createdAt: -1 });
db.maintenance_logs.createIndex({ actionType: 1 });

db.node_health.createIndex({ node_id: 1, timestamp: -1 });

db.commissioning_sessions.createIndex({ provisional_id: 1 }, { unique: true });
db.commissioning_sessions.createIndex({ status: 1 });

db.notification_configs.createIndex({ isActive: 1 });

print("✅ MongoDB initialization completed successfully");
print("✅ Database: hospital_aqi");
print("✅ Application user: pureair_app");
print("✅ All collections created with proper indexes");