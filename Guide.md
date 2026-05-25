# LogShield Local Run Guide

This guide is for running the current `cobaan` branch from a fresh local database on Windows, macOS, or Linux.

The older `POST /api/couchdb/bootstrap` endpoint is not available on this branch. Use the direct Node bootstrap commands below.

## 1. Requirements

Install these first:

- Docker Desktop or Docker Engine
- Node.js 20 or newer
- Git
- A terminal: PowerShell on Windows, Terminal on macOS/Linux

Default local ports:

- Backend API: `4000`
- CouchDB: `5984`
- MQTT broker: `1883`
- AI engine: `8000`
- Web dashboard: `5173`
- Mobile web app: `5174`

Default admin login:

```text
athar@athar.com
atharathar
```

Default CouchDB admin login:

```text
admin
password
```

## 2. Open The Project Folder

Windows PowerShell:

```powershell
cd "C:\Users\Atharizza MA\Documents\logShield"
```

macOS/Linux Terminal:

```bash
cd ~/Documents/logShield
```

If your folder is somewhere else, replace the path with your actual project folder.

## 3. Install Dependencies

All platforms:

```bash
npm install
```

If this is a fresh clone, create the local environment file.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux Terminal:

```bash
cp .env.example .env
```

## 4. Start From A Fresh Database

This removes the local Docker database volume. Only run this when you want a clean database.

Windows PowerShell:

```powershell
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml down -v
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml up -d --build
```

macOS/Linux Terminal:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml down -v
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml up -d --build
```

Expected containers:

- `logshield-couchdb`
- `logshield-mosquitto`
- `logshield-ai-engine`
- `logshield-backend`

## 5. Bootstrap CouchDB And Dev Admin

Do not use `POST /api/couchdb/bootstrap` on this branch. The route is not registered.

Run these from the project root.

Windows PowerShell:

```powershell
node -e "import('./apps/server-backend/src/couchdb.js').then(async ({bootstrapDatabase}) => { console.log(JSON.stringify(await bootstrapDatabase(), null, 2)); })"
node -e "import('./apps/server-backend/src/auth.js').then(async ({ensureDevAdmin}) => { console.log(JSON.stringify(await ensureDevAdmin(), null, 2)); })"
```

macOS/Linux Terminal:

```bash
node -e "import('./apps/server-backend/src/couchdb.js').then(async ({bootstrapDatabase}) => { console.log(JSON.stringify(await bootstrapDatabase(), null, 2)); })"
node -e "import('./apps/server-backend/src/auth.js').then(async ({ensureDevAdmin}) => { console.log(JSON.stringify(await ensureDevAdmin(), null, 2)); })"
```

This creates or updates:

- `logshield` database
- CouchDB indexes
- CouchDB CORS and sync user
- Local dev admin app user

## 6. Health Checks

Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
Invoke-RestMethod http://localhost:4000/api/couchdb/health
Invoke-RestMethod http://localhost:8000/health
```

macOS/Linux Terminal:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/couchdb/health
curl http://localhost:8000/health
```

CouchDB web UI:

```text
http://localhost:5984/_utils
```

Login with:

```text
admin
password
```

## 7. Get An Admin Token For API Checks

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

macOS/Linux Terminal:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"athar@athar.com","password":"atharathar"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).token")

echo "$TOKEN"
```

Use this token for protected API requests.

## 8. Seed One Stock Reading

The stock-reading endpoint simulates an IoT scale reading. It requires sensor fields such as `weight_delta_g` and `uptime_s`.

Windows PowerShell:

```powershell
Invoke-RestMethod -Method POST http://localhost:4000/api/stock-readings `
  -ContentType "application/json" `
  -Body '{"warehouse_id":"WH-JKT-001","commodity":"beras","weight_g":250000,"weight_delta_g":250000,"unit":"kg","node_id":"node-test-1","battery_mv":4100,"rssi":-55,"uptime_s":120,"sample_count":15}'

Invoke-RestMethod http://localhost:4000/api/stock-readings -Headers $headers
Invoke-RestMethod http://localhost:4000/api/stocks/categories -Headers $headers
Invoke-RestMethod http://localhost:4000/api/stocks/summary -Headers $headers
```

macOS/Linux Terminal:

```bash
curl -X POST http://localhost:4000/api/stock-readings \
  -H "Content-Type: application/json" \
  -d '{"warehouse_id":"WH-JKT-001","commodity":"beras","weight_g":250000,"weight_delta_g":250000,"unit":"kg","node_id":"node-test-1","battery_mv":4100,"rssi":-55,"uptime_s":120,"sample_count":15}'

curl http://localhost:4000/api/stock-readings -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/stocks/categories -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/stocks/summary -H "Authorization: Bearer $TOKEN"
```

## 9. Start The Web Dashboard

Important: run this from the web app folder. Passing `--host` and `--port` through the root workspace script can make Vite treat them as file paths and return a 404.

Windows PowerShell:

```powershell
cd "C:\Users\Atharizza MA\Documents\logShield\apps\web-dashboard"
npm run dev -- --host 0.0.0.0 --port 5173
```

macOS/Linux Terminal:

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

## 10. Start The Mobile Web App

Open another terminal and run this from the mobile app folder.

Windows PowerShell:

```powershell
cd "C:\Users\Atharizza MA\Documents\logShield\apps\mobile-app"
npm run dev -- --host 0.0.0.0 --port 5174
```

macOS/Linux Terminal:

```bash
cd ~/Documents/logShield/apps/mobile-app
npm run dev -- --host 0.0.0.0 --port 5174
```

Open:

```text
http://localhost:5174
```

## 11. Create Base Data On Web

In the web dashboard as admin:

1. Open `Posko`.
2. Create one posko.
3. Use a valid 16-digit KIB if the form asks for one:

```text
1234567890123456
```

4. Fill the basic name and location fields.
5. Save.
6. Open `Assets` and verify the seeded stock item appears.

Verify poskos through the API.

Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:4000/api/poskos -Headers $headers
```

macOS/Linux Terminal:

```bash
curl http://localhost:4000/api/poskos -H "Authorization: Bearer $TOKEN"
```

## 12. Create A New Field Account

Open:

```text
http://localhost:5173/signup
```

Use:

```text
email: field1@test.com
name: Field Tester
nik: 1111222233334444
password: password123
phone: 081234567890
```

The account starts as pending.

## 13. Approve The Field Account

In the web dashboard as admin:

1. Open `Personnel`.
2. Find the pending signup request.
3. Approve it.
4. Assign:

```text
role: lapangan
kib_bencana_id: BNC-2026-JK-0001
posko: the posko you created
```

## 14. Test Mobile Features

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
3. Edit `Data Pengungsi` and save.
4. Check AI prediction categories.
5. Open one AI category and submit a quick request with `Minta`.
6. Open `Logistik`.
7. Tap `Tambah Sumber Daya` and submit a manual request.
8. Return to `Dashboard`.
9. Tap `Lapor` and submit an anomaly/incident report.
10. Open `Profil` and verify name, role, KIB, and posko.

## 15. Verify Mobile Data On Web

Back in the web dashboard:

1. Open `Dashboard` and verify overview/cards load.
2. Open `Posko` and confirm demographic data changed.
3. Open `Logistics` or request management and confirm the mobile request appears.
4. Process the request.
5. Complete the request.
6. Open `Anomalies` and confirm the mobile anomaly appears.
7. Update anomaly status.
8. Open `Assets` and confirm stock data appears.
9. Open `Personnel` and confirm the field user exists.
10. Open `Settings` and test profile or notification changes lightly.

## 16. AI Endpoint Checks

Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:4000/api/ai/summary
Invoke-RestMethod http://localhost:4000/api/ai/models/current
Invoke-RestMethod "http://localhost:4000/api/ai/recommendations/top-critical?limit=20"
Invoke-RestMethod "http://localhost:4000/api/ai/dashboard?limit=20"
Invoke-RestMethod -Method POST "http://localhost:4000/api/ai/sync?limit=50" -Headers $headers
```

macOS/Linux Terminal:

```bash
curl http://localhost:4000/api/ai/summary
curl http://localhost:4000/api/ai/models/current
curl "http://localhost:4000/api/ai/recommendations/top-critical?limit=20"
curl "http://localhost:4000/api/ai/dashboard?limit=20"
curl -X POST "http://localhost:4000/api/ai/sync?limit=50" -H "Authorization: Bearer $TOKEN"
```

## 17. PouchDB Offline-First Check

Keep the mobile app running with `npm run dev`. PouchDB runs in the browser through IndexedDB.

In the browser on `http://localhost:5174`:

1. Open DevTools.
2. Open the `Application` tab.
3. Open `IndexedDB`.
4. Look for:

```text
_pouch_logshield_field_local
```

Console check:

```js
const db = new PouchDB("logshield_field_local");
await db.info();
await db.allDocs({ include_docs: true, limit: 10 });
```

Offline simulation:

1. DevTools -> Network -> Offline.
2. Refresh mobile.
3. Check that the local PouchDB still exists.
4. Set Network back to Online.
5. Run:

```js
await new PouchDB("logshield_field_local").sync(
  "http://athar:atharathar@localhost:5984/logshield"
);
```

Current limitation: the mobile app initializes PouchDB sync, but most mobile forms still submit directly to the backend. Offline browsing and the sync base can be tested, but offline-created requests may fail until those forms write to local PouchDB first.

## 18. Common Fixes

If `http://localhost:5173` returns 404 after Vite starts, stop the server and restart it from `apps/web-dashboard`:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

If `http://localhost:5174` behaves strangely, restart it from `apps/mobile-app`:

```bash
npm run dev -- --host 0.0.0.0 --port 5174
```

If a protected API returns `Missing bearer token`, include the admin token:

Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:4000/api/stock-readings -Headers $headers
```

macOS/Linux Terminal:

```bash
curl http://localhost:4000/api/stock-readings -H "Authorization: Bearer $TOKEN"
```

If `stock-readings` rejects the payload, make sure these fields are present:

```text
warehouse_id
commodity
weight_g
weight_delta_g
node_id
battery_mv
rssi
uptime_s
sample_count
```

## 19. Stop Everything

All platforms:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml down
```

To remove all local database data too:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml down -v
```
