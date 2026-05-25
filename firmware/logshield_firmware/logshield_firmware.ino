#include <WiFi.h>
#include <PubSubClient.h>
#include <HX711.h>
#include <ArduinoJson.h>
#include <Preferences.h>

// ----- Wi-Fi -----
const char* WIFI_SSID     = "Vivian's Husband";
const char* WIFI_PASSWORD = "vivianpi5";

// ----- MQTT Broker -----
const char* MQTT_BROKER = "10.38.175.103";
const int   MQTT_PORT   = 1883;

// ----- Node -----
const char* WAREHOUSE_ID = "WH-001";
const char* NODE_ID      = "NODE-01";
const char* COMMODITY    = "beras";

// ----- Kalibrasi -----
const long  CAL_OFFSET = -513743;
const float CAL_SCALE  = 1035.302246;

// ============================================================
//  KONSTANTA
// ============================================================
#define HX711_DT    16
#define HX711_SCK   4

#define INTERVAL_READING  30000   // kirim data setiap 30 detik
#define INTERVAL_HEALTH   300000  // kirim health setiap 5 menit
#define INTERVAL_RECONNECT 5000   // coba reconnect setiap 5 detik

#define MEDIAN_SAMPLES   15
#define NVS_MAX          100      // buffer offline maksimal 100 pembacaan

// ============================================================
//  GLOBAL
// ============================================================
WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);
HX711        scale;
Preferences  prefs;

unsigned long lastReading   = 0;
unsigned long lastHealth    = 0;
unsigned long lastReconnect = 0;
unsigned long bootTime      = 0;

long  lastWeight_g  = 0;
int   bufferCount   = 0;
int   bufferHead    = 0;

// Topic buffers
char topicReading[120];
char topicHealth[120];
char topicConfig[120];

// ============================================================
//  MEDIAN FILTER
// ============================================================
float getMedian() {
  if (!scale.is_ready()) return -1;

  float samples[MEDIAN_SAMPLES];
  int valid = 0;

  for (int i = 0; i < MEDIAN_SAMPLES; i++) {
    if (scale.is_ready()) {
      samples[valid++] = scale.get_units(1);
    }
    delay(30);
  }

  if (valid == 0) return -1;

  // Insertion sort
  for (int i = 1; i < valid; i++) {
    float key = samples[i];
    int j = i - 1;
    while (j >= 0 && samples[j] > key) {
      samples[j + 1] = samples[j];
      j--;
    }
    samples[j + 1] = key;
  }

  return samples[valid / 2];
}

// ============================================================
//  NVS BUFFER
// ============================================================
void bufferInit() {
  prefs.begin("buf", true);
  bufferCount = prefs.getInt("count", 0);
  bufferHead  = prefs.getInt("head", 0);
  prefs.end();
  Serial.printf("[NVS] %d pembacaan tersimpan\n", bufferCount);
}

void bufferStore(const String& payload) {
  prefs.begin("buf", false);
  String key = "r" + String(bufferHead);
  prefs.putString(key.c_str(), payload);
  bufferHead = (bufferHead + 1) % NVS_MAX;
  if (bufferCount < NVS_MAX) bufferCount++;
  prefs.putInt("count", bufferCount);
  prefs.putInt("head", bufferHead);
  prefs.end();
  Serial.printf("[NVS] Buffered (total=%d)\n", bufferCount);
}

void bufferFlush() {
  if (bufferCount == 0 || !mqtt.connected()) return;

  Serial.printf("[NVS] Flushing %d pembacaan...\n", bufferCount);
  prefs.begin("buf", false);

  int start = (bufferHead - bufferCount + NVS_MAX) % NVS_MAX;
  int flushed = 0;

  for (int i = 0; i < bufferCount; i++) {
    int idx = (start + i) % NVS_MAX;
    String key = "r" + String(idx);
    String payload = prefs.getString(key.c_str(), "");

    if (payload.length() > 0) {
      if (mqtt.publish(topicReading, payload.c_str(), false)) {
        prefs.remove(key.c_str());
        flushed++;
        delay(30);
      } else {
        break;
      }
    }
  }

  bufferCount -= flushed;
  if (bufferCount <= 0) { bufferCount = 0; bufferHead = 0; }
  prefs.putInt("count", bufferCount);
  prefs.putInt("head", bufferHead);
  prefs.end();

  Serial.printf("[NVS] Terkirim %d, sisa %d\n", flushed, bufferCount);
}

// ============================================================
//  TIMESTAMP
// ============================================================
String getTimestamp() {
  unsigned long ms = millis();
  unsigned long s  = ms / 1000;
  unsigned long m  = s / 60;
  unsigned long h  = m / 60;
  char buf[30];
  snprintf(buf, sizeof(buf), "uptime_%02luh%02lum%02lus", h, m % 60, s % 60);
  return String(buf);
}

// ============================================================
//  MQTT CALLBACK (terima command dari backend)
// ============================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.printf("[MQTT] Config: %s\n", msg.c_str());

  JsonDocument doc;
  if (deserializeJson(doc, msg)) return;

  const char* cmd = doc["command"];
  if (!cmd) return;

  if (strcmp(cmd, "tare") == 0) {
    Serial.println("[CMD] Tare...");
    scale.tare(20);
    Serial.printf("[CMD] Tare selesai, offset=%ld\n", scale.get_offset());
  }
  else if (strcmp(cmd, "restart") == 0) {
    Serial.println("[CMD] Restart...");
    delay(500);
    ESP.restart();
  }
}

// ============================================================
//  WIFI
// ============================================================
void wifiConnect() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] OK! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] Gagal, akan coba lagi...");
  }
}

// ============================================================
//  MQTT CONNECT
// ============================================================
void mqttConnect() {
  if (mqtt.connected()) return;
  if (WiFi.status() != WL_CONNECTED) return;

  String clientId = "logshield-" + String(NODE_ID) + "-" + String(random(0xffff), HEX);

  Serial.printf("[MQTT] Connecting to %s:%d\n", MQTT_BROKER, MQTT_PORT);

  if (mqtt.connect(clientId.c_str())) {
    Serial.println("[MQTT] Terhubung!");
    mqtt.subscribe(topicConfig, 1);
    Serial.printf("[MQTT] Subscribe: %s\n", topicConfig);
  } else {
    Serial.printf("[MQTT] Gagal, rc=%d\n", mqtt.state());
  }
}

// ============================================================
//  Sensor Data Post
// ============================================================
void sendReading() {
  Serial.println("\n[Sensor] Membaca...");

  float weight = getMedian();

  if (weight < 0) {
    Serial.println("[Sensor] Gagal baca");
    return;
  }

  if (weight < -500 || weight > 60000) {
    Serial.printf("[Sensor] Nilai di luar rentang: %.1f g — dibuang\n", weight);
    return;
  }

  long weight_g = (long)weight;
  long delta    = weight_g - lastWeight_g;

  Serial.printf("[Sensor] Bobot: %ld g | Delta: %+ld g\n", weight_g, delta);

  // Build JSON
  // Format sesuai yang diharapkan backend logshield
  JsonDocument doc;
  doc["node_id"]       = NODE_ID;
  doc["warehouse_id"]  = WAREHOUSE_ID;
  doc["commodity"]     = COMMODITY;
  doc["weight_g"]      = weight_g;
  doc["weight_delta_g"]= delta;
  doc["sample_count"]  = MEDIAN_SAMPLES;
  doc["timestamp"]     = getTimestamp();
  doc["rssi"]          = WiFi.RSSI();
  doc["uptime_s"]      = (millis() - bootTime) / 1000;
  doc["nvs_buffered"]  = bufferCount;

  String payload;
  serializeJson(doc, payload);
  lastWeight_g = weight_g;

  // Kirim atau buffer
  if (mqtt.connected()) {
    if (mqtt.publish(topicReading, payload.c_str(), false)) {
      Serial.println("[MQTT] Terkirim ✓");
      bufferFlush(); // kirim juga yang tersimpan
    } else {
      Serial.println("[MQTT] Gagal kirim, buffer ke NVS");
      bufferStore(payload);
    }
  } else {
    Serial.println("[MQTT] Offline, buffer ke NVS");
    bufferStore(payload);
  }
}

// ============================================================
//  HEALTH REPORT
// ============================================================
void sendHealth() {
  if (!mqtt.connected()) return;

  JsonDocument doc;
  doc["node_id"]      = NODE_ID;
  doc["warehouse_id"] = WAREHOUSE_ID;
  doc["uptime_s"]     = (millis() - bootTime) / 1000;
  doc["rssi"]         = WiFi.RSSI();
  doc["free_heap_kb"] = ESP.getFreeHeap() / 1024;
  doc["nvs_buffered"] = bufferCount;
  doc["last_weight_g"]= lastWeight_g;
  doc["timestamp"]    = getTimestamp();

  String out;
  serializeJson(doc, out);

  if (mqtt.publish(topicHealth, out.c_str(), false)) {
    Serial.println("[Health] Terkirim ✓");
  }
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  bootTime = millis();

  Serial.println();
  Serial.println("============================================");
  Serial.println("  LOG-SHIELD IoT Firmware v1.0.0");
  Serial.printf("  Node: %s | Gudang: %s\n", NODE_ID, WAREHOUSE_ID);
  Serial.printf("  Komoditas: %s\n", COMMODITY);
  Serial.println("============================================");
  Serial.printf("  MQTT Broker : %s:%d\n", MQTT_BROKER, MQTT_PORT);
  Serial.println("  HX711: DT=GPIO16, SCK=GPIO4");
  Serial.printf("  Kalibrasi   : offset=%ld, scale=%.6f\n", CAL_OFFSET, CAL_SCALE);
  Serial.println("============================================\n");

  // Build topic strings
  snprintf(topicReading, sizeof(topicReading),
    "logshield/warehouse/%s/scale/%s/reading", WAREHOUSE_ID, NODE_ID);
  snprintf(topicHealth, sizeof(topicHealth),
    "logshield/warehouse/%s/scale/%s/health", WAREHOUSE_ID, NODE_ID);
  snprintf(topicConfig, sizeof(topicConfig),
    "logshield/warehouse/%s/scale/%s/config", WAREHOUSE_ID, NODE_ID);

  Serial.printf("[Topic] Reading : %s\n", topicReading);
  Serial.printf("[Topic] Health  : %s\n", topicHealth);
  Serial.printf("[Topic] Config  : %s\n", topicConfig);
  Serial.println();

  // HX711
  scale.begin(HX711_DT, HX711_SCK);

  if (scale.is_ready()) {
    Serial.println("[HX711] Sensor terdeteksi ✓");
  } else {
    Serial.println("[HX711] Sensor tidak terdeteksi, cek kabel");
  }

  // Calibrate
  scale.set_offset(CAL_OFFSET);
  scale.set_scale(CAL_SCALE);
  Serial.println("[HX711] Kalibrasi diterapkan ✓");

  // Buffer NVS
  bufferInit();

  // MQTT
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(512);

  // WiFi
  wifiConnect();
  mqttConnect();

  // Baca awal
  if (scale.is_ready()) {
    float w = getMedian();
    if (w >= 0) {
      lastWeight_g = (long)w;
      Serial.printf("[Init] Bobot awal: %ld g\n", lastWeight_g);
    }
  }

  Serial.println("\n[Init] Setup selesai!\n");
}

// ============================================================
//  LOOP
// ============================================================
void loop() {
  unsigned long now = millis();

  // WiFi reconnect
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastReconnect > INTERVAL_RECONNECT) {
      lastReconnect = now;
      wifiConnect();
    }
  }

  // MQTT reconnect
  if (WiFi.status() == WL_CONNECTED && !mqtt.connected()) {
    if (now - lastReconnect > INTERVAL_RECONNECT) {
      lastReconnect = now;
      mqttConnect();
    }
  }

  // MQTT loop
  if (mqtt.connected()) {
    mqtt.loop();
  }

  // Kirim data sensor setiap 30 detik
  if (now - lastReading >= INTERVAL_READING) {
    lastReading = now;
    sendReading();
  }

  // Kirim health setiap 5 menit
  if (now - lastHealth >= INTERVAL_HEALTH) {
    lastHealth = now;
    sendHealth();
  }

  delay(100);
}
