# LogShield IoT Setup Flow

This guide connects the ESP32 load-cell firmware to the deployed LogShield VPS.

Final IoT path:

```text
ESP32 load cell
  -> WiFi
  -> mqtt-logshield.atharizza.com:1883
  -> logshield-mosquitto
  -> logshield-backend MQTT listener
  -> CouchDB stock_reading documents
  -> Web dashboard Assets page
```

Test MQTT credentials:

```text
MQTT host: mqtt-logshield.atharizza.com
MQTT port: 1883
MQTT user: logshield_iot
MQTT pass: logshieldiot123!
```

## 1. Cloudflare DNS

Create this DNS record:

```text
Type: A
Name: mqtt-logshield
IPv4: 20.2.249.137
Proxy status: DNS only
TTL: Auto
```

It must be **DNS only**. Cloudflare proxy does not proxy raw MQTT on port `1883`.

Check DNS:

```bash
dig +short mqtt-logshield.atharizza.com
```

Expected:

```text
20.2.249.137
```

## 2. Azure VPS Network

Allow inbound TCP:

```text
1883/tcp
```

This is needed because the ESP32 connects from outside the VPS to Mosquitto.

Check on VPS:

```bash
sudo ss -ltnp | grep ':1883'
```

Expected:

```text
0.0.0.0:1883
[::]:1883
```

## 3. VPS Mosquitto Password File

Create a host-mounted password file:

```bash
cd /opt/logShield/infrastructure
sudo touch mosquitto_passwords
sudo chmod 666 mosquitto_passwords
```

Create or reset the IoT user password:

```bash
docker run --rm -it \
  -v "$PWD/mosquitto_passwords:/mosquitto_passwords" \
  eclipse-mosquitto:2 \
  mosquitto_passwd /mosquitto_passwords logshield_iot
```

Enter:

```text
logshieldiot123!
```

twice.

Lock file permissions:

```bash
sudo chown 1883:1883 mosquitto_passwords
sudo chmod 0700 mosquitto_passwords
```

## 4. VPS Mosquitto Config

Edit:

```bash
cd /opt/logShield
nano infrastructure/mosquitto.conf
```

Use:

```conf
# Mosquitto MQTT Broker Configuration

listener 1883
protocol mqtt

listener 9001
protocol websockets

allow_anonymous false
password_file /mosquitto/config/passwords

persistence true
persistence_location /mosquitto/data/

log_dest file /mosquitto/log/mosquitto.log
log_dest stdout
log_type all
log_timestamp true
```

## 5. VPS Compose Mosquitto Mount And Healthcheck

Edit:

```bash
nano infrastructure/docker-compose.vps.full.yml
```

Under `mosquitto.volumes`, include:

```yaml
    environment:
      MQTT_USER: ${MQTT_USER}
      MQTT_PASSWORD: ${MQTT_PASSWORD}

    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
      - ./mosquitto_passwords:/mosquitto/config/passwords:ro
      - mosquitto_data:/mosquitto/data
      - mosquitto_logs:/mosquitto/log
```

Use authenticated healthcheck:

```yaml
    healthcheck:
      test: ["CMD-SHELL", "mosquitto_sub -h localhost -u \"$${MQTT_USER}\" -P \"$${MQTT_PASSWORD}\" -t '$$SYS/broker/version' -C 1 -i healthcheck -W 3 >/dev/null"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## 6. VPS Backend MQTT Env

Edit:

```bash
nano /opt/logShield/.env
```

Add:

```env
MQTT_USER=logshield_iot
MQTT_PASSWORD=logshieldiot123!
```

Backend must be built from code that reads these env vars and passes them into `mqtt.connect(...)`.

Expected backend config support:

```js
mqttUser: process.env.MQTT_USER || "",
mqttPassword: process.env.MQTT_PASSWORD || "",
```

Expected backend MQTT connect:

```js
const client = mqtt.connect(config.mqttBrokerUrl, {
  ...(config.mqttUser ? { username: config.mqttUser } : {}),
  ...(config.mqttPassword ? { password: config.mqttPassword } : {}),
});
```

## 7. VPS Restart MQTT And Backend

```bash
cd /opt/logShield

docker compose \
  --env-file .env \
  -f infrastructure/docker-compose.vps.full.yml \
  up -d --force-recreate mosquitto backend
```

Check:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep logshield
docker logs logshield-mosquitto --tail 60
docker logs logshield-backend --tail 80
```

Expected Mosquitto log:

```text
New client connected ... u'logshield_iot'
```

Expected backend log:

```text
MQTT stock ingestion subscribed to logshield/stock/+, logshield/warehouse/+/scale/+/reading
```

## 8. VPS MQTT Smoke Test

Open subscriber:

```bash
docker exec -it logshield-mosquitto mosquitto_sub \
  -h localhost \
  -u logshield_iot \
  -P 'logshieldiot123!' \
  -t "logshield/#" -v
```

In another VPS shell, publish:

```bash
docker exec logshield-mosquitto mosquitto_pub \
  -h localhost \
  -u logshield_iot \
  -P 'logshieldiot123!' \
  -t "logshield/warehouse/WH-001/scale/NODE-01/reading" \
  -m '{"node_id":"NODE-01","warehouse_id":"WH-001","commodity":"beras","weight_g":1234,"weight_delta_g":1234,"sample_count":15,"rssi":-55,"uptime_s":100,"battery_mv":null}'
```

Subscriber should print:

```text
logshield/warehouse/WH-001/scale/NODE-01/reading {...}
```

Backend should store the reading.

## 9. Laptop Firmware Settings

File:

```text
C:\Users\Atharizza MA\Documents\logShield\firmware\esp32-loadcell\src\main.cpp
```

MQTT settings:

```cpp
const char* MQTT_BROKER = "mqtt-logshield.atharizza.com";
const int MQTT_PORT = 1883;
const char* MQTT_USER = "logshield_iot";
const char* MQTT_PASSWORD = "logshieldiot123!";
```

MQTT connect:

```cpp
mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD)
```

WiFi settings:

```cpp
const char* WIFI_SSID = "Wanyo V25";
const char* WIFI_PASSWORD = "anohuehu";
```

Change the WiFi values if the ESP32 is tested on a different network.

## 10. Laptop Build Firmware

PowerShell:

```powershell
cd "C:\Users\Atharizza MA\Documents\logShield\firmware\esp32-loadcell"
.\.pio-venv\Scripts\python -m platformio run
```

Find device port:

```powershell
.\.pio-venv\Scripts\python -m platformio device list
```

Example output:

```text
COM3
```

## 11. Laptop Upload Firmware

Replace `COM3` if your ESP32 uses another port:

```powershell
.\.pio-venv\Scripts\python -m platformio run --target upload --upload-port COM3
```

If upload says port is busy:

1. Close Serial Monitor.
2. Close Arduino IDE or other terminal using the port.
3. Replug ESP32.
4. Retry upload.

## 12. Laptop Serial Monitor

```powershell
.\.pio-venv\Scripts\python -m platformio device monitor --port COM3 --baud 9600
```

Expected:

```text
[WiFi] OK!
[MQTT] Connecting to mqtt-logshield.atharizza.com:1883
[MQTT] Connected!
[MQTT] Subscribe: logshield/warehouse/WH-001/scale/NODE-01/config
[Sensor] Reading...
[MQTT] Sent OK
```

If MQTT fails:

```text
Check Cloudflare DNS only for mqtt-logshield.
Check Azure 1883/tcp inbound rule.
Check MQTT username/password.
Check Mosquitto is healthy.
```

## 13. VPS Watch Real ESP32 Messages

While ESP32 runs, watch:

```bash
docker exec -it logshield-mosquitto mosquitto_sub \
  -h localhost \
  -u logshield_iot \
  -P 'logshieldiot123!' \
  -t "logshield/#" -v
```

Expected:

```text
logshield/warehouse/WH-001/scale/NODE-01/reading {"node_id":"NODE-01",...}
```

## 14. VPS Verify Backend Stored Readings

Login:

```bash
LOGIN=$(curl -sS -X POST https://api-logshield.atharizza.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"CHANGE_ADMIN_EMAIL","password":"CHANGE_ADMIN_PASSWORD"}')

TOKEN=$(echo "$LOGIN" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")
```

Query readings:

```bash
curl "https://api-logshield.atharizza.com/api/stock-readings?node_id=NODE-01&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

Expected:

```text
ok: true
readings includes NODE-01
commodity: beras
warehouse_id: WH-001
```

## 15. Web Dashboard Check

Open:

```text
https://logshield.atharizza.com
```

Then:

1. Login as admin.
2. Open Assets / Inventaris.
3. Click Refresh near IoT readings.
4. Confirm `beras`, `NODE-01`, and `WH-001` appear.

## 16. Full Success Checklist

```text
Cloudflare mqtt-logshield DNS only
Azure 1883/tcp allowed
Mosquitto healthy
Backend connected to MQTT with u'logshield_iot'
ESP32 serial shows MQTT Connected
VPS subscriber sees ESP32 messages
API /api/stock-readings returns NODE-01 readings
Web Assets page shows the sensor readings after Refresh
```
