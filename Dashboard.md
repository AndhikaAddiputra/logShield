# LogShield Dashboard API

Base URL:

```text
http://localhost:4000
```

All dashboard routes require a backend JWT:

```http
Authorization: Bearer <token>
```

Get the token from:

```http
POST /api/auth/login
```

Example login:

```json
{
  "identifier": "athar@athar.com",
  "password": "atharathar"
}
```

## Overview Cards

### `GET /api/dashboard/overview`

Powers the top summary cards:

- Total Posko
- Critical Items
- Pending Requests
- AI Health

Response:

```json
{
  "ok": true,
  "cards": {
    "total_posko": 1240,
    "critical_items": 42,
    "critical_units": 120,
    "pending_requests": 188,
    "ai_health": "Stable",
    "ai_status": "healthy"
  },
  "updated_at": "2026-05-19T10:00:00.000Z"
}
```

Field notes:

| Field | Description |
| --- | --- |
| `total_posko` | Count of `posko` documents. |
| `critical_items` | Count of assets where `quantity_available < min_threshold`. |
| `critical_units` | Sum of available quantity for critical assets. |
| `pending_requests` | Count of `request` docs with `mendesak` or `menunggu`. |
| `ai_health` | UI label, usually `Stable` or `Degraded`. |
| `ai_status` | Raw AI health status from the AI engine. |

## Daily Stock Weight Chart

### `GET /api/dashboard/stock-weight`

Powers the line chart: `Kebutuhan` vs `Persediaan`.

Query params:

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `category` | no | all | `sandang`, `pangan`, `papan`, or `lainnya`. |
| `commodity` | no | all | Commodity name, for example `beras`. |
| `days` | no | `7` | Number of days, min `1`, max `31`. |

Example:

```http
GET /api/dashboard/stock-weight?category=pangan&commodity=beras&days=7
```

Response:

```json
{
  "ok": true,
  "filter": {
    "category": "pangan",
    "commodity": "beras"
  },
  "options": [
    {
      "category": "pangan",
      "label": "Pangan",
      "commodities": ["beras", "air mineral"]
    }
  ],
  "days": [
    {
      "date": "2026-05-19",
      "label": "TUE",
      "kebutuhan": 500,
      "persediaan": 1200
    }
  ]
}
```

Data sources:

- `persediaan`: `stock_reading.weight_g` converted to kg plus current `asset.quantity_available`.
- `kebutuhan`: request item quantities plus distribution quantities.

## Regional Heatmap

### `GET /api/dashboard/regional-heatmap`

Powers the heatmap by category and posko.

Query params:

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `limit` | no | `7` | Number of posko columns, min `1`, max `20`. |

Example:

```http
GET /api/dashboard/regional-heatmap?limit=7
```

Response:

```json
{
  "ok": true,
  "columns": [
    {
      "posko_id": "posko::550e8400-e29b-41d4-a716-446655440000",
      "name": "Posko Cianjur A",
      "district": "Cianjur",
      "province": "Jawa Barat"
    }
  ],
  "rows": [
    {
      "category": "pangan",
      "label": "Pangan",
      "values": [
        {
          "posko_id": "posko::550e8400-e29b-41d4-a716-446655440000",
          "value": 500,
          "intensity": 85
        }
      ]
    }
  ]
}
```

Field notes:

| Field | Description |
| --- | --- |
| `columns` | Posko columns for the heatmap. |
| `rows` | One row per category: `sandang`, `pangan`, `papan`, `lainnya`. |
| `value` | Total request quantity for that category and posko. |
| `intensity` | Normalized 0-100 value for UI color intensity. |

## Vulnerable Group Fulfillment

### `GET /api/dashboard/vulnerable-fulfillment`

Powers the vulnerable group horizontal bars.

Response:

```json
{
  "ok": true,
  "groups": [
    {
      "key": "balita",
      "label": "Balita",
      "fulfilled": 82,
      "target": 100,
      "percentage": 82
    },
    {
      "key": "lansia",
      "label": "Lansia",
      "fulfilled": 15,
      "target": 100,
      "percentage": 15
    }
  ]
}
```

Groups:

```text
balita | lansia | ibu_hamil | disabilitas
```

Data sources:

- `fulfilled`: distribution quantities grouped by `vulnerable_group`.
- `target`: matching posko demographic counts where available.
- `ibu_hamil`: estimated from women count if no dedicated posko field exists.

## Dashboard Search

### `GET /api/dashboard/search`

Powers the top search field.

Query params:

| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `q` | yes | none | Search term. |
| `limit` | no | `10` | Max results, min `1`, max `50`. |

Example:

```http
GET /api/dashboard/search?q=beras
```

Response:

```json
{
  "ok": true,
  "query": "beras",
  "results": [
    {
      "type": "asset",
      "id": "asset::WH-JKT-001::beras",
      "title": "beras",
      "subtitle": "500 kg - Pangan"
    }
  ]
}
```

Search covers:

- Posko: name, KIB, district, province, address
- Asset: commodity, category, warehouse
- Request: request code, status, priority, item commodity, item note

## Notifications

### `GET /api/dashboard/notifications`

Powers the notification bell.

Response:

```json
{
  "ok": true,
  "unread_count": 2,
  "notifications": [
    {
      "type": "critical_stock",
      "severity": "high",
      "title": "Stok kritis",
      "message": "beras di WH-JKT-001 berada di bawah ambang minimum.",
      "created_at": "2026-05-19T10:00:00.000Z"
    }
  ]
}
```

Notification sources:

- Critical assets
- Urgent requests
- Synced AI anomaly documents

## Auth Error

Missing token:

```json
{
  "ok": false,
  "error": "AuthError",
  "message": "Missing bearer token"
}
```

## Quick CLI Check

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

Invoke-RestMethod http://localhost:4000/api/dashboard/overview -Headers $headers
Invoke-RestMethod "http://localhost:4000/api/dashboard/stock-weight?category=pangan&commodity=beras&days=7" -Headers $headers
Invoke-RestMethod "http://localhost:4000/api/dashboard/regional-heatmap?limit=7" -Headers $headers
Invoke-RestMethod http://localhost:4000/api/dashboard/vulnerable-fulfillment -Headers $headers
Invoke-RestMethod "http://localhost:4000/api/dashboard/search?q=beras" -Headers $headers
Invoke-RestMethod http://localhost:4000/api/dashboard/notifications -Headers $headers
```

macOS/Linux:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"athar@athar.com","password":"atharathar"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).token")

curl http://localhost:4000/api/dashboard/overview -H "Authorization: Bearer $TOKEN"
curl "http://localhost:4000/api/dashboard/stock-weight?category=pangan&commodity=beras&days=7" -H "Authorization: Bearer $TOKEN"
curl "http://localhost:4000/api/dashboard/regional-heatmap?limit=7" -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/dashboard/vulnerable-fulfillment -H "Authorization: Bearer $TOKEN"
curl "http://localhost:4000/api/dashboard/search?q=beras" -H "Authorization: Bearer $TOKEN"
curl http://localhost:4000/api/dashboard/notifications -H "Authorization: Bearer $TOKEN"
```
