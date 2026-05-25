# LogShield AI Integration API

Base URL:

```text
http://localhost:4000
```

AI engine direct URL:

```text
http://localhost:8000
```

Docker backend AI engine URL:

```text
http://ai-engine:8000
```

## Services

Start the full local stack:

```powershell
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml up -d --build
```

Expected containers:

- `logshield-couchdb` on `5984`
- `logshield-mosquitto` on `1883`
- `logshield-ai-engine` on `8000`
- `logshield-backend` on `4000`

## Health Checks

### `GET /api/health`

Checks backend health and configured AI engine URL.

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

Example response:

```json
{
  "ok": true,
  "service": "logshield-backend",
  "port": 4000,
  "database": "logshield",
  "ai_engine": "http://ai-engine:8000"
}
```

### `GET http://localhost:8000/health`

Checks AI engine directly.

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Example response:

```json
{
  "status": "ok",
  "service": "logshield-ai-engine"
}
```

## Public AI Read APIs

These routes proxy backend requests to the FastAPI AI engine.

### `GET /api/ai/summary`

Returns overall AI artifact status, dataset summary, forecasting metrics, recommendation summary, and anomaly summary.

```powershell
Invoke-RestMethod http://localhost:4000/api/ai/summary | ConvertTo-Json -Depth 8
```

Main response fields:

- `status`
- `dataset`
- `forecasting`
- `recommendations`
- `anomalies`

### `GET /api/ai/dashboard?limit=5`

Returns compact dashboard data for frontend cards and lists.

```powershell
Invoke-RestMethod "http://localhost:4000/api/ai/dashboard?limit=5" | ConvertTo-Json -Depth 10
```

Query params:

| Name | Type | Default | Max | Description |
| --- | --- | ---: | ---: | --- |
| `limit` | number | `10` | `100` | Number of recommendation/anomaly rows to include. |

Main response fields:

- `dataset.rows`
- `dataset.date_min`
- `dataset.date_max`
- `dataset.poskos`
- `dataset.items`
- `forecasting.evaluated_series`
- `forecasting.forecast_rows`
- `recommendations.risk_counts`
- `recommendations.top_critical`
- `anomalies.severity_counts`
- `anomalies.recent`

### `GET /api/ai/recommendations/top-critical?limit=25`

Returns highest-priority critical logistics recommendations.

```powershell
Invoke-RestMethod "http://localhost:4000/api/ai/recommendations/top-critical?limit=5" |
  ConvertTo-Json -Depth 8
```

Query params:

| Name | Type | Default | Max | Description |
| --- | --- | ---: | ---: | --- |
| `limit` | number | `25` | `100` | Number of rows to return. |

Example row fields:

- `forecast_date`
- `kib_bencana_id`
- `disaster_type`
- `posko_id`
- `posko_name`
- `item_name`
- `unit`
- `recommended_qty`
- `shortage_qty`
- `coverage_days`
- `risk_level`
- `priority_score`
- `trust_score`
- `rationale_chips`

### `GET /api/ai/anomalies/recent?limit=25`

Returns recent anomaly findings.

```powershell
Invoke-RestMethod "http://localhost:4000/api/ai/anomalies/recent?limit=5" |
  ConvertTo-Json -Depth 8
```

Query params:

| Name | Type | Default | Max | Description |
| --- | --- | ---: | ---: | --- |
| `limit` | number | `25` | `100` | Number of rows to return. |

Example row fields:

- `date`
- `kib_bencana_id`
- `disaster_type`
- `posko_id`
- `posko_name`
- `item_name`
- `unit`
- `anomaly_type`
- `severity`
- `score`
- `message`
- `action_suggestion`

## Admin AI APIs

Admin routes require a backend JWT.

### Login

```powershell
$loginBody = @{
  identifier = "athar@athar.com"
  password = "atharathar"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method POST http://localhost:4000/api/auth/login `
  -ContentType "application/json" `
  -Body $loginBody

$token = $login.token
$headers = @{ Authorization = "Bearer $token" }
```

### `POST /api/ai/refresh`

Refreshes the AI engine artifact cache.

```powershell
Invoke-RestMethod -Method POST http://localhost:4000/api/ai/refresh `
  -Headers $headers |
  ConvertTo-Json -Depth 8
```

Auth:

- Required: admin JWT.

### `POST /api/ai/sync`

Reads the AI dashboard result and stores a snapshot in CouchDB.

```powershell
$syncBody = @{ limit = 5 } | ConvertTo-Json

Invoke-RestMethod -Method POST http://localhost:4000/api/ai/sync `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $syncBody |
  ConvertTo-Json -Depth 8
```

Request body:

```json
{
  "limit": 5
}
```

Response:

```json
{
  "ok": true,
  "run_id": "1778852374710::2855d039-cfd5-4cf5-9bc9-b7dbb9343446",
  "synced_at": "2026-05-15T13:39:34.710Z",
  "counts": {
    "docs": 11,
    "recommendations": 5,
    "anomalies": 5
  },
  "result": []
}
```

Created CouchDB document types:

- `ai_run_summary`
- `ai_recommendation`
- `ai_anomaly`

## CouchDB Snapshot Verification

```powershell
$pair = "admin:password"
$basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))

foreach ($type in @("ai_run_summary", "ai_recommendation", "ai_anomaly")) {
  $body = @{
    selector = @{ type = $type }
    limit = 1
  } | ConvertTo-Json -Depth 5

  $result = Invoke-RestMethod -Method POST http://localhost:5984/logshield/_find `
    -Headers @{ Authorization = "Basic $basic" } `
    -ContentType "application/json" `
    -Body $body

  [PSCustomObject]@{
    type = $type
    found = $result.docs.Count
  }
}
```

Expected result:

```text
ai_run_summary      found 1
ai_recommendation   found 1
ai_anomaly          found 1
```

## Frontend Usage Notes

- Use `/api/ai/dashboard` for dashboard cards, top critical recommendations, and recent anomalies.
- Use `/api/ai/recommendations/top-critical` for a dedicated recommendations table.
- Use `/api/ai/anomalies/recent` for anomaly alert panels.
- Use `/api/ai/sync` only from admin tooling, not public UI.
- Read routes currently do not require JWT; admin mutation/sync routes require JWT.

## Error Shape

Backend AI proxy errors follow the standard backend error format:

```json
{
  "ok": false,
  "error": "AiEngineError",
  "message": "AI engine error message"
}
```

