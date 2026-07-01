# 🛠️ PureAir Technology Stack

This document outlines the languages, frameworks, libraries, and tools used across the entire PureAir Monitoring System, categorized by their role in the architecture.

---

## 1. Programming Languages

| Language | Version | Location | Purpose |
| :--- | :--- | :--- | :--- |
| **C++** | C++11 / C++14 | `firmware/` | Used to program the ESP32 microcontroller. Handles reading physical sensors, hardware interrupts, and Wi-Fi/MQTT connections. |
| **JavaScript (Node.js)** | v18.x (LTS) | `backend/` | Powers the backend server logic, API endpoints, MQTT broker, and database connections. |
| **JavaScript / JSX** | ES6+ | `client/` | Used for building the interactive, component-based frontend web dashboard. |
| **HTML5 / CSS3** | Living Standard | `client/` | Defines the structure and styling/animations of the web dashboard. |

---

## 2. Hardware & Firmware

| Tool / Component | Version | Function |
| :--- | :--- | :--- |
| **ESP32 Microcontroller** | Tensilica Xtensa LX6 | The central brain of the physical sensor node. Collects data and transmits it over Wi-Fi. |
| **PlatformIO** | v6.x (Core) | The build environment and dependency manager used to compile and flash the C++ code to the ESP32. |
| **PubSubClient (Library)** | v2.8 | A C++ library used by the ESP32 to publish and subscribe to MQTT messages securely. |
| **ArduinoJson (Library)** | v6.21.3 | Used to format the sensor readings into JSON strings before transmitting them over MQTT. |

---

## 3. Backend (Server-Side)

| Framework / Library | Version | Function |
| :--- | :--- | :--- |
| **Express.js** | v5.2.1 | The core web framework used to build the REST API endpoints that the frontend talks to. |
| **Aedes** | v1.0.2 | An embedded MQTT broker running inside Node.js. It acts as the central hub that receives all sensor data published by the ESP32s. |
| **Mongoose** | v9.6.2 | An Object Data Modeling (ODM) library that translates Javascript objects into MongoDB documents for easy database storage. |
| **Socket.io** | v4.8.3 | Enables real-time, two-way communication. Pushes live sensor data directly from the backend to the frontend dashboard without refreshing the page. |
| **JSON Web Token (JWT)** | v9.0.3 (`jsonwebtoken`) | Secures the API routes. Ensures that only logged-in doctors/admins can access sensitive dashboard data. |
| **Bcrypt.js** | v3.0.3 (`bcryptjs`) | Cryptographically hashes admin passwords before saving them in the database so they are never stored in plain text. |
| **Nodemailer** | v9.0.1 | Sends automated email alerts to hospital staff when gas or PM2.5 levels exceed dangerous thresholds. |

---

## 4. Databases & Caching

| Tool | Version | Function |
| :--- | :--- | :--- |
| **MongoDB** | v6.0 | The primary NoSQL database. Stores user accounts, room configurations, and the permanent history of all sensor readings. |
| **Redis** | v7.x (Alpine) | An in-memory cache. Temporarily stores frequently accessed data to make the API respond incredibly fast and reduce load on MongoDB. |

---

## 5. Frontend (Web Dashboard)

| Framework / Library | Version | Function |
| :--- | :--- | :--- |
| **React** | v19.2.4 | The core UI library used to build the single-page application (SPA). Allows for modular, reusable interface components. |
| **Vite** | v8.0.1 | The ultra-fast build tool and development server used to run and bundle the React frontend. |
| **React Router** | v7.18.0 | Handles navigation between different pages (like Dashboard, Settings, Login) without reloading the browser. |
| **Fetch API** | Native | Standard browser interface for fetching resources, used to make HTTP requests from the React frontend to the Express backend. |

---

## 6. DevOps & Deployment

| Tool | Version | Function |
| :--- | :--- | :--- |
| **Docker** | v24.x+ / v20.10+ | Containerizes the backend, frontend, MongoDB, and Redis into isolated environments so they run identically on any server. |
| **Docker Compose** | v2.x+ | An orchestration tool that links all the Docker containers together and starts them up with a single command. |
| **Nginx** | stable-alpine | A high-performance reverse proxy server. It sits in front of the application, handling web traffic and routing it to the correct Docker container. |
| **Let's Encrypt / Certbot** | v2.x+ | Automatically generates and renews free SSL/TLS certificates to ensure the web dashboard is served over secure HTTPS. |

---

## 7. Third-Party Integrations

| Service | Version | Function |
| :--- | :--- | :--- |
| **PurpleAir API** | PA-II Local JSON | Used by the backend to poll outdoor/ambient air quality data from local sensor nodes to compare against hospital indoor air quality. |
