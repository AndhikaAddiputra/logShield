# Posko + Stok API Documentation

Base URL:

```text
http://localhost:4000
```

All endpoints require:

```http
Authorization: Bearer <token>
```

Get the token from:

```http
POST /api/auth/login
```

## Posko

### List Poskos

```http
GET /api/poskos
```

Returns all posko documents.

Response:

```json
{
  "ok": true,
  "rows": [
    {
      "_id": "posko::uuid",
      "_rev": "1-rev",
      "type": "posko",
      "kib_16": "1234567890123456",
      "name": "Posko Rajeg Timur",
      "address": "Jl. Contoh No. 1",
      "district": "Tangerang",
      "province": "Banten",
      "total_pengungsi": 120,
      "count_balita": 12,
      "count_lansia": 8,
      "count_perempuan": 60,
      "count_pria": 52,
      "count_disabilitas": 3,
      "pj_phone": "081234567890",
      "pj_name": "Budi",
      "status": "active",
      "created_at": "2026-05-15T12:00:00.000Z",
      "updated_at": "2026-05-15T12:00:00.000Z"
    }
  ]
}
```

### Create Posko

```http
POST /api/poskos
Content-Type: application/json
```

Request:

```json
{
  "kib_16": "1234567890123456",
  "name": "Posko Rajeg Timur",
  "address": "Jl. Contoh No. 1",
  "district": "Tangerang",
  "province": "Banten",
  "total_pengungsi": 120,
  "count_balita": 12,
  "count_lansia": 8,
  "count_perempuan": 60,
  "count_pria": 52,
  "count_disabilitas": 3,
  "pj_phone": "081234567890",
  "pj_name": "Budi"
}
```

Response:

```json
{
  "ok": true,
  "posko": {
    "_id": "posko::uuid",
    "_rev": "1-rev",
    "type": "posko",
    "kib_16": "1234567890123456",
    "name": "Posko Rajeg Timur",
    "address": "Jl. Contoh No. 1",
    "district": "Tangerang",
    "province": "Banten",
    "total_pengungsi": 120,
    "count_balita": 12,
    "count_lansia": 8,
    "count_perempuan": 60,
    "count_pria": 52,
    "count_disabilitas": 3,
    "pj_phone": "081234567890",
    "pj_name": "Budi",
    "status": "active",
    "created_at": "2026-05-15T12:00:00.000Z",
    "updated_at": "2026-05-15T12:00:00.000Z"
  }
}
```

Notes:

- Server generates `_id` as `posko::{uuid}`.
- `kib_16` is repeatable and not unique.
- Server sets `status`, `created_at`, and `updated_at`.

### Import Poskos From CSV

```http
POST /api/poskos/import-csv
Content-Type: multipart/form-data
```

Multipart field:

```text
file
```

Required CSV columns:

```text
KIB,name,address,district,province,totalpengungsi,countbalita,countlansia,countperempuan,countpria,countdisabilitas,pjphone,pjname
```

Response:

```json
{
  "ok": true,
  "inserted": 2,
  "failed": 0,
  "errors": []
}
```

Partial-success response uses status `207`:

```json
{
  "ok": false,
  "inserted": 1,
  "failed": 1,
  "errors": [
    {
      "row": 3,
      "message": "count_balita must be a finite number"
    }
  ]
}
```

## Stok

### Stock Summary

```http
GET /api/stocks/summary
```

Response:

```json
{
  "ok": true,
  "updated_at": "2026-05-15T12:00:00.000Z",
  "total_item": 5847,
  "critical_count": 12,
  "distribution_today": 324,
  "posko_served": 47,
  "active_posko_count": 52
}
```

### Stock Categories

```http
GET /api/stocks/categories
```

Response:

```json
{
  "ok": true,
  "categories": [
    {
      "category": "pangan",
      "title": "Pangan",
      "subtitle": "Kebutuhan Pangan & Nutrisi",
      "item_count": 1,
      "items": [
        {
          "commodity": "beras",
          "quantity_available": 20000,
          "unit": "kg",
          "min_threshold": 5000,
          "is_critical": false,
          "progress": 100
        }
      ]
    }
  ]
}
```

Categories:

```text
sandang | pangan | papan | lainnya
```

### Weekly Stock Trend

```http
GET /api/stocks/trend?days=7
```

Query params:

```text
days: number, optional, default 7, min 1, max 31
```

Response:

```json
{
  "ok": true,
  "days": [
    {
      "date": "2026-05-15",
      "label": "Fri",
      "masuk": 500,
      "keluar": 0
    }
  ]
}
```

### Add Stock

```http
POST /api/stocks
Content-Type: application/json
```

Request:

```json
{
  "warehouse_id": "WH-JKT-001",
  "commodity": "beras",
  "category": "pangan",
  "quantity": 500,
  "unit": "kg",
  "min_threshold": 100
}
```

Response:

```json
{
  "ok": true,
  "asset": {
    "_id": "asset::WH-JKT-001::beras",
    "_rev": "1-rev",
    "type": "asset",
    "warehouse_id": "WH-JKT-001",
    "commodity": "beras",
    "category": "pangan",
    "quantity_available": 500,
    "unit": "kg",
    "min_threshold": 100,
    "last_sensor_weight_g": null,
    "last_sensor_update": null,
    "created_at": "2026-05-15T12:00:00.000Z",
    "updated_at": "2026-05-15T12:00:00.000Z"
  },
  "movement": {
    "_id": "stock_movement::timestamp_ms::uuid",
    "_rev": "1-rev",
    "type": "stock_movement",
    "warehouse_id": "WH-JKT-001",
    "commodity": "beras",
    "category": "pangan",
    "quantity": 500,
    "unit": "kg",
    "movement_type": "in",
    "source": "manual",
    "created_by": "user::athar",
    "created_at": "2026-05-15T12:00:00.000Z"
  }
}
```

Behavior:

- Creates `asset::{warehouse_id}::{commodity}` if missing.
- Increments `asset.quantity_available` if it exists.
- Creates append-only `stock_movement::{timestamp_ms}::{uuid}`.
- Manual additions use `movement_type: "in"` and `source: "manual"`.
- MQTT stock readings still update only sensor fields, not `quantity_available`.

Valid stock units:

```text
kg | pcs | karton | unit
```

## Auth Errors

Missing or invalid token:

```json
{
  "ok": false,
  "error": "AuthError",
  "message": "Missing bearer token"
}
```

Validation error:

```json
{
  "ok": false,
  "error": "ValidationError",
  "message": "quantity must be a positive number"
}
```
