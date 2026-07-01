const nodemailer = require('nodemailer');
const Alert = require('../models/Alert');
const ThresholdProfile = require('../models/ThresholdProfile');
const Room = require('../models/Room');
const NotificationConfig = require('../models/NotificationConfig');
const User = require('../models/User');
const SensorReading = require('../models/SensorReading');
const PDFDocument = require('pdfkit');
const { predictTrend } = require('./aqi');

let transporter;

async function initNotifier() {
  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log("✓ Email notifier initialized using production SMTP.");
    } else {
      let testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log("⚠ Email notifier initialized using Ethereal test inbox.");
    }
  } catch (err) {
    console.error("Failed to initialize email notifier", err);
  }
}

async function processReadingForAlerts(reading, room, io) {
  // Fetch latest config
  let config = await NotificationConfig.findOne();
  if (!config) {
    config = new NotificationConfig({
      emailRecipients: [{ email: 'facility.manager@hospital.local', isActive: true }]
    });
    await config.save();
  }
  const COOLDOWN_MS = config.alertCooldown || (5 * 60 * 1000);
  if (!room.thresholdProfile) {
    // Attempt to link a default threshold profile if not set
    let defaultProfile = await ThresholdProfile.findOne({ name: 'Default' });
    if (!defaultProfile) {
      defaultProfile = new ThresholdProfile({ name: 'Default' });
      await defaultProfile.save();
    }
    room.thresholdProfile = defaultProfile._id;
    await room.save();
  }

  const profile = await ThresholdProfile.findById(room.thresholdProfile);
  if (!profile) return;

  const alerts = [];

  const checkThreshold = (paramName, value, thresholds) => {
    if (value === undefined || value === null) return;
    
    let severity = null;
    if (thresholds.criticalHigh !== undefined && value > thresholds.criticalHigh) severity = 'CRITICAL';
    else if (thresholds.critical !== undefined && value > thresholds.critical) severity = 'CRITICAL';
    else if (thresholds.warningHigh !== undefined && value > thresholds.warningHigh) severity = 'HIGH';
    else if (thresholds.warning !== undefined && value > thresholds.warning) severity = 'MEDIUM';
    else if (thresholds.warningLow !== undefined && value < thresholds.warningLow) severity = 'MEDIUM';

    if (severity) {
      alerts.push({
        room: room._id,
        sensorReading: reading._id,
        parameter: paramName,
        value: value,
        severity: severity
      });
    }
  };

  checkThreshold('pm10', reading.pm10, profile.pm10);
  checkThreshold('pm25', reading.pm25, profile.pm25);
  checkThreshold('tvoc', reading.tvoc, profile.tvoc);
  checkThreshold('temperature', reading.temperature, profile.temperature);
  checkThreshold('humidity', reading.humidity, profile.humidity);

  for (const alertData of alerts) {
    // Suppress duplicates within cooldown window using DB-persisted check
    const now = Date.now();
    const lastAlert = await Alert.findOne(
      { room: alertData.room, parameter: alertData.parameter }
    ).sort({ triggeredAt: -1 });

    const lastAlertTime = lastAlert?.triggeredAt?.getTime() || 0;

    if (now - lastAlertTime > COOLDOWN_MS) {
      const newAlert = new Alert(alertData);
      await newAlert.save();
      
      // Emit real-time alert to frontend
      io.to('alerts/live').emit('new-alert', {
        roomId: room.roomId,
        roomName: room.name,
        ...newAlert.toObject()
      });
      
      // Send email if critical AND NOT in maintenance mode
      if ((alertData.severity === 'CRITICAL' || alertData.severity === 'HIGH') && !config.maintenanceMode) {
        // Automatically include active admins
        const admins = await User.find({ role: 'ADMIN', is_active: true, email: { $exists: true, $ne: '' } });
        const adminRecipients = admins.map(admin => ({ email: admin.email, isActive: true }));
        
        // Combine explicitly configured recipients with admin emails
        const allRecipients = [...config.emailRecipients, ...adminRecipients];
        
        // Ensure no duplicate emails
        const uniqueRecipientsMap = new Map();
        allRecipients.forEach(r => {
          if (r.isActive && r.email) {
            uniqueRecipientsMap.set(r.email.toLowerCase(), r);
          }
        });
        const finalRecipients = Array.from(uniqueRecipientsMap.values());

        // Fetch recent history for the report
        const history = await SensorReading.find({ room: room._id })
          .sort({ timestamp: -1 })
          .limit(200);

        const sent = await sendEmailAlert(room, alertData, finalRecipients, history);
        if (sent) {
          newAlert.emailSent = true;
          await newAlert.save();
        }
      } else if (config.maintenanceMode) {
        console.log(`[MAINTENANCE] Alert suppressed for ${room.roomId}: ${alertData.parameter}`);
      }
    }
  }
}

async function generatePDFBuffer(room, alertData, history) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.rect(0, 0, doc.page.width, 80).fill('#1e3a5f');
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
      .text('PUREAIR MONITORING - CRITICAL ALERT REPORT', 50, 20);
    doc.fontSize(11).font('Helvetica')
      .text(`Alert: ${alertData.parameter} (${alertData.severity}) — Room: ${room.name || room.roomId}`, 50, 48);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 63);

    doc.moveDown(3).fillColor('#1e3a5f');

    if (history && history.length > 0) {
      const avgPm25 = (history.reduce((s, r) => s + (r.pm25 || 0), 0) / history.length).toFixed(1);
      const avgTemp = (history.reduce((s, r) => s + (r.temperature || 0), 0) / history.length).toFixed(1);
      const avgHumidity = (history.reduce((s, r) => s + (r.humidity || 0), 0) / history.length).toFixed(1);
      const maxPm25 = Math.max(...history.map(r => r.pm25 || 0)).toFixed(1);

      doc.fontSize(14).font('Helvetica-Bold').text('Summary Statistics', { underline: true });
      doc.moveDown(0.5).fontSize(11).font('Helvetica').fillColor('#333333');
      doc.text(`Total Readings in Audit: ${history.length}`);
      doc.text(`Period: ${new Date(history[history.length - 1].timestamp).toLocaleString()} → ${new Date(history[0].timestamp).toLocaleString()}`);
      doc.text(`Avg PM2.5: ${avgPm25} µg/m³   |   Max PM2.5: ${maxPm25} µg/m³`);
      doc.text(`Avg Temperature: ${avgTemp} °C   |   Avg Humidity: ${avgHumidity} %`);

      const prediction = predictTrend(history);
      doc.moveDown(0.5).fillColor('#1e3a5f').font('Helvetica-Bold')
        .text('Intelligent Prediction: ', { continued: true })
        .font('Helvetica').fillColor(prediction.trend === 'RISING' ? '#e11d48' : '#059669')
        .text(`${prediction.trend} trend detected (Rate: ${prediction.rate} µg/m³ per cycle)`);
      doc.fillColor('#333333').fontSize(10)
        .text(`Future Outlook: Expected AQI ${prediction.predictedAqi} (${prediction.predictedStatus}) if conditions persist.`);

      doc.moveDown(1);
      
      const statusCounts = history.reduce((acc, r) => {
        const s = r.aqi_status || 'Unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});

      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a5f').text('AQI Status Breakdown', { underline: true });
      doc.moveDown(0.5).fontSize(11).font('Helvetica').fillColor('#333333');
      Object.entries(statusCounts).forEach(([status, count]) => {
        const pct = ((count / history.length) * 100).toFixed(1);
        doc.text(`${status}: ${count} readings (${pct}%)`);
      });

      doc.moveDown(1);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a5f').text('Recent Readings', { underline: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const headers = ['Timestamp', 'PM2.5', 'Temp', 'Humidity', 'AQI', 'Status'];
      const colWidths = [150, 70, 60, 70, 50, 80];
      const colX = colWidths.reduce((acc, w, i) => {
        acc.push(i === 0 ? 50 : acc[i - 1] + colWidths[i - 1]);
        return acc;
      }, []);

      doc.rect(50, tableTop, 495, 20).fill('#1e3a5f');
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      headers.forEach((h, i) => doc.text(h, colX[i], tableTop + 5, { width: colWidths[i] }));

      doc.font('Helvetica').fontSize(8).fillColor('#333333');
      const rows = history.slice(0, 50).reverse();
      rows.forEach((r, idx) => {
        const y = tableTop + 20 + idx * 16;
        if (y > doc.page.height - 70) return;
        if (idx % 2 === 0) doc.rect(50, y, 495, 16).fill('#f0f4f8');
        doc.fillColor('#333333');
        doc.text(new Date(r.timestamp).toLocaleString(), colX[0], y + 3, { width: colWidths[0] });
        doc.text(`${(r.pm25 || 0).toFixed(1)}`, colX[1], y + 3, { width: colWidths[1] });
        doc.text(`${(r.temperature || 0).toFixed(1)}°C`, colX[2], y + 3, { width: colWidths[2] });
        doc.text(`${(r.humidity || 0).toFixed(0)}%`, colX[3], y + 3, { width: colWidths[3] });
        doc.text(`${r.aqi || '-'}`, colX[4], y + 3, { width: colWidths[4] });
        doc.text(r.aqi_status || '-', colX[5], y + 3, { width: colWidths[5] });
      });
    } else {
      doc.fontSize(12).font('Helvetica').fillColor('#333333').text('No recent history data available for this room.');
    }

    doc.fontSize(8).fillColor('#999999')
      .text('CONFIDENTIAL — Hospital Environmental Health Record', 50, doc.page.height - 40, { align: 'center', width: 495 });

    doc.end();
  });
}

async function sendEmailAlert(room, alertData, recipients, history) {
  if (!transporter) return;

  const activeRecipients = recipients
    .filter(r => r.isActive)
    .map(r => r.email)
    .join(', ');

  if (!activeRecipients) return;
  
  let pdfBuffer;
  try {
    pdfBuffer = await generatePDFBuffer(room, alertData, history);
    require('fs').writeFileSync('alert_report.pdf', pdfBuffer);
  } catch (err) {
    console.error("Failed to generate PDF buffer:", err);
  }

  const mailOptions = {
    from: '"Hospital IAQ Alert System" <alerts@hospitaliaq.local>',
    to: activeRecipients,
    subject: `CRITICAL AIR QUALITY ALERT: ${room.name || room.roomId}`,
    text: `WARNING: The ${alertData.parameter} level in ${room.name || room.roomId} is ${alertData.severity}. Value: ${alertData.value}`,
    html: `<h2>WARNING: Air quality issue in ${room.name || room.roomId}</h2>
           <p><strong>Parameter:</strong> ${alertData.parameter}</p>
           <p><strong>Value:</strong> ${alertData.value}</p>
           <p><strong>Severity:</strong> <span style="color:red;">${alertData.severity}</span></p>`
  };
  
  if (pdfBuffer) {
    mailOptions.attachments = [
      {
        filename: `Alert_Report_${room.roomId}_${new Date().toISOString().slice(0,10)}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ];
  }

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log(`Alert email sent for ${room.roomId} (${alertData.parameter}): ${info.messageId}`);
    if (info.messageId.includes('ethereal')) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
    return true;
  } catch (error) {
    console.error("Error sending alert email:", error);
    return false;
  }
}

module.exports = { initNotifier, processReadingForAlerts };
