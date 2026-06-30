require('dotenv').config();
const mqtt = require('mqtt');

const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1885';
const client = mqtt.connect(MQTT_BROKER, {
  username: process.env.MQTT_USERNAME || 'hospital_node',
  password: process.env.MQTT_PASSWORD || 'change_me_esp32_password'
});

const rooms = [
  { id: 'ICU-1', basepm: 8 },
  { id: 'ICU-2', basepm: 10 },
  { id: 'OR-1', basepm: 15 },
  { id: 'OR-2', basepm: 22 },
  { id: 'WARD-A', basepm: 30 },
  { id: 'WARD-B', basepm: 5 },
  { id: 'LAB', basepm: 40 },
  { id: 'EMERGENCY', basepm: 18 }
];

console.log('--- PureAir Monitoring Demo Data Generator ---');
console.log(`Connecting to MQTT broker at ${MQTT_BROKER}...`);

client.on('connect', () => {
  console.log('Connected! Starting simulation for', rooms.length, 'rooms...');
  
  setInterval(() => {
    const room = rooms[Math.floor(Math.random() * rooms.length)];
    const topic = `hospital/${room.id}/airquality`;
    
    // Vary PM2.5 to create a mix of Good, Warning, and Critical statuses
    // ICU rooms stay mostly safe, but LAB and OR-1 will spike occasionally
    let variance = 20;
    if (room.id === 'LAB' || room.id === 'OR-1') variance = 80; // High variance for alerts
    
    const pm25 = Math.max(1, room.basepm + (Math.random() - 0.3) * variance);
    
    const payload = {
      pm1: +(Math.random() * 15).toFixed(1),
      pm25: +pm25.toFixed(1),
      pm10: +(pm25 * 1.5 + Math.random() * 10).toFixed(1),
      tvoc: Math.floor(Math.random() * (pm25 > 100 ? 800 : 300)), // TVOC spikes with PM
      eco2: Math.floor(400 + Math.random() * 400),
      temperature: +(22 + Math.random() * 4).toFixed(1),
      humidity: +(45 + Math.random() * 20).toFixed(1),
      gas: Math.floor(200 + Math.random() * 1000)
    };

    client.publish(topic, JSON.stringify(payload));
    
    // Log with color if it's a spike
    const color = pm25 > 150 ? '\x1b[31m' : pm25 > 55 ? '\x1b[33m' : '\x1b[32m';
    console.log(`[${new Date().toLocaleTimeString()}] ${room.id} → PM2.5: ${color}${payload.pm25}\x1b[0m`);
    
  }, 2000);
});

client.on('error', (err) => {
  console.error('MQTT Connection Error:', err);
  process.exit(1);
});
