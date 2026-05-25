# LogShield Newest Full Test Guide

This guide is for testing the newest `cobaan-v2` version from a clean local database, including backend, web dashboard, mobile app, AI, and the new offline-first mobile outbox.

Use the command block for your operating system. Windows examples use PowerShell; macOS/Linux examples use a normal shell.

Windows PowerShell:

```powershell
cd "C:\Users\Atharizza MA\Documents\logShield"
```

macOS/Linux:

```bash
cd ~/Documents/logShield
```

Default logins:

```text
Admin app login: athar@athar.com / atharathar
CouchDB login: admin / password
```

Default local URLs:

```text
Backend: http://localhost:4000
AI engine: http://localhost:8000
CouchDB: http://localhost:5984/_utils
Web dashboard: http://localhost:5173
Mobile app: http://localhost:5174
```

## 1. Pull Latest Branch

From the project root.

Windows PowerShell:

```powershell
git checkout cobaan-v2
git pull origin cobaan-v2
npm install
```

macOS/Linux:

```bash
git checkout cobaan-v2
git pull origin cobaan-v2
npm install
```

If `npm install` changes `package-lock.json`, that is expected when dependencies changed.

## 2. Start From Empty Database

This deletes local Docker database volumes. Only do this when you want a clean test.

Windows PowerShell:

```powershell
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml down -v
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml up -d --build
```

macOS/Linux:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml down -v
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml up -d --build
```

Expected containers:

```text
logshield-couchdb
logshield-mosquitto
logshield-ai-engine
logshield-backend
```

## 3. Bootstrap CouchDB And Dev Admin

Do not use `POST /api/couchdb/bootstrap`; this branch uses direct Node bootstrap.

Windows PowerShell:

```powershell
node -e "import('./apps/server-backend/src/couchdb.js').then(async ({bootstrapDatabase}) => { console.log(JSON.stringify(await bootstrapDatabase(), null, 2)); })"
node -e "import('./apps/server-backend/src/auth.js').then(async ({ensureDevAdmin}) => { console.log(JSON.stringify(await ensureDevAdmin(), null, 2)); })"
```

macOS/Linux:

```bash
node -e "import('./apps/server-backend/src/couchdb.js').then(async ({bootstrapDatabase}) => { console.log(JSON.stringify(await bootstrapDatabase(), null, 2)); })"
node -e "import('./apps/server-backend/src/auth.js').then(async ({ensureDevAdmin}) => { console.log(JSON.stringify(await ensureDevAdmin(), null, 2)); })"
```

This creates:

- `logshield` CouchDB database
- indexes
- CouchDB CORS/sync user
- local dev admin account

## 4. Health Checks

Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
Invoke-RestMethod http://localhost:4000/api/couchdb/health
Invoke-RestMethod http://localhost:8000/health
```

macOS/Linux:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/couchdb/health
curl http://localhost:8000/health
```

Expected:

- backend `ok: True`
- CouchDB `status: ok`
- AI engine `status: ok`

## 5. Get Admin API Token

Windows PowerShell:

```powershell
$loginBody = @{
  identifier = "athar@athar.com"
  password = "atharathar"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method POST http://localhost:4000/api/auth/login `
  -ContentType "application/json" `
  -Body $loginBody

$headers = @{ Authorization = "Bearer $($login.token)" }
$login.user
```

macOS/Linux:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"athar@athar.com","password":"atharathar"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0, 'utf8')).token")

echo "$TOKEN"
```

Use `$headers` on Windows or `$TOKEN` on macOS/Linux for protected API checks.

## 6. Seed Stock Data

The sensor endpoint needs `weight_delta_g`; `weight_g` alone is not enough.

Windows PowerShell:

```powershell
Invoke-RestMethod -Method POST http://localhost:4000/api/stock-readings `
  -ContentType "application/json" `
  -Body '{"warehouse_id":"WH-JKT-001","commodity":"beras","weight_g":250000,"weight_delta_g":250000,"unit":"kg","node_id":"node-test-1","battery_mv":4100,"rssi":-55,"uptime_s":120,"sample_count":15}'

Invoke-RestMethod http://localhost:4000/api/stock-readings -Headers $headers
Invoke-RestMethod http://localhost:4000/api/stocks/categories -Headers $headers
Invoke-RestMethod http://localhost:4000/api/stocks/summary -Headers $headers
```

macOS/Linux:

```bash
curl -X POST http://localhost:4000/api/stock-readings \
  -H "Content-Type: application/json" \
  -d '{"warehouse_id":"WH-JKT-001","commodity":"beras","weight_g":250000,"weight_delta_g":250000,"unit":"kg","node_id":"node-test-1","battery_mv":4100,"rssi":-55,"uptime_s":120,"sample_count":15}'

curl http://localhost:4000/api/stock-readings -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/stocks/categories -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/stocks/summary -H "Authorization: Bearer $TOKEN"
```

Expected:

- stock reading is created
- `asset::WH-JKT-001::beras` exists
- stock categories respond

## 7. Start Web Dashboard

Use the app folder, not the root script, so Vite does not treat host/port as paths.

Open a new terminal.

Windows PowerShell:

```powershell
cd "C:\Users\Atharizza MA\Documents\logShield\apps\web-dashboard"
npm run dev -- --host 0.0.0.0 --port 5173
```

macOS/Linux:

```bash
cd ~/Documents/logShield/apps/web-dashboard
npm run dev -- --host 0.0.0.0 --port 5173
```

Open:

```text
http://localhost:5173
```

Login:

```text
athar@athar.com
atharathar
```

## 8. Start Mobile App

For normal online feature testing, dev mode is fine.

Open another terminal.

Windows PowerShell:

```powershell
cd "C:\Users\Atharizza MA\Documents\logShield\apps\mobile-app"
npm run dev -- --host 0.0.0.0 --port 5174
```

macOS/Linux:

```bash
cd ~/Documents/logShield/apps/mobile-app
npm run dev -- --host 0.0.0.0 --port 5174
```

Open:

```text
http://localhost:5174
```

For the offline-first/PWA test, use the special section below. Offline PWA behavior should be tested with `build` + `preview`, not `dev`.

## 9. Create Base Data On Web

In the web dashboard as admin:

1. Open `Posko`.
2. Create one posko.
3. Use a valid 16-digit KIB if needed:

```text
1234567890123456
```

4. Fill name, address, district, province, and demographic fields.
5. Save.
6. Open `Assets` and confirm `beras` exists from the seeded stock reading.

API check.

Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:4000/api/poskos -Headers $headers
```

macOS/Linux:

```bash
curl http://localhost:4000/api/poskos -H "Authorization: Bearer $TOKEN"
```

## 10. Create And Approve Field Account

Open:

```text
http://localhost:5173/signup
```

Create a field user:

```text
email: field1@test.com
name: Field Tester
nik: 1111222233334444
password: password123
phone: 081234567890
```

Then in the web dashboard as admin:

1. Open `Personnel`.
2. Find the pending signup request.
3. Approve it.
4. Assign role:

```text
lapangan
```

5. Assign the posko created earlier.
6. Save.

## 11. Mobile Online Feature Flow

Open:

```text
http://localhost:5174
```

Login:

```text
field1@test.com
password123
```

Then test:

1. Tap `Mulai`.
2. Open `Dashboard`.
3. Edit `Data Pengungsi`, save, and confirm success.
4. Check AI prediction categories.
5. Open one AI category and submit an AI quick request with `Minta`.
6. Open `Logistik`.
7. Tap `Tambah Sumber Daya` and submit a manual request.
8. Return to `Dashboard`.
9. Tap `Lapor!` and submit an anomaly report.
10. Open `Profil` and verify user, role, KIB, and posko.

## 12. Verify Mobile Data On Web

Back in web dashboard:

1. Open `Posko` and confirm demographic changes.
2. Open request/logistics management and confirm mobile requests appear.
3. Process a request.
4. Complete the request.
5. Confirm stock is deducted when request completes.
6. Open anomalies/incident page and confirm the mobile anomaly appears.
7. Update anomaly status.
8. Open `Personnel` and confirm the field user exists.
9. Open `Settings` and lightly check profile/settings pages.

## 13. AI Endpoint Checks

Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:4000/api/ai/summary
Invoke-RestMethod http://localhost:4000/api/ai/models/current
Invoke-RestMethod "http://localhost:4000/api/ai/dashboard?limit=20"
Invoke-RestMethod "http://localhost:4000/api/ai/recommendations/top-critical?limit=20"
Invoke-RestMethod -Method POST "http://localhost:4000/api/ai/sync?limit=50" -Headers $headers
```

macOS/Linux:

```bash
curl http://localhost:4000/api/ai/summary
curl http://localhost:4000/api/ai/models/current
curl "http://localhost:4000/api/ai/dashboard?limit=20"
curl "http://localhost:4000/api/ai/recommendations/top-critical?limit=20"
curl -X POST "http://localhost:4000/api/ai/sync?limit=50" -H "Authorization: Bearer $TOKEN"
```

To infer for a real posko:

Windows PowerShell:

```powershell
$poskos = Invoke-RestMethod http://localhost:4000/api/poskos -Headers $headers
$poskoId = $poskos.rows[0]._id
Invoke-RestMethod -Method POST "http://localhost:4000/api/ai/infer/posko/$poskoId" -Headers $headers
```

macOS/Linux:

```bash
POSKO_ID=$(curl -s http://localhost:4000/api/poskos \
  -H "Authorization: Bearer $TOKEN" \
  | node -pe "JSON.parse(require('fs').readFileSync(0, 'utf8')).rows[0]._id")

curl -X POST "http://localhost:4000/api/ai/infer/posko/$POSKO_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Do not literally use `YOUR_POSKO_ID`; use a real `_id` from `/api/poskos`.

## 14. Special Offline-First Test

Use this section to test the new mobile offline outbox. This must use production preview because service workers/PWA caching are production-build behavior.

### 14.1 Stop Mobile Dev Server

If `npm run dev` is running for mobile, press:

```text
Ctrl + C
```

### 14.2 Build And Preview Mobile PWA

From the project root.

Windows PowerShell:

```powershell
npm run build -w @log-shield/mobile-app
npm run preview -w @log-shield/mobile-app -- --host 0.0.0.0 --port 5174
```

macOS/Linux:

```bash
npm run build -w @log-shield/mobile-app
npm run preview -w @log-shield/mobile-app -- --host 0.0.0.0 --port 5174
```

Open:

```text
http://localhost:5174
```

### 14.3 Clear Old Browser State

Do this when testing offline changes, because an old service worker can keep serving old code.

In Chrome DevTools:

1. Open `Application`.
2. Open `Service Workers`.
3. Click `Unregister`.
4. Open `Storage`.
5. Click `Clear site data`.
6. Hard refresh `http://localhost:5174`.

### 14.4 Online Warm-Up

Keep DevTools Network set to:

```text
No throttling
```

Then:

1. Login as the approved field user.
2. Wait for `Dashboard` to fully load.
3. Open `Logistik` once.
4. Open `Profil` once.
5. Return to `Dashboard`.

This caches:

- login session in localStorage
- posko/profile snapshots
- AI recommendation snapshot
- request list snapshot
- PouchDB outbox database

### 14.5 Confirm Local Storage And PouchDB

DevTools -> `Application`:

Check `Local storage` for:

```text
logshield_token
logshield_user
```

Check `IndexedDB` for:

```text
_pouch_logshield_field_local
```

Optional console check:

```js
const db = new PouchDB("logshield_field_local");
await db.info();
await db.allDocs({ include_docs: true, limit: 20 });
```

### 14.6 Go Offline

DevTools -> `Network` -> choose:

```text
Offline
```

Then refresh the page.

Expected:

- App shell still loads.
- Saved session lets the user enter without online login.
- Dashboard uses cached posko/profile/AI data.
- Logistik uses cached request list plus local pending requests.
- Some first failed fetches may appear if Chrome reports online too early, but the app marks itself offline after network failure and falls back to cache.

### 14.7 Create Offline Manual Request

While still offline:

1. Open `Logistik`.
2. Tap `Tambah Sumber Daya`.
3. Choose a commodity and unit.
4. Submit.

Expected:

- Alert says request is saved offline.
- Request history shows `Menunggu Sinkron`.
- Header/pending badge count increases.

### 14.8 Create Offline AI Quick Request

While offline:

1. Open `Dashboard`.
2. Open an AI recommendation category.
3. Tap `Minta`.
4. Submit the request.

Expected:

- Request is saved offline.
- Pending count increases.
- It appears in `Logistik` as pending.

If there are no cached AI recommendation items, go online, run AI sync/infer, open dashboard once, then go offline again.

### 14.9 Create Offline Anomaly Report

While offline:

1. Open `Dashboard`.
2. Tap `Lapor!`.
3. Fill title, severity, description, and optional location.
4. Submit.

Expected:

- Report is saved offline.
- Pending count increases.

### 14.10 Edit Demographics Offline

While offline:

1. Open `Dashboard`.
2. Tap `Edit` on `Data Pengungsi`.
3. Change counts.
4. Save.

Expected:

- UI updates immediately.
- Message says data is saved offline.
- Pending count increases.

### 14.11 Edit Assets Offline

If the mobile asset page is reachable:

1. Open asset/logistics asset view.
2. Edit category or threshold.
3. Save.

Expected:

- Change is queued offline.
- Pending count increases.

### 14.12 Reconnect And Sync

DevTools -> `Network` -> choose:

```text
No throttling
```

Wait up to 15 seconds.

Expected:

- Pending count decreases.
- Failed count stays `0`.
- Offline requests appear in backend/web dashboard.
- Offline anomaly appears in backend/web dashboard.
- Offline demographic edit appears on web posko page.

If a failed count appears, click the failed/retry badge in the mobile header.

### 14.13 Verify Synced Data

Verify through the API.

Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:4000/api/requests -Headers $headers
Invoke-RestMethod http://localhost:4000/api/anomalies -Headers $headers
Invoke-RestMethod http://localhost:4000/api/poskos -Headers $headers
```

macOS/Linux:

```bash
curl http://localhost:4000/api/requests -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/anomalies -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/poskos -H "Authorization: Bearer $TOKEN"
```

Expected:

- Each offline action syncs once.
- No duplicate request is created from replay.
- Backend accepts repeated `client_mutation_id` as idempotent.

## 15. Common Problems

### Vite 404 On Web Dashboard

If `http://localhost:5173` returns 404, restart from the web app folder.

Windows PowerShell:

```powershell
cd "C:\Users\Atharizza MA\Documents\logShield\apps\web-dashboard"
npm run dev -- --host 0.0.0.0 --port 5173
```

macOS/Linux:

```bash
cd ~/Documents/logShield/apps/web-dashboard
npm run dev -- --host 0.0.0.0 --port 5173
```

### Mobile Still Runs Old Offline Code

Clear old PWA cache:

1. DevTools -> `Application`.
2. `Service Workers` -> `Unregister`.
3. `Storage` -> `Clear site data`.
4. Stop preview server.
5. Rebuild and preview again.

Windows PowerShell:

```powershell
npm run build -w @log-shield/mobile-app
npm run preview -w @log-shield/mobile-app -- --host 0.0.0.0 --port 5174
```

macOS/Linux:

```bash
npm run build -w @log-shield/mobile-app
npm run preview -w @log-shield/mobile-app -- --host 0.0.0.0 --port 5174
```

### Missing Bearer Token

Protected endpoints need auth.

Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:4000/api/requests -Headers $headers
```

macOS/Linux:

```bash
curl http://localhost:4000/api/requests -H "Authorization: Bearer $TOKEN"
```

### Stock Reading Validation Error

Make sure the payload includes:

```text
warehouse_id
commodity
weight_g
weight_delta_g
unit
node_id
battery_mv
rssi
uptime_s
sample_count
```

### Docker Broken Or Backend Not Reachable

Check.

Windows PowerShell:

```powershell
docker --version
docker compose version
docker ps
Invoke-RestMethod http://localhost:4000/api/health
```

macOS/Linux:

```bash
docker --version
docker compose version
docker ps
curl http://localhost:4000/api/health
```

If Docker service is stopped on Windows, use Administrator PowerShell:

```powershell
Start-Service com.docker.service
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### Rebuild Backend After Code Changes

All platforms:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml up -d --build backend
```

## 16. Stop Everything

Stop containers but keep database volume.

All platforms:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml down
```

Stop containers and delete local database:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml down -v
```
