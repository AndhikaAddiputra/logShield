# LogShield Local Run Guide

This guide is for running LogShield on Windows, macOS, or Linux with Docker, Node.js, and Git.

## 1. Requirements

Install these first:

- Docker Desktop or Docker Engine
- Node.js 20 or newer
- Git
- A terminal: PowerShell on Windows, Terminal on macOS/Linux

Do not use ports `3000`, `80`, or `443`. This project uses:

- Backend API: `4000`
- CouchDB: `5984`
- MQTT broker: `1883`
- AI engine: `8000`
- Web dashboard: `5173`
- Mobile web app: `5174`

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

Default local CouchDB login:

```text
admin / password
```

Default app admin login:

```text
athar@athar.com / atharathar
```

## 4. Start Backend, CouchDB, MQTT, and AI Engine

All platforms:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml up -d --build
```

Check containers:

```bash
docker ps
```

Expected containers:

- `logshield-couchdb`
- `logshield-mosquitto`
- `logshield-ai-engine`
- `logshield-backend`

## 5. Bootstrap CouchDB

Run this after Docker is healthy.

Windows PowerShell:

```powershell
Invoke-RestMethod -Method POST http://localhost:4000/api/couchdb/bootstrap
```

macOS/Linux Terminal:

```bash
curl -X POST http://localhost:4000/api/couchdb/bootstrap
```

This creates or updates:

- `logshield` database
- CouchDB indexes
- local dev admin user
- CouchDB sync user

## 6. Quick Health Checks

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
admin / password
```

## 7. Start Web Dashboard

Open a new terminal in the project folder.

All platforms:

```bash
npm run dev:web -- --host 0.0.0.0 --port 5173
```

Open:

```text
http://localhost:5173
```

Login:

```text
athar@athar.com / atharathar
```

## 8. Start Mobile Web App

Open another terminal in the project folder.

All platforms:

```bash
npm run dev:mobile -- --host 0.0.0.0 --port 5174
```

Open:

```text
http://localhost:5174
```

Login:

```text
athar@athar.com / atharathar
```

If the mobile app asks for posko initialization, fill the form. `KIB 16` must be exactly 16 digits.

## 9. Test Login Manually

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

echo $TOKEN
```

## 10. Test Main APIs

Windows PowerShell:

```powershell
Invoke-RestMethod http://localhost:4000/api/poskos -Headers $headers
Invoke-RestMethod http://localhost:4000/api/stocks/summary -Headers $headers
Invoke-RestMethod http://localhost:4000/api/stocks/categories -Headers $headers
Invoke-RestMethod "http://localhost:4000/api/stocks/trend?days=7" -Headers $headers
Invoke-RestMethod http://localhost:4000/api/ai/dashboard -Headers $headers
Invoke-RestMethod http://localhost:4000/api/requests -Headers $headers
```

macOS/Linux Terminal:

```bash
curl http://localhost:4000/api/poskos -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/stocks/summary -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/stocks/categories -H "Authorization: Bearer $TOKEN"
curl "http://localhost:4000/api/stocks/trend?days=7" -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/ai/dashboard -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/requests -H "Authorization: Bearer $TOKEN"
```

## 11. Logout During Development

If the UI has no logout button yet, open browser DevTools Console and run:

```js
localStorage.removeItem("logshield-auth");
localStorage.removeItem("logshield-sync");
location.reload();
```

For a full mobile local reset:

```js
localStorage.clear();
indexedDB.deleteDatabase("logshield_field_local");
location.reload();
```

## 12. Common Fixes

If `couchdb:5984` appears in the browser console, refresh the mobile page after pulling the latest code. The mobile app rewrites Docker's internal CouchDB hostname to `localhost` for browser sync.

If `kib_16 has invalid format` appears, use a 16-digit number such as:

```text
1234567890123456
```

If Docker looks stuck, restart cleanly:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml down
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml up -d --build
```

Then bootstrap again:

Windows PowerShell:

```powershell
Invoke-RestMethod -Method POST http://localhost:4000/api/couchdb/bootstrap
```

macOS/Linux Terminal:

```bash
curl -X POST http://localhost:4000/api/couchdb/bootstrap
```

## 13. Stop Everything

All platforms:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml down
```
