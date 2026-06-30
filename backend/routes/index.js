const authRoutes = require('./auth');
const usersRoutes = require('./users');
const roomsRoutes = require('./rooms');
const createSensorsRouter = require('./sensors');
const reportsRoutes = require('./reports');
const nodesModule = require('./nodes');
const maintenanceRoutes = require('./maintenance');
const thresholdsRoutes = require('./thresholds');
const alertsRoutes = require('./alerts');
const createNotificationsRouter = require('./notifications');
const auditRoutes = require('./audit');
const createHealthRouter = require('./health');
const { authLimiter } = require('../middleware/rateLimit');

function mountRoutes(app, io) {
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/rooms', roomsRoutes);
  app.use('/api/sensors', createSensorsRouter(io));
  app.use('/api/reports', reportsRoutes);
  app.use('/api/nodes', nodesModule(io));
  app.use('/api/beacons', nodesModule.createBeaconsRouter());
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/thresholds', thresholdsRoutes);
  app.use('/api/alerts', alertsRoutes);
  app.use('/api/notifications', createNotificationsRouter(io));
  app.use('/api/audit-logs', auditRoutes);
  app.use('/api/health', createHealthRouter(io));
}

module.exports = mountRoutes;
