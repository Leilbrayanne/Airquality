# PureAir Hospital IAQ System – Production Deployment Guide

This guide details the step-by-step instructions required to deploy the **PureAir Indoor Air Quality (IAQ) Monitoring System** in a production environment. 

---

## 🏗️ System Architecture

The production deployment runs as a multi-container Docker cluster structured as follows:

```mermaid
graph TD
    Client[ESP32 AQI Node] -- "MQTT over TLS (Port 8883)" --> Nginx
    Browser[Web Browser / Dashboard] -- "HTTPS (Port 443)" --> Nginx
    
    subgraph Docker Bridge Network
        Nginx[Nginx Reverse Proxy & SSL] -- Proxy --> FE[React Client Nginx (Port 80)]
        Nginx -- Proxy --> BE[Backend API & Aedes Broker (Port 5002 / 1886)]
        BE -- Cache / JWT --> Redis[(Redis Cache)]
        BE -- Read/Write --> Mongo[(MongoDB)]
    end
```

---

## 📋 Prerequisites

Before proceeding, ensure the host machine has the following installed:
1. **Docker Engine** (v20.10+)
2. **Docker Compose** (v2.0+)
3. **A Domain Name** mapped to your host's public IP (e.g., `pureair.yourhospital.org`)
4. **SSL/TLS Certificates** (from Let's Encrypt or your hospital's internal Certificate Authority)

---

## 🚀 Deployment Steps

### 1. Project Directory Structure Setup
On your production server, clone the repository or copy the project files. Ensure your directory layout matches this:
```text
/pureair
├── backend/
│   ├── mongodb-init.js
│   └── ...
├── client/
│   └── ...
├── deployment/
│   └── nginx.conf
├── nginx_ssl/
│   └── live/
│       ├── fullchain.pem
│       └── privkey.pem
├── docker-compose.production.yml
└── .env
```

---

### 2. Configure Environment Variables (`.env`)

Create a unified `.env` file in the root `/pureair` directory. This file will feed env vars into Docker Compose.

```bash
# Generate strong, random credentials before starting!
# JWT Secret (64 chars): openssl rand -hex 64
# Password keys: openssl rand -hex 24
```

Here is the template for the production `.env` file:

```env
# ── SERVER CONFIG ───────────────────────────────────────────────────────────
NODE_ENV=production
FRONTEND_URL=https://pureair.yourhospital.org
ALLOWED_ORIGINS=https://pureair.yourhospital.org

# ── DATABASE & REDIS SECURITY ────────────────────────────────────────────────
# Root administrator for MongoDB management
MONGO_ROOT_PASSWORD=Wrote_A_Strong_Random_Root_Pass_Here
# Application user password (must match what goes into Mongo)
MONGO_APP_PASSWORD=Wrote_A_Strong_Random_App_Pass_Here

# Redis Cache access password
REDIS_PASSWORD=Wrote_A_Strong_Random_Redis_Pass_Here

# ── BACKEND & API SECURITY ──────────────────────────────────────────────────
# JSON Web Token Secret
JWT_SECRET=YOUR_64_CHARACTER_RANDOM_JWT_SECRET_HERE

# MQTT Broker credentials (used by ESP32 nodes to connect)
MQTT_USERNAME=hospital_node
MQTT_PASSWORD=YOUR_STRONG_RANDOM_MQTT_PASSWORD_HERE

# ── EMAIL/SMTP CONFIGURATION (Required for password resets & alerts) ─────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-hospital-alert-email@gmail.com
# Use an App Password (not your main password) if using Gmail
SMTP_PASS=your-google-app-password
SMTP_SECURE=false

# ── INTEGRATION (OPTIONAL) ──────────────────────────────────────────────────
# PurpleAir outdoor data integration key
PURPLEAIR_API_KEY=YOUR_PURPLEAIR_API_KEY_HERE
```

> [!IMPORTANT]  
> Never commit this `.env` file to your Git repository. It is ignored by default in `.gitignore`.

---

### 3. Database Hosting Options

When deploying to production, you have two main choices for hosting the MongoDB database:

#### Option A: Self-Hosted (Using Docker Compose)
This is the default configuration provided in `docker-compose.production.yml`. 
- **How it works:** Docker creates a secure MongoDB container alongside your backend. It uses `mongodb-init.js` to create the database (`hospital_aqi`) and set up users automatically based on your `.env` passwords.
- **Data storage:** Data is persisted in a local Docker volume (`mongodb_data`).
- **Best for:** Small-to-medium single-server deployments (e.g., a DigitalOcean Droplet or AWS EC2).

#### Option B: Managed Cloud Database (MongoDB Atlas)
For high availability, automatic backups, and scalability, you can use a managed cloud service like MongoDB Atlas.
- **How it works:** You create a cluster on [MongoDB Atlas](https://www.mongodb.com/atlas). They provide a connection string (e.g., `mongodb+srv://admin:pass@cluster0...`).
- **Setup:** Add `MONGODB_URI=your_atlas_connection_string` to your `.env` file. You can then remove the `mongodb` service from the `docker-compose.production.yml` file, as the backend will connect directly to the cloud.
- **Best for:** Large deployments across multiple hospitals or when you want zero-maintenance database hosting.

---

### 4. SSL/TLS Certificate Setup

Nginx expects TLS certificates to be placed in `./nginx_ssl/live/`.

#### Option A: Let's Encrypt (Certbot)
If your host is connected to the public internet, you can generate certificates using `certbot`:
```bash
sudo certbot certonly --standalone -d pureair.yourhospital.org
```
Then, copy or symlink the certs into your project:
```bash
mkdir -p nginx_ssl/live
sudo cp /etc/letsencrypt/live/pureair.yourhospital.org/fullchain.pem ./nginx_ssl/live/
sudo cp /etc/letsencrypt/live/pureair.yourhospital.org/privkey.pem ./nginx_ssl/live/
```

#### Option B: Self-Signed Certificates (Local/Internal Testing)
If deploying internally without a public domain, generate a self-signed certificate:
```bash
mkdir -p nginx_ssl/live
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./nginx_ssl/live/privkey.pem \
  -out ./nginx_ssl/live/fullchain.pem \
  -subj "/CN=pureair.local"
```

---

### 5. Build and Launch Containers

Run the docker-compose deployment script:
```bash
docker compose -f docker-compose.production.yml up -d --build
```

Verify that all containers are healthy:
```bash
docker compose -f docker-compose.production.yml ps
```

Expected output:
```text
NAME                IMAGE                  COMMAND                  SERVICE             CREATED             STATUS                    PORTS
pureair-backend     pureair-backend        "docker-entrypoint.s…"   pureair-backend     1 minute ago        Up 1 minute (healthy)     0.0.0.0:1886->1886/tcp, 0.0.0.0:5002->5002/tcp
pureair-client      pureair-client         "/docker-entrypoint.…"   pureair-client      1 minute ago        Up 1 minute (healthy)     80/tcp
pureair-mongodb     mongo:6.0              "docker-entrypoint.s…"   mongodb             1 minute ago        Up 1 minute (healthy)     0.0.0.0:27017->27017/tcp
pureair-nginx       nginx:alpine           "/docker-entrypoint.…"   nginx               1 minute ago        Up 1 minute (healthy)     0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
pureair-redis       redis:7-alpine         "docker-server --req…"   redis               1 minute ago        Up 1 minute (healthy)     0.0.0.0:6379->6379/tcp
```

---

### 6. Initialize the Admin Account

Once the backend container is healthy, navigate to the first-time setup route in your web browser:
```text
https://pureair.yourhospital.org/api/docs (or use `/api/auth/setup` POST body)
```

Alternatively, invoke setup via `curl` to register the primary admin:
```bash
curl -X POST https://pureair.yourhospital.org/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ChooseAStrongAdminPassword!","email":"admin@yourhospital.org"}'
```

> [!WARNING]  
> The `/api/auth/setup` endpoint will only work if there are **no** users in the database. Make this call immediately after launching to lock down the system.

---

## 🔌 ESP32 Firmware Configuration

To connect physical sensor hardware nodes to the production environment, compile the firmware with TLS enabled:

1. Locate the ESP32 source folder: `firmware/esp32_aqi_node/`
2. Duplicate `config.h.example` and name the new file `config.h`:
   ```bash
   cp config.h.example config.h
   ```
3. Open `config.h` and configure the production values:
   ```cpp
   // WiFi Settings
   const char* ssid = "Hospital-Staff-WiFi";
   const char* password = "WiFiPasswordHere";

   // Production MQTT settings
   const char* mqtt_server = "pureair.yourhospital.org";
   const int mqtt_port = 8883; // 8883 activates TLS Secure MQTT

   // MQTT User Details (Must match backend env variables)
   const char* mqtt_user = "hospital_node";
   const char* mqtt_pass = "YOUR_STRONG_RANDOM_MQTT_PASSWORD_HERE"; 
   ```
4. Flash the code to the ESP32 using the Arduino IDE or PlatformIO. The firmware will automatically use `WiFiClientSecure` for encryption.

---

## 📈 Verification and Troubleshooting

### View Container Logs
If any container fails to start, inspect its output:
```bash
# View backend logs
docker compose -f docker-compose.production.yml logs -f pureair-backend

# View reverse proxy logs
docker compose -f docker-compose.production.yml logs -f nginx
```

### Database Backup
The system automatically backs up data daily. To perform a manual MongoDB database dump:
```bash
docker exec -it pureair-mongodb mongodump \
  --username pureair_admin \
  --password YOUR_MONGO_ROOT_PASSWORD \
  --out /data/db/backups/
```
The output file will be written to `./backend/mongodb_data/backups/` on your host.

---

## 🔒 Security Posture & Hardening checklist
- [ ] Set `NODE_ENV=production` in root `.env` to disable dev routes and enable secure helmet middleware.
- [ ] Changed all default passwords (`MONGO_ROOT_PASSWORD`, `MONGO_APP_PASSWORD`, `REDIS_PASSWORD`, `MQTT_PASSWORD`, `JWT_SECRET`).
- [ ] Disabled interactive password prompts inside containerized databases.
- [ ] ESP32 communicates over port `8883` using SSL/TLS to prevent credential sniffing on local network runs.