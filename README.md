# LogShield

LogShield is an AI and IoT assisted humanitarian logistics platform for disaster response operations. It connects field officers, coordinators, warehouse stock monitoring, AI demand recommendations, anomaly reporting, and offline-first mobile workflows into one operational system.

## Release Scope

This release includes:

- Web dashboard for coordinators and administrators.
- Mobile field app with PWA support and Android APK build support through Capacitor.
- Node.js backend API with JWT authentication and CouchDB persistence.
- CouchDB-backed sync data model for field operations.
- AI engine for forecasting, recommendations, anomaly outputs, and posko inference.
- MQTT stock ingestion for ESP32 load-cell nodes.
- Offline-first mobile outbox for field requests, anomaly reports, demographic edits, and supported stock edits.
- VPS deployment guide, Caddy routing notes, IoT setup guide, and Deliverable 4 artifact.

## Applications

| App | Workspace | Purpose |
| --- | --- | --- |
| Web dashboard | `apps/web-dashboard` | Coordinator/admin console for posko, personnel, stock, requests, anomalies, settings, and AI views. |
| Mobile app | `apps/mobile-app` | Field officer app for posko updates, logistics requests, AI quick requests, anomaly reports, offline queueing, and APK builds. |
| Backend | `apps/server-backend` | REST API, auth, CouchDB access, MQTT ingestion, stock movement logic, and AI proxy/sync endpoints. |
| AI engine | `apps/ai-engine` | Forecasting, recommendations, anomaly datasets, model status, and inference services. |
| Firmware | `firmware/esp32-loadcell` | ESP32 + HX711 load-cell firmware that publishes stock readings over MQTT. |

## Main URLs

Local development defaults:

```text
Backend: http://localhost:4000
AI engine: http://localhost:8000
CouchDB: http://localhost:5984/_utils
Web dashboard: http://localhost:5173
Mobile app: http://localhost:5174
```

VPS deployment defaults:

```text
Web dashboard: https://logshield.atharizza.com
Mobile app: https://mobile-logshield.atharizza.com
Backend API: https://api-logshield.atharizza.com
CouchDB sync: https://couch-logshield.atharizza.com/logshield
MQTT broker: mqtt-logshield.atharizza.com:1883
```

## Quick Start

Install dependencies:

```powershell
npm install
```

Start local Docker services:

```powershell
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml up -d --build
```

Bootstrap CouchDB and the development admin:

```powershell
node -e "import('./apps/server-backend/src/couchdb.js').then(async ({bootstrapDatabase}) => { console.log(JSON.stringify(await bootstrapDatabase(), null, 2)); })"
node -e "import('./apps/server-backend/src/auth.js').then(async ({ensureDevAdmin}) => { console.log(JSON.stringify(await ensureDevAdmin(), null, 2)); })"
```

Run the web dashboard:

```powershell
cd apps\web-dashboard
npm run dev -- --host 0.0.0.0 --port 5173
```

Run the mobile app:

```powershell
cd apps\mobile-app
npm run dev -- --host 0.0.0.0 --port 5174
```

For the complete clean-database test flow, use [Final_Guide.md](Final_Guide.md).

## Environment

Required backend values:

```env
NODE_ENV=production
PORT=4000
COUCHDB_URL=http://localhost:5984
COUCHDB_DB_NAME=logshield
COUCHDB_USER=admin
COUCHDB_PASSWORD=change-me
JWT_SECRET=change-me
AUTH_HASH_SECRET=change-me
ENCRYPTION_KEY=32-byte-or-64-hex-secret
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USER=logshield_iot
MQTT_PASSWORD=change-me
AI_ENGINE_URL=http://localhost:8000
```

Required frontend build values:

```env
VITE_API_URL=http://localhost:4000
VITE_COUCHDB_URL=http://localhost:5984/logshield
VITE_COUCHDB_USER=athar
VITE_COUCHDB_PASSWORD=change-me
```

## Android APK

Build the mobile web bundle, sync Capacitor, then assemble the APK:

```powershell
npm run build -w @log-shield/mobile-app
cd apps\mobile-app
npx cap sync android
cd android
.\gradlew assembleDebug
```

Debug APK output:

```text
apps/mobile-app/android/app/build/outputs/apk/debug/app-debug.apk
```

The Android SDK must include platform tools, Android platform 34, and build tools 34.0.0.

## IoT Stock Ingestion

The ESP32 firmware publishes readings to MQTT topics shaped like:

```text
logshield/warehouse/{warehouse_id}/scale/{node_id}/reading
```

Backend ingestion subscribes to:

```text
logshield/stock/+
logshield/warehouse/+/scale/+/reading
```

For the full laptop-to-VPS firmware and MQTT flow, use [IoT_setup.md](IoT_setup.md).

## Validation

Useful checks before a release commit:

```powershell
node --check apps/server-backend/src/config.js
node --check apps/server-backend/src/mqtt.js
npm run build -w @log-shield/mobile-app
npm run build -w @log-shield/web-dashboard
```

Backend health endpoints:

```text
GET /api/health
GET /api/couchdb/health
GET /api/ai/summary
```

## Documentation

- [Final_Guide.md](Final_Guide.md): full Linux/VPS and system testing flow.
- [IoT_setup.md](IoT_setup.md): MQTT and ESP32 setup flow.
- `Kelompok_09_Deliverable_4_LogShield.pdf`: release deliverable artifact.

## Notes

- Backend remains the source of truth once the mobile app reconnects.
- Offline mobile behavior is implemented with PouchDB/IndexedDB and an outbox, not by running the backend inside the browser.
- AI inference is online-only in this release.
- MQTT on VPS is authenticated; local firmware credentials are for testing and should be rotated before real deployment.
