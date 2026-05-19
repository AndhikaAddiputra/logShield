# Personeel Management API

Backend base URL:

```text
http://localhost:4000
```

All personnel management endpoints require a JWT from `POST /api/auth/login`.

Use the token like this:

```http
Authorization: Bearer <token>
```

## Roles

- `admin`: can view current non-admin personnel and pending signup requests.
- `koordinator`: can view only `lapangan` personnel below them. Koordinator cannot see other koordinator or admins.
- `lapangan`: cannot access personnel management endpoints.

NIK visibility:

- `admin` responses include `nik`.
- `koordinator` responses do not include `nik`.

## Login First

```http
POST /api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "identifier": "athar@athar.com",
  "password": "atharathar"
}
```

`identifier` can be email or 16-digit NIK.

Response:

```json
{
  "ok": true,
  "token": "<jwt>",
  "user": {
    "_id": "user::athar",
    "email": "athar@athar.com",
    "name": "Athar",
    "role": "admin",
    "posko_id": null
  },
  "couchdb": {
    "url": "http://localhost:5984/logshield",
    "username": "athar",
    "password": "atharathar",
    "database": "logshield"
  }
}
```

## List Personnel

```http
GET /api/personnel
Authorization: Bearer <token>
```

### Admin Response

Admin sees current non-admin personnel and pending account requests.

Columns:

```json
[
  "Nama Personel",
  "KIB (Bencana ID)",
  "NIK",
  "Role",
  "Posko Assignment",
  "Aksi"
]
```

Example response:

```json
{
  "ok": true,
  "viewer": {
    "user_id": "user::athar",
    "role": "admin",
    "posko_id": null
  },
  "columns": [
    "Nama Personel",
    "KIB (Bencana ID)",
    "NIK",
    "Role",
    "Posko Assignment",
    "Aksi"
  ],
  "rows": [
    {
      "id": "user::98adb41a-6517-4f3e-bf8c-2799cee24b28",
      "source": "user",
      "status": "active",
      "nama_personel": "Koordinator Simulasi",
      "kib_bencana_id": "BNC-2026-JK-0001",
      "nik": "1111222233334444",
      "role": "koordinator",
      "posko_assignment": null,
      "aksi": []
    },
    {
      "id": "signup_request::45612a9b-c30e-48c2-82ca-ff0e091657d6",
      "source": "signup_request",
      "status": "pending",
      "nama_personel": "Request User",
      "kib_bencana_id": null,
      "nik": "5555666677778888",
      "role": null,
      "posko_assignment": null,
      "aksi": ["approve", "reject"]
    }
  ]
}
```

### Koordinator Response

Koordinator sees only `lapangan` personnel below them. NIK is not returned.

Columns:

```json
[
  "Nama Personel",
  "KIB (Bencana ID)",
  "Role",
  "Posko Assignment",
  "Aksi"
]
```

Example response:

```json
{
  "ok": true,
  "viewer": {
    "user_id": "user::koordinator",
    "role": "koordinator",
    "posko_id": "posko::1234567890123456"
  },
  "columns": [
    "Nama Personel",
    "KIB (Bencana ID)",
    "Role",
    "Posko Assignment",
    "Aksi"
  ],
  "rows": [
    {
      "id": "user::lapangan-1",
      "source": "user",
      "status": "active",
      "nama_personel": "Petugas Lapangan",
      "kib_bencana_id": "BNC-2026-JK-0002",
      "role": "lapangan",
      "posko_assignment": "posko::1234567890123456",
      "aksi": []
    }
  ]
}
```

## Approve Signup Request

Admin only.

```http
POST /api/personnel/requests/:id/approve
Authorization: Bearer <admin-token>
Content-Type: application/json
```

Body:

```json
{
  "role": "koordinator",
  "kib_bencana_id": "BNC-2026-JK-0001",
  "posko_id": null
}
```

Optional admin edits:

```json
{
  "role": "lapangan",
  "kib_bencana_id": "BNC-2026-JK-0002",
  "posko_id": "posko::1234567890123456",
  "name": "Updated Name",
  "email": "updated@test.com",
  "phone": "081234567890",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

Response:

```json
{
  "ok": true,
  "user": {
    "_id": "user::generated-id",
    "type": "user",
    "email": "approved@test.com",
    "name": "Approved User",
    "kib_bencana_id": "BNC-2026-JK-0001",
    "role": "koordinator",
    "posko_id": null,
    "phone": "081111222233"
  },
  "signup_request": {
    "_id": "signup_request::generated-id",
    "status": "approved",
    "reviewed_by": "user::athar"
  },
  "email_outbox": "email_outbox::timestamp::uuid"
}
```

Approval creates:

- `user` document
- `auth_credential` document
- CouchDB `_users` sync account
- `email_outbox` approval message

## Reject Signup Request

Admin only.

```http
POST /api/personnel/requests/:id/reject
Authorization: Bearer <admin-token>
Content-Type: application/json
```

Body:

```json
{
  "reason": "Data tidak sesuai."
}
```

Response:

```json
{
  "ok": true,
  "signup_request": {
    "_id": "signup_request::generated-id",
    "status": "rejected",
    "reviewed_by": "user::athar",
    "rejection_reason": "Data tidak sesuai."
  },
  "email_outbox": "email_outbox::timestamp::uuid"
}
```

Rejection creates an `email_outbox` rejection message.

## Legacy Admin Endpoints

These still work and call the same approval logic:

```http
GET /api/admin/signup-requests
POST /api/admin/signup-requests/:id/approve
POST /api/admin/signup-requests/:id/reject
```

Prefer the `/api/personnel/...` endpoints for the personnel management page.

## Common Errors

Missing token:

```json
{
  "ok": false,
  "error": "AuthError",
  "message": "Missing bearer token"
}
```

Wrong role:

```json
{
  "ok": false,
  "error": "AuthError",
  "message": "Admin or koordinator role required"
}
```

Admin-only action called by non-admin:

```json
{
  "ok": false,
  "error": "AuthError",
  "message": "Admin role required"
}
```
