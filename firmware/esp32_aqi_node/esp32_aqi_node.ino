#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>
#include "LittleFS.h"
#include <Wire.h>

struct PMSFrame {
  uint16_t pm1_env;
  uint16_t pm25_env;
  uint16_t pm10_env;
};

struct AQIResult { 
  int aqi; 
  String status; 
};
#include "config.h"
#include <WiFiClientSecure.h>

String clientId = "ICU Ward B";

WiFiClient espClient;
WiFiClientSecure espClientSecure;
PubSubClient client; // Set client in setup()

// PubSubClient default buffer can be too small depending on payload size.
// Increase to reduce edge-case publish failures.
static const uint16_t MQTT_BUFFER_SIZE = 1024;



// --- Pin Definitions ---
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);


#define MQ5_PIN 34 // Analog pin for MQ5

// --- Alert Hardware ---
#define BUZZER_PIN  26   // Buzzer
#define LED_GREEN   27   // Green  = Good/Moderate
#define LED_YELLOW  25   // Yellow = Unhealthy
#define LED_RED     33   // Red    = Dangerous

// --- LCD Display ---
#define LCD_SDA     21
#define LCD_SCL     22
LiquidCrystal_I2C lcd(0x27, 20, 4);

// --- PMS5003 Pins & Struct ---
#define PMS_RX 16
#define PMS_TX 17


uint16_t last_pm1 = 12;
uint16_t last_pm25 = 24;
uint16_t last_pm10 = 45;

bool readPMS(HardwareSerial &pmsSerial, PMSFrame &frame) {
  if (!pmsSerial.available()) return false;
  
  // Find start byte 0x42
  while (pmsSerial.available() && pmsSerial.peek() != 0x42) {
    pmsSerial.read(); // Clear wrong byte
  }
  
  if (pmsSerial.available() < 32) {
    return false; // Wait for full packet
  }
  
  uint8_t buffer[32];
  pmsSerial.readBytes(buffer, 32);
  
  // Verify checksum
  uint16_t sum = 0;
  for (int i = 0; i < 30; i++) {
    sum += buffer[i];
  }
  uint16_t checksum = (buffer[30] << 8) | buffer[31];
  if (sum != checksum) {
    Serial.println("PMS5003 Checksum Error");
    return false;
  }
  
  // Check header
  if (buffer[0] != 0x42 || buffer[1] != 0x4D) {
    return false;
  }
  
  // PM concentrations under atmospheric environment (standard/real-world)
  frame.pm1_env = (buffer[10] << 8) | buffer[11];
  frame.pm25_env = (buffer[12] << 8) | buffer[13];
  frame.pm10_env = (buffer[14] << 8) | buffer[15];
  
  return true;
}

// Variables for timing
unsigned long lastMsg = 0;
const long interval = 5000;
bool isSyncing = false;

// --- AQI Calculation (EPA Breakpoints for PM2.5) ---

AQIResult calculateAQI(float pm25) {
  if (pm25 <= 12.0)  return { (int)((50.0/12.0) * pm25), "GOOD" };
  if (pm25 <= 35.4)  return { (int)(((100-51)/(35.4-12.1)) * (pm25-12.1) + 51), "MODERATE" };
  if (pm25 <= 55.4)  return { (int)(((150-101)/(55.4-35.5)) * (pm25-35.5) + 101), "UNHEALTHY" };
  if (pm25 <= 150.4) return { (int)(((200-151)/(150.4-55.5)) * (pm25-55.5) + 151), "DANGEROUS" };
  return { 500, "HAZARDOUS" };
}

// --- Offline Buffering Logic ---
void saveReadingToFlash(const char* json) {
  File file = LittleFS.open("/buffer.txt", "a");
  if (!file) {
    Serial.println("Failed to open buffer file for appending");
    return;
  }
  file.println(json);
  file.close();
  Serial.println("Data buffered to flash memory.");
}

void syncBufferedData() {
  if (!LittleFS.exists("/buffer.txt")) return;
  
  isSyncing = true;
  Serial.println("Starting sync of buffered data...");
  lcd.setCursor(0, 3);
  lcd.print("Syncing Cache...    ");

  File file = LittleFS.open("/buffer.txt", "r");
  File tempFile = LittleFS.open("/buffer_tmp.txt", "w");
  bool allSynced = true;

  if (file && tempFile) {
    while (file.available()) {
      String line = file.readStringUntil('\n');
      if (line.length() > 0) {
        if (client.connected() && client.publish(mqtt_topic, line.c_str())) {
          delay(100); // Small delay to avoid flooding
        } else {
          allSynced = false;
          tempFile.println(line);
        }
      }
    }
    file.close();
    tempFile.close();
    
    if (allSynced) {
      LittleFS.remove("/buffer.txt");
      LittleFS.remove("/buffer_tmp.txt");
      Serial.println("Sync complete. Buffer cleared.");
    } else {
      LittleFS.remove("/buffer.txt");
      LittleFS.rename("/buffer_tmp.txt", "/buffer.txt");
      Serial.println("Sync partial. Remaining data kept in buffer.");
    }
  } else {
    if (file) file.close();
    if (tempFile) tempFile.close();
  }
  isSyncing = false;
}

// --- Set LED + Buzzer based on AQI status ---
bool isBuzzerActive = false;

void setAlertHardware(String status, float gas_ppm) {
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_RED, LOW);

  // If gas level exceeds 2500 ppm, trigger high-priority gas leak alarm
  if (gas_ppm > 2500.0) {
    digitalWrite(LED_RED, HIGH);
    tone(BUZZER_PIN, 2500); // Continuous high-frequency alert for gas leaks
    isBuzzerActive = true;
  } else if (status == "GOOD" || status == "MODERATE") {
    digitalWrite(LED_GREEN, HIGH);
    if (isBuzzerActive) {
      noTone(BUZZER_PIN);
      isBuzzerActive = false;
    }
  } else if (status == "UNHEALTHY") {
    digitalWrite(LED_YELLOW, HIGH);
    tone(BUZZER_PIN, 1000, 200);
    isBuzzerActive = true;
  } else {
    digitalWrite(LED_RED, HIGH);
    tone(BUZZER_PIN, 2000);
    isBuzzerActive = true;
  }
}

void setup_wifi() {
  delay(10);
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n");
    Serial.println("==================================================");
    Serial.println("CRITICAL ERROR: Failed to connect to WiFi!");
    Serial.println("==================================================");
    Serial.println("1. Double check your password is correct.");
    Serial.println("2. Make sure your phone hotspot is set to 2.4 GHz, NOT 5 GHz.");
    Serial.println("The program will now halt. Reset the board to try again.");
    while(true) { delay(1000); } // Halt the program completely
  }
}

void reconnect() {
  // Non-blocking reconnection attempt
  if (!client.connected()) {
    Serial.print("Attempting MQTT connection as ");
    Serial.print(clientId);
    Serial.print(" to ");
    Serial.print(mqtt_server);
    Serial.print(":");
    Serial.print(mqtt_port);
    Serial.print(" (user=");
    Serial.print(mqtt_username);
    Serial.print(")...");
    Serial.print(" WiFiRSSI=");
    Serial.print(WiFi.RSSI());

    // KeepAlive helps some broker/client setups
    client.setKeepAlive(30);

    bool ok = client.connect(clientId.c_str(), mqtt_username, mqtt_password);
    if (ok) {
      Serial.println(" connected");
      syncBufferedData();
    } else {
      Serial.print(" failed, rc=");
      Serial.print(client.state());
      Serial.println(" (will retry in next cycle)");
    }
  }
}


void setup() {
  Serial.begin(115200);

  // Initialize LittleFS
  if (!LittleFS.begin(true)) {
    Serial.println("LittleFS Mount Failed");
  }

  pinMode(LED_GREEN,  OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED,    OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Scan I2C bus to auto-detect LCD address using custom pins (SDA=21, SCL=22)
  Wire.begin(LCD_SDA, LCD_SCL);
  Serial.println("Scanning I2C bus...");
  byte error, address;
  int nDevices = 0;
  uint8_t detected_addr = 0x27; // Default address
  for(address = 1; address < 127; address++ ) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    if (error == 0) {
      Serial.print("I2C device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      Serial.println(" !");
      if (address == 0x27 || address == 0x3F || address == 0x3E) {
        detected_addr = address;
      }
      nDevices++;
    }
  }
  if (nDevices == 0) {
    Serial.println("No I2C devices found. Check your SDA/SCL wiring.");
  } else {
    Serial.print("Using I2C address 0x");
    Serial.println(detected_addr, HEX);
    lcd = LiquidCrystal_I2C(detected_addr, 20, 4);
  }

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Hospital AQI Node");
  
  // Initialize Serial2 for PMS5003 Sensor
  Serial2.begin(9600, SERIAL_8N1, PMS_RX, PMS_TX);
  
  dht.begin();
  setup_wifi();
  
  // Generate persistent client ID using MAC address
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  clientId += mac;
  Serial.print("Persistent Client ID: ");
  Serial.println(clientId);

  // Select secure or plain transport based on the configured MQTT port.
  // Port 8883 = TLS encrypted (production), Port 1886 = plain TCP (local only).
  if (mqtt_port == 8883) {
    // setInsecure() enables TLS encryption without certificate verification.
    // Encrypts all traffic including MQTT credentials, preventing passive sniffing.
    // For full MITM protection, load a Root CA with setCACert() instead.
    espClientSecure.setInsecure();
    client.setClient(espClientSecure);
    Serial.println("MQTT: Using TLS/SSL (secure, port 8883)");
  } else {
    client.setClient(espClient);
    Serial.println("MQTT: Using plain TCP (insecure, local dev only)");
  }
  client.setServer(mqtt_server, mqtt_port);
  client.setBufferSize(MQTT_BUFFER_SIZE);
}




void loop() {
  // Check WiFi and MQTT connection status periodically
  static unsigned long lastConnCheck = 0;
  if (millis() - lastConnCheck > 10000) { // Check every 10s
    lastConnCheck = millis();
    if (WiFi.status() == WL_CONNECTED) {
      if (!client.connected()) {
        reconnect();
      }
    } else {
      Serial.println("WiFi disconnected. Retrying...");
      WiFi.disconnect();
      WiFi.begin(ssid, password); // Attempt to reconnect to WiFi
    }
  }
  
  if (client.connected()) {
    client.loop();
  }

  unsigned long now = millis();
  if (now - lastMsg > interval && !isSyncing) {
    lastMsg = now;

    float humidity = dht.readHumidity();
    float temp = dht.readTemperature();
    if (isnan(humidity) || isnan(temp)) {
      humidity = 0.0; temp = 0.0;
    }

    int mq5_raw = analogRead(MQ5_PIN);
    float gas_ppm = map(mq5_raw, 0, 4095, 100, 10000);

    // Read PMS5003 Sensor
    PMSFrame pmsFrame;
    if (readPMS(Serial2, pmsFrame)) {
      last_pm1 = pmsFrame.pm1_env;
      last_pm25 = pmsFrame.pm25_env;
      last_pm10 = pmsFrame.pm10_env;
      Serial.print("PMS5003 Data Read: PM1=");
      Serial.print(last_pm1);
      Serial.print(", PM2.5=");
      Serial.print(last_pm25);
      Serial.print(", PM10=");
      Serial.println(last_pm10);
    } else {
      // Slow drift/mock fallback when sensor is disconnected to keep simulation alive
      last_pm1 = constrain(last_pm1 + random(-1, 2), 2, 40);
      last_pm25 = constrain(last_pm25 + random(-2, 3), 5, 80);
      last_pm10 = constrain(last_pm10 + random(-3, 4), 10, 120);
    }

    float pm1 = last_pm1;
    float pm25 = last_pm25;
    float pm10 = last_pm10;
    int eco2 = random(400, 600);
    int tvoc = random(10, 100);

    AQIResult aqiResult = calculateAQI(pm25);
    setAlertHardware(aqiResult.status, gas_ppm);

    // LCD Display
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("T:"); lcd.print(temp, 1); lcd.print("C H:"); lcd.print(humidity, 0); lcd.print("% G:"); lcd.print(gas_ppm, 0);
    lcd.setCursor(0, 1);
    lcd.print("PM2.5:"); lcd.print(pm25, 0); lcd.print(" PM10:"); lcd.print(pm10, 0);
    lcd.setCursor(0, 2);
    lcd.print("AQI:"); lcd.print(aqiResult.aqi); lcd.print(" ["); lcd.print(aqiResult.status.substring(0, 7)); lcd.print("]");
    lcd.setCursor(0, 3);
    if (client.connected()) {
      lcd.print("Status: Online     ");
    } else {
      lcd.print("Status: Offline (B)");
    }

    // JSON payload
    StaticJsonDocument<256> doc;
    doc["pm1"] = pm1; doc["pm25"] = pm25; doc["pm10"] = pm10;
    doc["tvoc"] = tvoc; doc["eco2"] = eco2;
    doc["temperature"] = temp; doc["humidity"] = humidity; doc["gas"] = gas_ppm;
    doc["timestamp"] = millis(); // Local timestamp for ordering if buffered
    
    char jsonBuffer[256];
    serializeJson(doc, jsonBuffer);
    
    if (!client.connected()) {
      Serial.println("MQTT not connected. Buffering data...");
      saveReadingToFlash(jsonBuffer);
      lcd.setCursor(0, 3);
      lcd.print("Status: Offline (B)");
    } else if (client.publish(mqtt_topic, jsonBuffer)) {
      Serial.println("Published: " + String(jsonBuffer));
    } else {
      Serial.print("Publish failed (state=");
      Serial.print(client.state());
      Serial.println("). Buffering data...");
      saveReadingToFlash(jsonBuffer);
      lcd.setCursor(0, 3);
      lcd.print("Status: Offline (B)");
    }
  }
}

