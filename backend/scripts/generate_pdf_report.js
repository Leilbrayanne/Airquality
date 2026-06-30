const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
require('dotenv').config({ path: '../.env' });

const Room = require('../models/Room');
const SensorReading = require('../models/SensorReading');
const { predictTrend } = require('../services/aqi');

async function generatePDF() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_aqi');
  console.log('Connected to DB');

  const roomIdStr = 'ICU-1';
  const room = await Room.findOne({ roomId: roomIdStr });
  if (!room) {
    console.error('Room not found: ' + roomIdStr);
    process.exit(1);
  }

  const history = await SensorReading.find({ room: room._id })
    .sort({ timestamp: -1 })
    .limit(200);

  if (history.length === 0) {
    console.error('No data found for this room: ' + roomIdStr);
    process.exit(1);
  }

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const outputPath = 'C:/Users/Lei/.gemini/antigravity-ide/brain/076b69da-ad24-4b2d-9d55-c9748e4c6a41/icu1_air_quality_report.pdf';

  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // Drawing the PDF Header
  doc.rect(0, 0, doc.page.width, 80).fill('#1e3a5f');
  doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
    .text('PUREAIR MONITORING - AUDIT REPORT', 50, 20);
  doc.fontSize(11).font('Helvetica')
    .text(`Air Quality Audit Report — Room: ${room.name || roomIdStr}`, 50, 48);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 63);

  doc.moveDown(3).fillColor('#1e3a5f');

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

  doc.fontSize(8).fillColor('#999999')
    .text('CONFIDENTIAL — Hospital Environmental Health Record', 50, doc.page.height - 40, { align: 'center', width: 495 });

  doc.end();

  writeStream.on('finish', () => {
    console.log('PDF generated successfully at ' + outputPath);
    process.exit(0);
  });
}

generatePDF().catch(err => {
  console.error(err);
  process.exit(1);
});
