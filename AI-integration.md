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

### `GET /api/ai/models/current`

Returns current model metadata and TinyTimeMixer runtime status.

```powershell
Invoke-RestMethod http://localhost:4000/api/ai/models/current | ConvertTo-Json -Depth 8
```

Main response fields:

- `model_version`
- `model_backend`
- `status`
- `runtime`
- `model_path`
- `context_length`
- `horizon`
- `metrics`

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
| `kib_bencana_id` | string | empty | - | Optional disaster filter. |
| `posko_id` | string | empty | - | Optional posko filter. |
| `item_name` | string | empty | - | Optional item filter. |
| `disaster_type` | string | empty | - | Optional disaster type filter. |

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
| `kib_bencana_id` | string | empty | - | Optional disaster filter. |
| `posko_id` | string | empty | - | Optional posko filter. |
| `item_name` | string | empty | - | Optional item filter. |
| `disaster_type` | string | empty | - | Optional disaster type filter. |
| `anomaly_type` | string | empty | - | Optional anomaly type filter. |
| `severity` | string | empty | - | Optional severity filter. |

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

### `GET /api/ai/forecasts`

Returns forecast rows from the AI artifact service.

```powershell
Invoke-RestMethod "http://localhost:4000/api/ai/forecasts?limit=100&item_name=beras" |
  ConvertTo-Json -Depth 8
```

Query params:

| Name | Type | Default | Max | Description |
| --- | --- | ---: | ---: | --- |
| `limit` | number | `100` | `1000` | Number of rows to return. |
| `kib_bencana_id` | string | empty | - | Optional disaster filter. |
| `posko_id` | string | empty | - | Optional posko filter. |
| `item_name` | string | empty | - | Optional item filter. |
| `disaster_type` | string | empty | - | Optional disaster type filter. |

### `GET /api/ai/recommendations`

Returns recommendation rows from the AI artifact service.

```powershell
Invoke-RestMethod "http://localhost:4000/api/ai/recommendations?limit=100&risk_level=kritis" |
  ConvertTo-Json -Depth 8
```

Query params:

| Name | Type | Default | Max | Description |
| --- | --- | ---: | ---: | --- |
| `limit` | number | `100` | `1000` | Number of rows to return. |
| `kib_bencana_id` | string | empty | - | Optional disaster filter. |
| `posko_id` | string | empty | - | Optional posko filter. |
| `item_name` | string | empty | - | Optional item filter. |
| `disaster_type` | string | empty | - | Optional disaster type filter. |
| `risk_level` | string | empty | - | Optional `aman`, `waspada`, or `kritis`. |

### `GET /api/ai/anomalies`

Returns anomaly rows from the AI artifact service.

```powershell
Invoke-RestMethod "http://localhost:4000/api/ai/anomalies?limit=100&severity=high" |
  ConvertTo-Json -Depth 8
```

Query params:

| Name | Type | Default | Max | Description |
| --- | --- | ---: | ---: | --- |
| `limit` | number | `100` | `1000` | Number of rows to return. |
| `kib_bencana_id` | string | empty | - | Optional disaster filter. |
| `posko_id` | string | empty | - | Optional posko filter. |
| `item_name` | string | empty | - | Optional item filter. |
| `disaster_type` | string | empty | - | Optional disaster type filter. |
| `anomaly_type` | string | empty | - | Optional anomaly type filter. |
| `severity` | string | empty | - | Optional `low`, `medium`, or `high`. |

## Protected AI Inference APIs

These routes require a backend JWT.

### `POST /api/ai/infer/need`

Runs TinyTimeMixer need forecasting for one time series. The payload must contain exactly 30 historical daily points.

```http
POST /api/ai/infer/need
Content-Type: application/json
Authorization: Bearer <token>
```

Minimal request shape:

```json
{
  "kib_bencana_id": "BNC-2026-JK-0001",
  "disaster_type": "banjir_longsor",
  "posko_id": "POSKO-001",
  "posko_name": "Posko Utama",
  "item_name": "beras",
  "item_category": "pangan",
  "unit": "kg",
  "total_pengungsi": 250,
  "vulnerable_count": 80,
  "current_stock_qty": 120,
  "critical_stock_threshold": 100,
  "is_synthetic_series": "false",
  "history": [
    {
      "date": "2026-05-01",
      "target_need_qty": 100,
      "current_stock_qty": 120,
      "distributed_qty": 90,
      "requested_qty": 110
    }
  ]
}
```

Response fields:

- `model_version`
- `model_backend`
- `forecast`

### `POST /api/ai/infer/recommendation`

Runs TinyTimeMixer forecasting and converts the forecast into distribution recommendations.

```http
POST /api/ai/infer/recommendation
Content-Type: application/json
Authorization: Bearer <token>
```

Request shape is the same as `/api/ai/infer/need`.

Response fields:

- `model_version`
- `model_backend`
- `daily_recommendations`
- `top_recommendation`

Note: local TTM inference requires the `.venv-ttm` runtime described in `apps/ai-engine/README.md`. Without it, inference endpoints return a service-unavailable error from the AI engine.

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

