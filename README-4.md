# LogShield

REKSTI Capstone Project

## Auth API: Signup + Login

Backend base URL:

```text
http://localhost:4000
```

The backend supplies everything mobile and web need after login:

- `token`: JWT session token for backend API calls.
- `user`: safe app user profile.
- `couchdb`: CouchDB sync credentials for PouchDB replication.

Frontend clients do not create their own session token.

## Start Services

```powershell
docker compose --env-file .env -f infrastructure/docker-compose.dev.yml up -d --build
Invoke-WebRequest -UseBasicParsing -Method POST http://localhost:4000/api/couchdb/bootstrap
```

Seed admin login:

```text
identifier: athar@athar.com
password: atharathar
```

## Signup

Creates a pending registration request. It does not create an active user until admin approval.

```http
POST /api/auth/signup
Content-Type: application/json
```

Request body:

```json
{
  "email": "newuser@test.com",
  "name": "New User",
  "nik": "1234567890123456",
  "password": "password123",
  "phone": "081234567890"
}
```

Success response:

```json
{
  "ok": true,
  "id": "signup_request::{uuid}",
  "status": "pending",
  "message": "Registration submitted for admin review."
}
```

## Login

Users can login with either email or 16-digit NIK.

```http
POST /api/auth/login
Content-Type: application/json
```

Email login:

```json
{
  "identifier": "newuser@test.com",
  "password": "password123"
}
```

NIK login:

```json
{
  "identifier": "1234567890123456",
  "password": "password123"
}
```

Success response:

```json
{
  "ok": true,
  "token": "jwt-token",
  "user": {
    "_id": "user::{uuid}",
    "type": "user",
    "email": "newuser@test.com",
    "name": "New User",
    "kib_bencana_id": "BNC-2026-JK-0001",
    "role": "koordinator",
    "posko_id": null,
    "phone": "081234567890",
    "created_at": "2026-05-15T00:00:00.000Z",
    "updated_at": "2026-05-15T00:00:00.000Z"
  },
  "couchdb": {
    "url": "http://localhost:5984/logshield",
    "username": "newuser@test.com",
    "password": "generated-couchdb-password",
    "database": "logshield"
  }
}
```

Use the JWT for backend API requests:

```http
Authorization: Bearer jwt-token
```

Use the `couchdb` object for PouchDB sync:

```ts
import PouchDB from "pouchdb";

const local = new PouchDB("logshield_field_local");
const remote = new PouchDB(loginResponse.couchdb.url, {
  skip_setup: true,
  auth: {
    username: loginResponse.couchdb.username,
    password: loginResponse.couchdb.password
  }
});

local.sync(remote, {
  live: true,
  retry: true
});
```

## Admin: List Signup Requests

Requires admin JWT.

```http
GET /api/admin/signup-requests
Authorization: Bearer {admin_token}
```

Optional filter:

```http
GET /api/admin/signup-requests?status=pending
```

## Admin: Approve Signup

Requires admin JWT. Admin assigns role and disaster/posko scope here.

```http
POST /api/admin/signup-requests/{signup_request_id}/approve
Authorization: Bearer {admin_token}
Content-Type: application/json
```

Request body:

```json
{
  "role": "koordinator",
  "kib_bencana_id": "BNC-2026-JK-0001",
  "posko_id": null
}
```

Allowed roles:

```text
admin | koordinator | lapangan
```

`posko_id` can be `null` or:

```text
posko::{kib_16}
```

Success response includes the created user and an `email_outbox` id.

## Admin: Reject Signup

Requires admin JWT.

```http
POST /api/admin/signup-requests/{signup_request_id}/reject
Authorization: Bearer {admin_token}
Content-Type: application/json
```

Request body:

```json
{
  "reason": "Data belum valid."
}
```

Success response marks the request as `rejected` and creates a rejection `email_outbox` document.

## Frontend Notes

- Signup users only provide email, name, NIK, password, and phone.
- Users cannot choose their own role, KIB bencana, or posko.
- Pending or rejected users cannot login.
- Raw password is never stored.
- Raw NIK is never stored; the backend stores encrypted NIK plus a lookup hash.
- Approval/rejection email is stored in CouchDB as `email_outbox::{timestamp_ms}::{uuid}` for development.
