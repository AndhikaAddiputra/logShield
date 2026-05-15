# LogShield Requests API

Base URL:

```text
http://localhost:4000
```

All routes require a backend JWT:

```powershell
$loginBody = @{
  identifier = "athar@athar.com"
  password = "atharathar"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method POST http://localhost:4000/api/auth/login `
  -ContentType "application/json" `
  -Body $loginBody

$headers = @{ Authorization = "Bearer $($login.token)" }
```

## Create Request

### `POST /api/requests`

Creates a logistics request from mobile or web.

```powershell
$body = @{
  posko_id = "posko::550e8400-e29b-41d4-a716-446655440000"
  status = "menunggu"
  priority = "normal"
  items = @(
    @{
      commodity = "Medical Supplies"
      quantity = 1
      unit = "kit"
      note = "Tambahkan detail spesifik..."
    }
  )
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Method POST http://localhost:4000/api/requests `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body |
  ConvertTo-Json -Depth 8
```

Request fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `posko_id` | string | yes | Existing `posko::{uuid}`. |
| `items` | array | yes | Non-empty array of request items. |
| `status` | string | no | `menunggu` or `mendesak`; default `menunggu`. |
| `priority` | string | no | `critical`, `high`, `normal`, `low`; default `normal`. |

Item fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `commodity` | string | yes | Item/resource name. |
| `quantity` | number | yes | Must be positive. |
| `unit` | string | yes | `kg`, `liter`, `pcs`, `karton`, `kit`, `unit`. |
| `note` | string | no | Displayed as `keterangan`. |

## List Requests

### `GET /api/requests`

Returns request rows formatted for the web card UI.

```powershell
Invoke-RestMethod "http://localhost:4000/api/requests?limit=20" `
  -Headers $headers |
  ConvertTo-Json -Depth 10
```

Query filters:

| Name | Description |
| --- | --- |
| `status` | Filter by `mendesak`, `menunggu`, `diproses`, `selesai`. |
| `posko_id` | Filter by assigned posko id. |
| `commodity` | Case-insensitive item name search. |
| `date_from` | Inclusive `YYYY-MM-DD` from `created_at`. |
| `date_to` | Inclusive `YYYY-MM-DD` to `created_at`. |
| `search` | Case-insensitive search across code, posko, status, priority, item, note. |
| `limit` | Default `100`, max `500`. |

Example row:

```json
{
  "id": "request::REQ-20260515-001",
  "request_code": "REQ-20260515-001",
  "title": "Posko Cianjur A",
  "location": "Cianjur, Jawa Barat",
  "status": "mendesak",
  "status_label": "Mendesak",
  "status_color": "danger",
  "priority": "critical",
  "date": "15 Mei 2026",
  "time": "20.32 WIB",
  "items": [
    {
      "name": "Beras",
      "quantity": "500 kg",
      "keterangan": "Stok +-3 hari"
    }
  ],
  "action_label": "Proses Request",
  "action_disabled": false
}
```

## Get Request Detail

### `GET /api/requests/:id`

Returns the full request document plus its UI card mapping.

```powershell
Invoke-RestMethod "http://localhost:4000/api/requests/request%3A%3AREQ-20260515-001" `
  -Headers $headers |
  ConvertTo-Json -Depth 10
```

## Process Request

### `POST /api/requests/:id/process`

Admin or koordinator only. Changes `mendesak` or `menunggu` to `diproses`.

```powershell
Invoke-RestMethod -Method POST "http://localhost:4000/api/requests/request%3A%3AREQ-20260515-001/process" `
  -Headers $headers |
  ConvertTo-Json -Depth 8
```

## Complete Request

### `POST /api/requests/:id/complete`

Admin or koordinator only. Changes `diproses` to `selesai`.

```powershell
Invoke-RestMethod -Method POST "http://localhost:4000/api/requests/request%3A%3AREQ-20260515-001/complete" `
  -Headers $headers |
  ConvertTo-Json -Depth 8
```

## Patch Request

### `PATCH /api/requests/:id`

Admin or koordinator only. Updates `status`, `priority`, and/or `items` before the request is complete.

```powershell
$patchBody = @{
  priority = "high"
  status = "mendesak"
} | ConvertTo-Json

Invoke-RestMethod -Method PATCH "http://localhost:4000/api/requests/request%3A%3AREQ-20260515-001" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $patchBody |
  ConvertTo-Json -Depth 8
```

## Status Mapping

| Stored status | Label | Color | Action |
| --- | --- | --- | --- |
| `mendesak` | Mendesak | danger | Proses Request |
| `menunggu` | Menunggu | warning | Proses Request |
| `diproses` | Diproses | success | Sedang Diproses |
| `selesai` | Selesai | info | Selesai |

