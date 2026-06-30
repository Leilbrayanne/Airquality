# PureAir Hospital AQI Monitoring: Deployment Guide

This document outlines the deployment strategy and step-by-step instructions for the PureAir project. The architecture requires the **frontend to be hosted online**, while the **backend remains offline on the hospital's local network** for data privacy. 

> [!WARNING]
> **Architecture Caveat**: Since your backend is hosted locally inside the hospital, an online frontend (like Vercel or Netlify) will **only** be able to fetch data if the user opening the website is connected to the hospital's local network (or a hospital VPN). If someone opens the online frontend from their home without VPN access, the UI will load, but it will fail to connect to the backend database.

---

## 1. Initial Setup: Pushing to GitHub

Since you haven't put the project on GitHub yet, follow these steps to version control your code securely.

> [!IMPORTANT]
> **Security First**: Before committing, ensure you don't leak sensitive passwords (like WiFi credentials in the firmware or MongoDB passwords in `.env`). 
> 
> *   In `firmware/esp32_aqi_node.ino`, consider changing the hardcoded SSID and password to placeholder values (e.g., `"YOUR_SSID"`) before pushing.
> *   Ensure you have a `.gitignore` file in your root, backend, and client directories to ignore `node_modules/` and `.env` files.

**Steps to Push:**
1. Open your terminal in the project root (`c:\Users\Lei\Desktop\AntiGravity`).
2. Run the following commands:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: PureAir Hospital AQI system"
   ```
3. Go to [GitHub](https://github.com/) and create a **Private** repository (since it contains hospital-related configurations).
4. Link your local repository to GitHub and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

---

## 2. Backend Deployment (Local Hospital Server)

The backend must run on a secure machine inside the hospital network. It contains the Node.js Express API, the Aedes MQTT broker, MongoDB, and Redis.

**Prerequisites:**
- A dedicated PC or Server on the hospital network.
- **Docker** and **Docker Compose** installed.
- A static IP assigned to this server (e.g., `10.121.196.176`).

**Deployment Steps:**
1. Clone the repository onto the hospital server (or copy the files over if it has no internet access).
2. Navigate to the root directory where `docker-compose.yml` is located.
3. Make sure your `.env` files in the `backend/` directory are properly configured.
4. Start the services using Docker:
   ```bash
   docker-compose up -d --build
   ```
5. Verify that the backend is running on port `5002` and the MQTT broker is listening on port `1886`.

> [!TIP]
> Since the backend is running via Docker, it will automatically restart if the server reboots thanks to the `restart: always` flag in your `docker-compose.yml`.

---

## 3. Frontend Deployment (Online via Vercel/Netlify)

The frontend is a React/Vite app. We will host it online so it is easily accessible, but configure it to point to the local backend.

**Prerequisites:**
- An account on [Vercel](https://vercel.com) or [Netlify](https://netlify.com).

**Deployment Steps (Using Vercel as an example):**
1. Log in to Vercel and click **Add New Project**.
2. Import your GitHub repository.
3. In the **Framework Preset**, ensure it detects **Vite**.
4. In the **Root Directory**, specify `client`.
5. Under **Environment Variables**, add your backend URL. It MUST point to the hospital server's local IP address because that is where the browser will try to send requests:
   - `VITE_API_URL` = `http://10.121.196.176:5002` (Replace with your actual hospital server IP)
6. Click **Deploy**. Vercel will build and host your frontend on a public `.vercel.app` domain.

---

## 4. Firmware Deployment (ESP32 Nodes)

The firmware needs to be flashed to each ESP32 node placed in the hospital rooms.

**Configuration Updates:**
Before flashing, open `esp32_aqi_node.ino` and configure the following:
1. **WiFi Credentials**: Update `ssid` and `password` to the hospital's local IoT network.
2. **MQTT Server**: Update `mqtt_server` to the hospital server's static IP (e.g., `10.121.196.176`).
3. **MQTT Topic**: Customize the topic for each node based on its location (e.g., `hospital/ICU Ward B/airquality`).

**Flashing Steps:**
1. Connect the ESP32 board to your PC via USB.
2. Open the `.ino` file in the Arduino IDE.
3. Select the correct board (e.g., DOIT ESP32 DEVKIT V1) and COM port.
4. Click **Upload**.
5. Once uploaded, open the Serial Monitor (baud rate `115200`) to confirm the node connects to WiFi and the MQTT broker successfully.
6. Install the node in the hospital room.

> [!NOTE]
> The ESP32 is programmed with an offline buffering feature (`LittleFS`). If the local hospital server goes down, the ESP32 will save data locally and sync it automatically once the connection is restored.
