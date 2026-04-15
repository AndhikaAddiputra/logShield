/**
 * IoT edge stub: read HX711 and publish MQTT (configure WiFi/MQTT in secrets).
 * Implement calibration & topic schema to match backend MQTT broker.
 */
#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  Serial.println("log-shield esp32-loadcell — firmware stub");
}

void loop() {
  delay(5000);
}
