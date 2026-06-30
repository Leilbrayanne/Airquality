# PureAir Monitoring System

> **Real‑time air quality monitoring for hospitals and indoor environments**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 📖 Overview
The **PureAir** platform integrates ESP32‑based sensor nodes, a Node.js backend, and a modern React frontend to provide continuous monitoring of particulate matter, VOCs, temperature, and humidity. Data is visualised in a dashboard, stored in MongoDB, and exposed via a robust REST & MQTT API.

```mermaid
flowchart TD
    subgraph Sensors[Sensor Nodes]
        A[ESP32 AQI Node] -->|MQTT| B[MQTT Broker]
    end
    B --> C[Backend (Node.js)]
    C --> D[MongoDB]
    C --> E[Redis (cache)]
    C --> F[REST / WebSocket API]
    F --> G[Frontend (React + Vite)]
    G --> H[Dashboard UI]
```

The system supports both **offline buffering** (via LittleFS) and **integration with commercial PurpleAir devices**.

---

## 🛠️ Tech Stack
- **Firmware** – Arduino/ESP32 (C++)
- **Backend** – Node.js 18, Express, Aedes MQTT broker, MongoDB, Redis
- **Frontend** – React 18, Vite, TypeScript, TailwindCSS
- **DevOps** – Docker, Docker‑Compose, CI/CD (optional)

---

## 📦 Quick Start (Local Development)
### Prerequisites

### 1) Initial Setup
```powershell
cd backend
npm install
node setup.js
```

This creates initial users with default credentials. **CRITICAL SECURITY NOTE:**
- Default passwords are for development only
- **CHANGE ALL PASSWORDS** before deployment
- Never use default credentials in production
- Consider disabling or removing default users for production

**For production deployments:**
1. Run setup.js once to initialize database
2. Change all user passwords immediately
3. Consider creating new users with strong passwords
4. Disable or remove default users if not needed

### 2) Start the backend
```powershell
cd backend
npm run dev
```

### 3) Start the frontend
```powershell
cd client
npm install
npm run dev
```

Notes:
- PowerShell does **not** support `&&` as a command separator. Use separate commands (or `;`) instead.
- The frontend proxies `/api` and `/socket.io` to the backend during `npm run dev`.

### Environment Configuration
- Backend runs on port `5002` by default
- MQTT broker runs on port `1886`
- Frontend runs on port `5173` by default

Important:
- The `/metrics` Prometheus endpoint is secured in code. To allow Prometheus scraping, set `PROMETHEUS_SCRAPE_TOKEN` and configure your scraper to send the header `X-Prometheus-Scrape-Token`. You can also enable `PROMETHEUS_ALLOW_LOCAL=true` to permit localhost scrapes.
- If this repository contains a committed `backend/mongodb_data` directory, remove it and add it to `.gitignore`. A helper script is provided at `scripts/remove_committed_db.ps1` to assist with removal.

### Troubleshooting
1. **CORS errors**: Ensure frontend URL is in allowed origins (ports 3000-3004, 5173-5180)
2. **Database connection**: Make sure MongoDB is running: `mongod`
3. **Authentication**: Use the credentials created by setup.js
4. **Port conflicts**: Check `.env` file for custom port configurations

---

# PureAir Backend API Documentation


**Base URL**: `http://127.0.0.1:5002`

## Overview

| PUT | `/api/auth/me` | Any authenticated | Update username/email |
| PUT | `/api/auth/me/password` | Any authenticated | Change password |
| POST | `/api/auth/logout` | Any authenticated | Log out (audit) |
| POST | `/api/auth/forgot-password` | None | Request password‑reset email |
| POST | `/api/auth/reset-password` | None | Reset password via token |
| POST | `/api/auth/register` | ADMIN | Register new staff user |
| GET | `/api/users` | ADMIN | List all users (no password hashes) |
| PUT | `/api/users/:id` | ADMIN | Update user fields |
| DELETE | `/api/users/:id` | ADMIN | Delete a user (cannot delete self) |
| GET | `/api/rooms` | Authenticated | List all rooms with threshold profile |
| POST | `/api/rooms` | ADMIN | Create or upsert a room |
| PUT | `/api/rooms/:id` | ADMIN / TECHNICIAN | Update a room |
| DELETE | `/api/rooms/:id` | ADMIN | Delete a room |
| GET | `/api/sensors/current` | Authenticated | Current latest reading per room |
| GET | `/api/sensors/history/:roomIdStr` | Authenticated | Last 100 readings for a room |
| GET | `/api/sensors/trends/:roomIdStr` | Authenticated | Trend prediction (last 20 readings) |
| GET | `/api/reports/export/:roomIdStr` | Authenticated | CSV export of all readings |
| GET | `/api/reports/pdf/:roomIdStr` | Authenticated | PDF report of readings (max 200) |
| GET | `/api/nodes` | Authenticated | List all sensor nodes with room association |
| POST | `/api/nodes` | ADMIN | Register or upsert a node |
| PUT | `/api/nodes/:id` | ADMIN / TECHNICIAN | Update node fields |
| DELETE | `/api/nodes/:id` | ADMIN | Delete a node |
| POST | `/api/nodes/:nodeId/calibrate` | ADMIN / TECHNICIAN | Send calibration command |
| GET | `/api/nodes/:nodeId/health` | ADMIN / TECHNICIAN | Retrieve recent health entries |
| POST | `/api/nodes/:nodeId/health` | ADMIN / TECHNICIAN | Record a health entry |
| GET | `/api/nodes/commission/sessions` | ADMIN / TECHNICIAN | List commissioning sessions |
| POST | `/api/nodes/commission/discover` | ADMIN / TECHNICIAN | Discover a provisional node |
| POST | `/api/nodes/commission/assign` | ADMIN / TECHNICIAN | Assign a discovered node to a room |
| POST | `/api/nodes/commission/validate` | ADMIN / TECHNICIAN | Validate node placement |
| GET | `/api/maintenance` | Authenticated | List maintenance logs |
| POST | `/api/maintenance` | ADMIN / TECHNICIAN | Log a maintenance action |
| PUT | `/api/maintenance/:id` | ADMIN / TECHNICIAN | Update a maintenance log |
| DELETE | `/api/maintenance/:id` | ADMIN | Delete a maintenance log |
| GET | `/api/thresholds` | Authenticated | List all threshold profiles |
| POST | `/api/thresholds` | ADMIN | Create or update a profile |
| DELETE | `/api/thresholds/:id` | ADMIN | Delete a profile |
| GET | `/api/alerts` | Authenticated | List recent alerts (max 100) |
| PATCH | `/api/alerts/:id/acknowledge` | Authenticated | Acknowledge an alert |
| DELETE | `/api/alerts/:id` | ADMIN | Delete an alert |
| GET | `/api/notifications/config` | ADMIN / TECHNICIAN / STAFF | Retrieve email recipients and settings |
| PUT | `/api/notifications/config` | ADMIN | Update notification config |
| GET | `/api/audit-logs` | ADMIN | Recent audit entries (last 200) |
| GET | `/api/docs` | Any (Swagger UI) | Interactive API documentation |

> **Note:** All protected routes require an `Authorization: Bearer <JWT>` header and are subject to rate‑limiting middleware.

### 📦 Example Request Bodies

- **POST `/api/auth/setup`** (create first admin)
```json
{ "username": "admin", "password": "admin123", "email": "admin@pureair.cm" }
```
- **POST `/api/auth/login`**
```json
{ "email": "tech@hospital.cm", "password": "tech123" }
```
- **PUT `/api/auth/me`**
```json
{ "username": "newName", "email": "new@example.com" }
```
- **PUT `/api/auth/me/password`**
```json
{ "currentPassword": "old", "newPassword": "new" }
```
- **POST `/api/auth/forgot-password`**
```json
{ "email": "user@example.com" }
```
- **POST `/api/auth/reset-password`**
```json
{ "token": "<reset-token>", "password": "newPwd" }
```
- **POST `/api/auth/register`**
```json
{ "username": "tech2", "password": "pwd", "role": "TECHNICIAN", "email": "tech2@hospital.cm" }
```
- **POST `/api/users`** (create user)
```json
{ "username": "newUser", "password": "pwd", "role": "TECHNICIAN", "email": "new@example.com" }
```
- **PUT `/api/users/:id`**
```json
{ "username": "updatedName", "role": "ADMIN", "email": "updated@example.com", "is_active": true }
```
- **POST `/api/rooms`**
```json
{ "roomId": "ICU-1", "name": "ICU Ward A", "type": "ICU", "thresholdProfile": null, "customThresholds": { "pm10Warning": 50, "pm10Critical": 100, "pm25Warning": 35, "pm25Critical": 75, "tvocWarning": 500, "tvocCritical": 1000, "tempWarningLow": 18, "tempWarningHigh": 26, "tempCriticalHigh": 30, "humidityWarningLow": 30, "humidityWarningHigh": 60 } }
```
- **PUT `/api/rooms/:id`** (same payload as POST)
- **POST `/api/nodes`**
```json
{ "node_id": "NODE-A-101", "mac_address": "AA:BB:CC:DD:EE:FF", "firmware": "1.0.2", "hardware_version": "v1", "room_id": "ICU-1", "status": "ONLINE", "location_method": "TOPIC", "location_confidence": 100 }
```
- **PUT `/api/nodes/:id`**
```json
{ "status": "OFFLINE", "location_method": "GPS", "location_confidence": 80 }
```
- **POST `/api/nodes/:nodeId/calibrate`**
```json
{ "command": "CALIBRATE", "parameters": { "offset": 0 } }
```
- **POST `/api/nodes/:nodeId/health`**
```json
{ "battery_level": 85, "rssi": -70, "uptime": 12345, "packet_loss_rate": 0.02 }
```
- **POST `/api/nodes/commission/discover`**
```json
{ "provisional_id": "prov-123", "node_id": "NODE-X", "mac_address": "..", "capabilities": {}, "signal_data": {} }
```
- **POST `/api/nodes/commission/assign`**
```json
{ "provisional_id": "prov-123", "room_id": "ICU-1", "confirmed_by": "techId", "assignment_method": "MANUAL_CONFIRMATION" }
```
- **POST `/api/nodes/commission/validate`**
```json
{ "node_id": "NODE-X", "room_id": "ICU-1", "validation_tests": ["signal", "battery"] }
```
- **POST `/api/maintenance`**
```json
{ "roomId": "ICU-1", "actionType": "CALIBRATION", "details": "Replaced battery" }
```
- **PUT `/api/maintenance/:id`** (same payload as POST)
- **POST `/api/thresholds`**
```json
{ "name": "ICU-Standard", "pm10": { "warning": 50, "critical": 100 }, "pm25": { "warning": 35, "critical": 75 }, "tvoc": { "warning": 500, "critical": 1000 }, "temperature": { "warningLow": 18, "warningHigh": 26, "criticalHigh": 30 }, "humidity": { "warningLow": 30, "warningHigh": 60 } }
```
- **POST `/api/alerts/:id/acknowledge`**
```json
{ "acknowledgedBy": "<userId>" }
```
- **PUT `/api/notifications/config`**
```json
{ "emailRecipients": [{ "email": "admin@pureair.cm", "isActive": true }], "alertCooldown": 300, "maintenanceMode": false, "predictiveEnabled": true }
```



All protected routes require an `Authorization: Bearer <JWT>` header. Rate‑limiting middleware (`authLimiter`, `apiLimiter`, `reportLimiter`) is applied as noted.

---

## Health & Metrics
- **GET `/health`** – No auth – Simple health check for container/K8s.
- **GET `/metrics`** – No auth – Prometheus metrics endpoint.
- **GET `/api/health`** – Auth: ADMIN or TECHNICIAN – Detailed system health (node count, MQTT status, etc.).

---

## Authentication (`/api/auth`)
- **POST `/api/auth/setup`** – No auth (only when no users exist) – Create first ADMIN user.
  ```json
  { "username": "admin", "password": "pwd", "email": "admin@pureair.cm" }
  ```
- **POST `/api/auth/login`** – No auth – Authenticate and receive JWT.
  ```json
  { "email": "tech@hospital.cm", "password": "tech123" }
  ```
- **GET `/api/auth/me`** – Auth any role – Retrieve current user info.
- **PUT `/api/auth/me`** – Auth any role – Update username/email.
  ```json
  { "username": "newName", "email": "new@example.com" }
  ```
- **PUT `/api/auth/me/password`** – Auth any role – Change password.
  ```json
  { "currentPassword": "old", "newPassword": "new" }
  ```
- **POST `/api/auth/logout`** – Auth any role – Log out (audit only).
- **POST `/api/auth/forgot-password`** – No auth – Request password‑reset email (generic success).
  ```json
  { "email": "user@example.com" }
  ```
- **POST `/api/auth/reset-password`** – No auth – Reset password using token.
  ```json
  { "token": "<reset-token>", "password": "newPwd" }
  ```
- **POST `/api/auth/register`** – Auth ADMIN – Register new staff user.
  ```json
  { "username": "tech2", "password": "pwd", "role": "TECHNICIAN", "email": "tech2@hospital.cm" }
  ```

---

## Users (`/api/users`)
- **GET `/api/users`** – Auth ADMIN – List all users (password hash omitted).
- **PUT `/api/users/:id`** – Auth ADMIN – Update user fields.
  ```json
  { "username": "new", "role": "TECHNICIAN", "email": "new@example.com", "is_active": true, "password": "newPwd" }
  ```
- **DELETE `/api/users/:id`** – Auth ADMIN – Delete a user (cannot delete self).

---

## Rooms (`/api/rooms`)
- **GET `/api/rooms`** – Auth any authenticated – List all rooms with threshold profile.
- **POST `/api/rooms`** – Auth ADMIN – Create or upsert a room.
  ```json
  {
    "roomId": "ICU-1",
    "name": "ICU Ward A",
    "type": "ICU",
    "thresholdProfile": null,
    "customThresholds": {
      "pm10Warning": 50,
      "pm10Critical": 100,
      "pm25Warning": 35,
      "pm25Critical": 75,
      "tvocWarning": 500,
      "tvocCritical": 1000,
      "tempWarningLow": 18,
      "tempWarningHigh": 26,
      "tempCriticalHigh": 30,
      "humidityWarningLow": 30,
      "humidityWarningHigh": 60
    }
  }
  ```
- **PUT `/api/rooms/:id`** – Auth ADMIN or TECHNICIAN – Update a room (same payload as POST).
- **DELETE `/api/rooms/:id`** – Auth ADMIN – Delete a room.

---

## Sensors (`/api/sensors`)
- **GET `/api/sensors/current`** – Auth any – Current latest reading per room.
- **GET `/api/sensors/history/:roomIdStr`** – Auth any – Last 100 readings for a room.
- **GET `/api/sensors/trends/:roomIdStr`** – Auth any – Trend prediction (last 20 readings).
- **GET `/api/reports/export/:roomIdStr`** – Auth any – CSV export of all readings for a room.
- **GET `/api/reports/pdf/:roomIdStr`** – Auth any – PDF report of readings (max 200).

---

## Nodes (`/api/nodes`)
- **GET `/api/nodes`** – Auth any – List all sensor nodes with room association.
- **POST `/api/nodes`** – Auth ADMIN – Register or upsert a node.
  ```json
  {
    "node_id": "NODE-A-101",
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "firmware": "1.0.2",
    "hardware_version": "v1",
    "room_id": "ICU-1",
    "status": "ONLINE",
    "location_method": "TOPIC",
    "location_confidence": 100
  }
  ```
- **PUT `/api/nodes/:id`** – Auth ADMIN or TECHNICIAN – Update node fields (battery, rssi, etc.).
- **DELETE `/api/nodes/:id`** – Auth ADMIN – Delete a node.
- **POST `/api/nodes/:nodeId/calibrate`** – Auth ADMIN or TECHNICIAN – Send calibration command.
  ```json
  { "command": "CALIBRATE", "parameters": { "offset": 0 } }
  ```
- **GET `/api/nodes/:nodeId/health`** – Auth ADMIN or TECHNICIAN – Retrieve recent health entries.
- **POST `/api/nodes/:nodeId/health`** – Auth ADMIN or TECHNICIAN – Record a health entry.
  ```json
  { "battery_level": 85, "rssi": -70, "uptime": 12345, "packet_loss_rate": 0.02 }
  ```

---

## Commissioning (`/api/nodes/commission`)
- **GET `/api/nodes/commission/sessions`** – Auth ADMIN or TECHNICIAN – List commissioning sessions.
- **POST `/api/nodes/commission/discover`** – Auth ADMIN or TECHNICIAN – Discover a provisional node.
  ```json
  { "provisional_id": "prov-123", "node_id": "NODE-X", "mac_address": "..", "capabilities": {}, "signal_data": {} }
  ```
- **POST `/api/nodes/commission/assign`** – Auth ADMIN or TECHNICIAN – Assign a discovered node to a room.
  ```json
  { "provisional_id": "prov-123", "room_id": "ICU-1", "confirmed_by": "techId", "assignment_method": "MANUAL_CONFIRMATION" }
  ```
- **POST `/api/nodes/commission/validate`** – Auth ADMIN or TECHNICIAN – Validate node placement.
  ```json
  { "node_id": "NODE-X", "room_id": "ICU-1", "validation_tests": ["signal", "battery"] }
  ```

---

## Maintenance (`/api/maintenance`)
- **GET `/api/maintenance`** – Auth any – List maintenance logs.
- **POST `/api/maintenance`** – Auth ADMIN or TECHNICIAN – Log a maintenance action.
  ```json
  { "roomId": "ICU-1", "actionType": "CALIBRATION", "details": "Replaced battery" }
  ```
- **PUT `/api/maintenance/:id`** – Auth ADMIN or TECHNICIAN – Update a log entry (same fields as POST, optional).
- **DELETE `/api/maintenance/:id`** – Auth ADMIN – Delete a maintenance log.

---

## Threshold Profiles (`/api/thresholds`)
- **GET `/api/thresholds`** – Auth any – List all threshold profiles.
- **POST `/api/thresholds`** – Auth ADMIN – Create or update a profile.
  ```json
  {
    "name": "ICU-Standard",
    "pm10": { "warning": 50, "critical": 100 },
    "pm25": { "warning": 35, "critical": 75 },
    "tvoc": { "warning": 500, "critical": 1000 },
    "temperature": { "warningLow": 18, "warningHigh": 26, "criticalHigh": 30 },
    "humidity": { "warningLow": 30, "warningHigh": 60 }
  }
  ```
- **DELETE `/api/thresholds/:id`** – Auth ADMIN – Delete a profile.

---

## Alerts (`/api/alerts`)
- **GET `/api/alerts`** – Auth any – List recent alerts (max 100).
- **PATCH `/api/alerts/:id/acknowledge`** – Auth any – Acknowledge an alert. Payload optional.
  ```json
  { "acknowledgedBy": "<userId>" }
  ```
- **DELETE `/api/alerts/:id`** – Auth ADMIN – Delete an alert.

---

## Notifications Config (`/api/notifications/config`)
- **GET `/api/notifications/config`** – Auth ADMIN, TECHNICIAN, or STAFF – Retrieve email recipients and settings.
- **PUT `/api/notifications/config`** – Auth ADMIN – Update config.
  ```json
  {
    "emailRecipients": [{ "email": "admin@pureair.cm", "isActive": true }],
    "alertCooldown": 300,
    "maintenanceMode": false,
    "predictiveEnabled": true
  }
  ```

---

## Audit Logs (`/api/audit-logs`)
- **GET `/api/audit-logs`** – Auth ADMIN – Recent audit entries (last 200).

---

## Swagger UI
- **Path:** `/api/docs` – Interactive API documentation (Swagger UI).

---

## Common Headers
- **Authorization:** `Bearer <jwt_token>` – required for protected routes.
- **Content-Type:** `application/json` – for POST/PUT/PATCH bodies.
- **Accept:** `application/json` – default.

## Rate Limiting
- **authLimiter:** applied to login, forgot‑password, reset‑password, etc.
- **apiLimiter:** general API rate limiting for all `/api/*` routes.
- **reportLimiter:** tighter limits on PDF/CSV export endpoints.

---

# Sensor Node Configuration & Deployment Guide (ESP32 AQI Node)

This section provides comprehensive details on how the ESP32 AQI sensor node is wired, configured, programmed, and integrated into the PureAir monitoring backend.

---

## 1. Hardware Specifications

The PureAir sensor node is built using the **ESP32 microcontroller** along with the following peripherals:

| Component | Description | ESP32 Pin Connection |
| :--- | :--- | :--- |
| **ESP32 DevKitC** | Main Microcontroller (WiFi + BLE enabled) | - |
| **DHT22 Sensor** | Temperature & Humidity Sensor | **GPIO 4** (Data) |
| **MQ-5 Gas Sensor** | Combustible Gas Sensor (Methane, LPG, CO) | **GPIO 34** (Analog Input) |
| **Liquid Crystal Display** | LCD 20x4 characters with I2C Backlight backpack | **GPIO 22** (SCL), **GPIO 21** (SDA) (Standard I2C) |
| **Active Buzzer** | High-pitch warning tone emitter | **GPIO 26** (PWM Output) |
| **Green LED** | Status LED: Good / Moderate Air Quality | **GPIO 27** (Digital Out) |
| **Yellow LED** | Status LED: Unhealthy Air Quality | **GPIO 25** (Digital Out) |
| **Red LED** | Status LED: Dangerous / Hazardous Air Quality | **GPIO 33** (Digital Out) |

---

## 2. Firmware Architecture (`esp32_aqi_node.ino`)

The firmware resides in [esp32_aqi_node.ino](file:///C:/Users/Lei/Desktop/AntiGravity/firmware/esp32_aqi_node/esp32_aqi_node.ino) and is built on the Arduino framework. Key capabilities include:

1. **Local AQI Processing**:
   - Calculates the Air Quality Index (AQI) locally using EPA PM2.5 breakpoints.
   - Automatically drives the LEDs and Active Buzzer depending on the calculated AQI level:
     - `GOOD` / `MODERATE`: Green LED ON.
     - `UNHEALTHY`: Yellow LED ON + periodic short beeps (1000 Hz, 200ms).
     - `DANGEROUS` / `HAZARDOUS`: Red LED ON + continuous alarm tone (2000 Hz).

2. **Offline Buffering (LittleFS)**:
   - If WiFi or the MQTT broker disconnects, the node switches to **offline mode**.
   - Readings are serialized to JSON and appended to a flash file (`/buffer.txt`) using the **LittleFS** file system.
   - Once connection is restored, the buffered messages are read sequentially, published back to the broker, and `/buffer.txt` is safely deleted.

3. **Status Indicators (LCD Display)**:
   - Row 1: Temperature (°C) and Humidity (%)
   - Row 2: Gas PPM (combustible gas concentrations)
   - Row 3: Current AQI score and Category (e.g., `GOOD`, `MODERATE`, etc.)
   - Row 4: Network status (`Online` or `Offline (B)` for buffered)

---

## 3. MQTT Data Protocol

Sensor nodes communicate with the backend's embedded Aedes MQTT broker using the following conventions:

### Topic Hierarchy
- **Format**: `hospital/{room_id}/airquality`
- **Example**: `hospital/ICU-1/airquality`

### JSON Payload Schema
The payload contains telemetry data and environment levels. The backend supports the following schema:
```json
{
  "pm1": 12.0,            // PM1.0 reading (µg/m³) - Mocked/Actual
  "pm25": 24.5,           // PM2.5 reading (µg/m³) - Mocked/Actual
  "pm10": 45.0,           // PM10 reading (µg/m³) - Mocked/Actual
  "tvoc": 85,             // Total Volatile Organic Compounds (ppb) - Mocked/Actual
  "eco2": 420,            // Equivalent CO2 (ppm) - Mocked/Actual
  "temperature": 23.5,    // Ambient temperature (°C) from DHT22
  "humidity": 42.0,       // Ambient humidity (%) from DHT22
  "gas": 320.0,           // Mapped gas concentration (ppm) from MQ-5
  "timestamp": 1234500,   // Uptime or relative epoch timestamp (ms)
  "rssi": -65,            // Optional WiFi signal strength (dBm)
  "battery_level": 92     // Optional Battery charge percentage
}
```

---

## 4. Setup & Configuration Steps

To deploy a new physical or simulated sensor node, follow these configuration instructions:

### Step A: Configure Firmware Parameters
Open `firmware/esp32_aqi_node/esp32_aqi_node.ino` and configure your credentials:

1. **WiFi Network**:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
   *Note: ESP32 only supports 2.4GHz WiFi networks.*

2. **MQTT Settings**:
   - `mqtt_server`: Set this to the IP address of the machine running the backend (e.g., `"192.168.1.100"`).
   - `mqtt_port`: Set to the port matching the backend (default: `1883` or `1885`).
   - `mqtt_username` & `mqtt_password`: Must match the `MQTT_USERNAME` and `MQTT_PASSWORD` defined in the backend `.env` file.

### Step B: Upload Firmware
1. Install **Arduino IDE** (or VS Code with PlatformIO).
2. Install the following libraries via the Arduino Library Manager:
   - `PubSubClient` (by Nick O'Leary)
   - `DHT sensor library` (by Adafruit) + `Adafruit Unified Sensor`
   - `LiquidCrystal I2C` (by Frank de Brabander)
   - `ArduinoJson` (by Benoit Blanchon)
3. Select **ESP32 Dev Module** as the target board.
4. Connect the ESP32 via USB and upload the sketch.

### Step C: Register Node on the Backend
Before the node starts logging data to a specific room, it must be registered:
1. Log into the PureAir dashboard as an **Admin**.
2. Go to **Sensor Nodes** -> **Register Node**.
3. Input the following details:
   - **Node ID**: Unique identifier (e.g., `ESP32-AQI-01` or matching client ID).
   - **MAC Address**: The hardware MAC address of the ESP32 (printed to Serial monitor on boot).
   - **Room Association**: Select the room where this node is located (e.g., `ICU-1`).

---

# PurpleAir Webhook Integration

The backend supports direct data ingestion from PurpleAir PA-II sensor webhooks, allowing you to integrate commercial air quality monitors into the PureAir dashboard.

## 1. How Ingestion Works
PurpleAir sensors configure local/remote webhooks to send periodic HTTP POST JSON payloads. The backend maps these payloads to our internal schema:
- **Identification**: The payload must contain a identifier key: `SensorId`, `mac_address`, or `mac`.
- **Averaging**: Standard PurpleAir units utilize dual laser channels (A and B). The backend automatically averages `pm25_a` and `pm25_b` (or `pm2_5_atm` / `pm2_5_atm_b`) to compute a consolidated PM2.5 reading.
- **Conversion**: Temperature readings are automatically converted from Fahrenheit (`current_temp_f`) to Celsius.

## 2. Configuration Steps

### Step A: Register the PurpleAir Sensor
Before configuring the webhook, you must register the sensor as a node in the PureAir database:
1. Log into the PureAir Dashboard as an **Admin**.
2. Go to **Sensor Nodes** -> **Register Node**.
3. Fill out the details:
   - **Node ID / MAC Address**: Input the PurpleAir device MAC address (or the unique PurpleAir Sensor ID).
   - **Room**: Assign the node to the desired room/zone.

### Step B: Configure the Webhook on the PurpleAir Device
1. Connect to your PurpleAir sensor's local configuration utility (refer to PurpleAir user guide).
2. Find the **Webhook / Local Push** settings.
3. Configure the following:
   - **Webhook URL**: `http://<YOUR_BACKEND_IP>:5001/api/sensors/purpleair`
   - **Interval**: e.g., every 80 or 120 seconds.
   - **Data Format**: Standard JSON.

---

*This README is auto‑generated from the source code and reflects the current API surface. Keep it in sync when adding or removing routes.*




## ✅ All Issues Fixed

### **Security & Bug Fixes Applied:**

1. **Authentication**: Secure JWT with Redis revocation
2. **Authorization**: Role-based access control (RBAC)
3. **Logging**: No sensitive data in production logs
4. **Error Handling**: Proper middleware ordering
5. **Webhook Security**: API key authentication for PurpleAir
6. **Frontend**: JWT expiration check and proper logout flow
7. **Monitoring**: Metrics endpoint protected for admin only

### **Configuration:**
- Backend: Port 5002, MQTT: Port 1886
- Frontend: Port 5173 with correct proxy configuration
- Environment: Complete `.env.example` with all required variables

### **Verification:**
```bash
cd backend
node verify_fixes.js
```

### **Production Notes:**
- Change default passwords after first login
- Update `JWT_SECRET` and `PURPLEAIR_API_KEY` in production
- Configure SMTP for email notifications
- Set proper CORS origins for production domains

---

**Status**: ✅ **Production-ready with all security issues resolved**