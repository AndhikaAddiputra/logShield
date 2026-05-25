# LogShield Linux VPS Deployment Guide

This guide is for deploying LogShield on an Ubuntu/Debian-style VPS where another project already owns public ports `80` and `443` through a Caddy container.

Final domain layout:

```text
Web dashboard: https://logshield.atharizza.com
Mobile PWA:    https://mobile-logshield.atharizza.com
Backend API:   https://api-logshield.atharizza.com
CouchDB sync:  https://couch-logshield.atharizza.com
MQTT broker:   atharizza.com:1883
```

Final host port layout:

```text
secure-chat-caddy: 0.0.0.0:80, 0.0.0.0:443
LogShield backend: 127.0.0.1:4000 -> container 4000
LogShield CouchDB: 127.0.0.1:5985 -> container 5984
LogShield AI:      127.0.0.1:8080 -> container 8000
LogShield MQTT:    0.0.0.0:1883 -> container 1883
```

Do not run Nginx for LogShield on this VPS while `secure-chat-caddy` owns ports `80` and `443`. Use the existing Caddy as the public reverse proxy.

## 1. DNS

Create `A` records pointing to the VPS public IP:

```text
logshield.atharizza.com
mobile-logshield.atharizza.com
api-logshield.atharizza.com
couch-logshield.atharizza.com
```

Check DNS:

```bash
ping logshield.atharizza.com
ping api-logshield.atharizza.com
```

## 2. Install Base Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates gnupg ufw lsof rsync
```

## 3. Install Docker And Compose

For Ubuntu 24.04 Noble:

```bash
sudo rm -f /etc/apt/sources.list.d/docker.list
sudo install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu noble stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker

docker ps
docker compose version
```

## 4. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v
npm -v
```

## 5. Clone LogShield

```bash
cd /opt
sudo git clone https://github.com/AndhikaAddiputra/logShield.git
sudo chown -R $USER:$USER /opt/logShield
cd /opt/logShield

git checkout main
npm install
```

## 6. Create `.env`

Generate three secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Create the env file:

```bash
cd /opt/logShield
nano .env
```

Use this shape. Replace all `CHANGE_*` values.

```env
NODE_ENV=production
LOG_LEVEL=info
PORT=4000

COUCHDB_URL=http://localhost:5985
COUCHDB_DB_NAME=logshield
COUCHDB_USER=admin
COUCHDB_PASSWORD=CHANGE_COUCH_ADMIN_PASSWORD

JWT_SECRET=CHANGE_RANDOM_HEX_1
AUTH_HASH_SECRET=CHANGE_RANDOM_HEX_2
ENCRYPTION_KEY=CHANGE_RANDOM_HEX_3
JWT_EXPIRY=7d

MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_STOCK_TOPIC=logshield/stock/+

AI_ENGINE_URL=http://localhost:8080

DEV_LOGIN_EMAIL=CHANGE_ADMIN_EMAIL
DEV_LOGIN_USERNAME=CHANGE_ADMIN_USERNAME
DEV_LOGIN_NIK=CHANGE_16_DIGIT_NIK
DEV_LOGIN_PASSWORD=CHANGE_ADMIN_PASSWORD

VITE_API_URL=https://api-logshield.atharizza.com
VITE_COUCHDB_URL=https://couch-logshield.atharizza.com/logshield
VITE_COUCHDB_USER=CHANGE_ADMIN_USERNAME
VITE_COUCHDB_PASSWORD=CHANGE_ADMIN_PASSWORD
```

Important:

```text
Host scripts use: COUCHDB_URL=http://localhost:5985
Host scripts use: AI_ENGINE_URL=http://localhost:8080
Backend container uses: COUCHDB_URL=http://couchdb:5984
Backend container uses: AI_ENGINE_URL=http://ai-engine:8000
```

## 7. Create Full VPS Compose

Do not stack `docker-compose.dev.yml` with an override on this VPS. Use one full compose file so ports are not duplicated.

```bash
nano infrastructure/docker-compose.vps.full.yml
```

Paste:

```yaml
services:
  couchdb:
    image: couchdb:3
    container_name: logshield-couchdb
    ports:
      - "127.0.0.1:5985:5984"
    environment:
      COUCHDB_USER: ${COUCHDB_USER}
      COUCHDB_PASSWORD: ${COUCHDB_PASSWORD}
    volumes:
      - couchdb_data:/opt/couchdb/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@localhost:5984/_up"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - logshield_network
    restart: unless-stopped

  mosquitto:
    image: eclipse-mosquitto:2
    container_name: logshield-mosquitto
    ports:
      - "1883:1883"
      - "127.0.0.1:9001:9001"
    environment:
      ALLOW_ANONYMOUS: "true"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
      - mosquitto_data:/mosquitto/data
      - mosquitto_logs:/mosquitto/log
    healthcheck:
      test: ["CMD-SHELL", "mosquitto_sub -h localhost -t '$$SYS/broker/version' -C 1 -i healthcheck -W 3 >/dev/null"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - logshield_network
    restart: unless-stopped

  ai-engine:
    build:
      context: ../
      dockerfile: apps/ai-engine/Dockerfile
    container_name: logshield-ai-engine
    ports:
      - "127.0.0.1:8080:8000"
    networks:
      - logshield_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=5)\""]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

  backend:
    build:
      context: ../
      dockerfile: apps/server-backend/Dockerfile
    container_name: logshield-backend
    ports:
      - "127.0.0.1:4000:4000"
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      LOG_LEVEL: ${LOG_LEVEL:-info}
      PORT: 4000

      COUCHDB_URL: http://couchdb:5984
      COUCHDB_DB_NAME: ${COUCHDB_DB_NAME}
      COUCHDB_USER: ${COUCHDB_USER}
      COUCHDB_PASSWORD: ${COUCHDB_PASSWORD}

      JWT_SECRET: ${JWT_SECRET}
      AUTH_HASH_SECRET: ${AUTH_HASH_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      JWT_EXPIRY: ${JWT_EXPIRY:-7d}

      MQTT_BROKER_URL: mqtt://mosquitto:1883
      MQTT_STOCK_TOPIC: ${MQTT_STOCK_TOPIC:-logshield/stock/+}
      MQTT_USER: ${MQTT_USER:-}
      MQTT_PASSWORD: ${MQTT_PASSWORD:-}

      AI_ENGINE_URL: http://ai-engine:8000

      DEV_LOGIN_EMAIL: ${DEV_LOGIN_EMAIL}
      DEV_LOGIN_USERNAME: ${DEV_LOGIN_USERNAME}
      DEV_LOGIN_NIK: ${DEV_LOGIN_NIK}
      DEV_LOGIN_PASSWORD: ${DEV_LOGIN_PASSWORD}
    depends_on:
      couchdb:
        condition: service_healthy
      mosquitto:
        condition: service_healthy
      ai-engine:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
    networks:
      - logshield_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "node -e \"fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  logshield_network:
    driver: bridge

volumes:
  couchdb_data:
  mosquitto_data:
  mosquitto_logs:
```

## 8. Clean Old LogShield Containers

```bash
docker rm -f logshield-ai-engine logshield-backend logshield-couchdb logshield-mosquitto 2>/dev/null || true
```

Check ports:

```bash
sudo ss -ltnp | grep -E ':4000|:5984|:5985|:8000|:8080|:1883|:9001' || true
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

## 9. Start LogShield Stack

```bash
cd /opt/logShield

docker compose \
  --env-file .env \
  -f infrastructure/docker-compose.vps.full.yml \
  up -d --build
```

Expected:

```text
logshield-backend      127.0.0.1:4000->4000
logshield-couchdb      127.0.0.1:5985->5984
logshield-mosquitto    0.0.0.0:1883->1883, 127.0.0.1:9001->9001
logshield-ai-engine    127.0.0.1:8080->8000
```

Health:

```bash
curl http://localhost:8080/health
curl http://admin:CHANGE_COUCH_ADMIN_PASSWORD@localhost:5985/_up
curl http://localhost:4000/api/health
```

## 10. Bootstrap Database And Admin

Use `--env-file=.env`; plain `node -e` does not load `.env`.

```bash
node --env-file=.env -e "import('./apps/server-backend/src/couchdb.js').then(async ({bootstrapDatabase}) => { console.log(JSON.stringify(await bootstrapDatabase(), null, 2)); })"

node --env-file=.env -e "import('./apps/server-backend/src/auth.js').then(async ({ensureDevAdmin}) => { console.log(JSON.stringify(await ensureDevAdmin(), null, 2)); })"
```

## 11. Set CouchDB CORS

```bash
COUCH_PASS="CHANGE_COUCH_ADMIN_PASSWORD"

curl -X PUT "http://admin:$COUCH_PASS@localhost:5985/_node/_local/_config/chttpd/enable_cors" \
  -H "Content-Type: application/json" \
  -d '"true"'

curl -X PUT "http://admin:$COUCH_PASS@localhost:5985/_node/_local/_config/cors/origins" \
  -H "Content-Type: application/json" \
  -d '"https://mobile-logshield.atharizza.com,https://logshield.atharizza.com"'

curl -X PUT "http://admin:$COUCH_PASS@localhost:5985/_node/_local/_config/cors/credentials" \
  -H "Content-Type: application/json" \
  -d '"true"'

curl -X PUT "http://admin:$COUCH_PASS@localhost:5985/_node/_local/_config/cors/methods" \
  -H "Content-Type: application/json" \
  -d '"GET, PUT, POST, HEAD, DELETE"'

curl -X PUT "http://admin:$COUCH_PASS@localhost:5985/_node/_local/_config/cors/headers" \
  -H "Content-Type: application/json" \
  -d '"accept, authorization, content-type, origin, referer"'
```

## 12. Build Web Dashboard

```bash
cd /opt/logShield

VITE_API_URL=https://api-logshield.atharizza.com \
npm run build -w @log-shield/web-dashboard

sudo mkdir -p /var/www/logshield-web
sudo rsync -av --delete apps/web-dashboard/dist/ /var/www/logshield-web/
```

## 13. Build Mobile PWA

```bash
VITE_API_URL=https://api-logshield.atharizza.com \
VITE_COUCHDB_URL=https://couch-logshield.atharizza.com/logshield \
VITE_COUCHDB_USER=CHANGE_ADMIN_USERNAME \
VITE_COUCHDB_PASSWORD='CHANGE_ADMIN_PASSWORD' \
npm run build -w @log-shield/mobile-app

sudo mkdir -p /var/www/logshield-mobile
sudo rsync -av --delete apps/mobile-app/dist/ /var/www/logshield-mobile/
```

## 14. Route Through Existing Caddy

The old project runs `secure-chat-caddy`, which owns public `80` and `443`.

Find the old project Caddyfile path:

```bash
docker inspect secure-chat-caddy \
  --format '{{ range .Mounts }}{{ .Source }} -> {{ .Destination }}{{ println }}{{ end }}'
```

Go to the source folder that contains `Caddyfile`:

```bash
cd /path/from/inspect
nano Caddyfile
```

Use this shape, keeping the old secure-chat route:

```caddy
{
  email admin@atharizza.com
}

20.2.249.137.nip.io {
  reverse_proxy frontend:80
  encode gzip
}

api-logshield.atharizza.com {
  reverse_proxy logshield-backend:4000
  encode gzip
}

couch-logshield.atharizza.com {
  reverse_proxy logshield-couchdb:5984
  encode gzip
}

logshield.atharizza.com {
  root * /srv/logshield-web
  try_files {path} /index.html
  file_server
  encode gzip
}

mobile-logshield.atharizza.com {
  root * /srv/logshield-mobile
  try_files {path} /index.html
  file_server
  encode gzip
}
```

Edit the old project's `docker-compose.yml`. Under `caddy.volumes`, add:

```yaml
      - /var/www/logshield-web:/srv/logshield-web:ro
      - /var/www/logshield-mobile:/srv/logshield-mobile:ro
```

Restart only Caddy from the old project folder:

```bash
docker compose up -d caddy
```

Connect Caddy to the LogShield Docker network:

```bash
docker network connect infrastructure_logshield_network secure-chat-caddy 2>/dev/null || true
```

Validate and reload:

```bash
docker exec secure-chat-caddy caddy validate --config /etc/caddy/Caddyfile
docker exec secure-chat-caddy caddy reload --config /etc/caddy/Caddyfile
```
## 15. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 1883/tcp
sudo ufw enable
sudo ufw status
```

`1883` is public MQTT for ESP32. For a real production deployment, add MQTT credentials or put the device behind VPN.

## 16. Verify Both Projects Run Together

```bash
echo "=== Containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo
echo "=== Ports ==="
sudo ss -ltnp | grep -E ':80|:443|:3000|:4000|:5985|:8080|:1883|:9001' || true

echo
echo "=== Old secure-chat backend ==="
curl -sS http://localhost:3000/health || true

echo
echo "=== LogShield backend ==="
curl -sS http://localhost:4000/api/health || true

echo
echo "=== LogShield AI ==="
curl -sS http://localhost:8080/health || true

echo
echo "=== LogShield Couch ==="
curl -sS http://admin:CHANGE_COUCH_ADMIN_PASSWORD@localhost:5985/_up || true
```

Expected:

```text
secure-chat-caddy      healthy, owns 80/443
secure-chat-frontend   healthy
secure-chat-backend    healthy, owns 3000
logshield-backend      healthy, 127.0.0.1:4000
logshield-couchdb      healthy, 127.0.0.1:5985
logshield-mosquitto    healthy, 0.0.0.0:1883
logshield-ai-engine    healthy, 127.0.0.1:8080
```

## 17. Public Checks

```bash
curl https://api-logshield.atharizza.com/api/health
curl https://api-logshield.atharizza.com/api/couchdb/health
curl https://couch-logshield.atharizza.com/_up
```

Open:

```text
https://logshield.atharizza.com
https://mobile-logshield.atharizza.com
```

## 18. ESP32 MQTT

Firmware:

```cpp
const char* MQTT_BROKER = "atharizza.com";
const int MQTT_PORT = 1883;
```

Watch messages:

```bash
docker exec -it logshield-mosquitto mosquitto_sub -h localhost -t "logshield/#" -v
```

Check stored readings after login:

```bash
curl "https://api-logshield.atharizza.com/api/stock-readings?node_id=NODE-01&limit=5" \
  -H "Authorization: Bearer YOUR_LOGIN_TOKEN"
```

## 19. Update LogShield Later

```bash
cd /opt/logShield
git pull origin main
npm install

docker compose \
  --env-file .env \
  -f infrastructure/docker-compose.vps.full.yml \
  up -d --build

VITE_API_URL=https://api-logshield.atharizza.com \
npm run build -w @log-shield/web-dashboard

sudo rsync -av --delete apps/web-dashboard/dist/ /var/www/logshield-web/

VITE_API_URL=https://api-logshield.atharizza.com \
VITE_COUCHDB_URL=https://couch-logshield.atharizza.com/logshield \
VITE_COUCHDB_USER=CHANGE_ADMIN_USERNAME \
VITE_COUCHDB_PASSWORD='CHANGE_ADMIN_PASSWORD' \
npm run build -w @log-shield/mobile-app

sudo rsync -av --delete apps/mobile-app/dist/ /var/www/logshield-mobile/

docker exec secure-chat-caddy caddy reload --config /etc/caddy/Caddyfile
```
