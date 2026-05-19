# LogShield Settings API

Base URL:

```text
http://localhost:4000
```

All settings routes require a backend JWT:

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

## Get Settings Page Data

### `GET /api/settings`

Returns account profile data and notification preferences for the logged-in user.

Response:

```json
{
  "ok": true,
  "profile": {
    "user_id": "user::athar",
    "name": "Athar",
    "email": "athar@athar.com",
    "phone": "081234567890",
    "avatar_url": null,
    "initials": "A",
    "role": "admin",
    "kib_bencana_id": "BNC-2026-JK-0001",
    "posko_id": null,
    "status": "active",
    "status_label": "AKTIF",
    "created_at": "2026-05-19T10:00:00.000Z",
    "updated_at": "2026-05-19T10:00:00.000Z"
  },
  "notifications": {
    "_id": "user_settings::user::athar",
    "user_id": "user::athar",
    "email": true,
    "app": true,
    "sms": false,
    "updated_at": "2026-05-19T10:00:00.000Z"
  }
}
```

Notes:

- `status_label` powers the `AKTIF` field.
- `initials` powers the profile circle.

## Update Profile

### `PATCH /api/settings/profile`

Updates editable profile fields.

Request:

```json
{
  "name": "Anakin Skywalker",
  "email": "anakin@logshield.id",
  "phone": "081234567890",
  "avatar_url": "https://example.com/avatar.png"
}
```

All fields are optional.

Response:

```json
{
  "ok": true,
  "profile": {
    "user_id": "user::athar",
    "name": "Anakin Skywalker",
    "email": "anakin@logshield.id",
    "phone": "081234567890",
    "avatar_url": "https://example.com/avatar.png",
    "initials": "AS",
    "role": "admin",
    "kib_bencana_id": "BNC-2026-JK-0001",
    "posko_id": null,
    "status": "active",
    "status_label": "AKTIF",
    "created_at": "2026-05-19T10:00:00.000Z",
    "updated_at": "2026-05-19T10:05:00.000Z"
  }
}
```

Validation:

- `name` must be a non-empty string.
- `email` must be a valid email and unique.
- `phone` must be a non-empty string.
- `avatar_url` must be an `http(s)` URL or JPG/PNG data URL.

## Change Password

### `POST /api/settings/password`

Updates the logged-in user's password in `auth_credential`.

Request:

```json
{
  "current_password": "atharathar",
  "new_password": "newpassword123"
}
```

Response:

```json
{
  "ok": true,
  "message": "Password updated."
}
```

Validation:

- `current_password` must match the current password.
- `new_password` must be at least 8 characters.
- Raw passwords are never stored; backend stores a bcrypt hash.

## Update Notification Preferences

### `PATCH /api/settings/notifications`

Powers the notification toggles:

- Notifikasi Email
- Notifikasi Aplikasi
- Notifikasi SMS

Request:

```json
{
  "email": true,
  "app": true,
  "sms": false
}
```

All fields are optional booleans.

Response:

```json
{
  "ok": true,
  "notifications": {
    "_id": "user_settings::user::athar",
    "user_id": "user::athar",
    "email": true,
    "app": true,
    "sms": false,
    "updated_at": "2026-05-19T10:10:00.000Z"
  }
}
```

## Upload Avatar

### `POST /api/settings/avatar`

Uploads a profile photo.

Content type:

```http
multipart/form-data
```

Multipart field:

```text
avatar
```

Accepted files:

```text
JPG or PNG, max 2MB
```

Response:

```json
{
  "ok": true,
  "profile": {
    "user_id": "user::athar",
    "name": "Athar",
    "email": "athar@athar.com",
    "avatar_url": "data:image/png;base64,...",
    "initials": "A",
    "status": "active",
    "status_label": "AKTIF"
  }
}
```

Current behavior:

- Stores avatar as a JPG/PNG data URL in `user.avatar_url`.
- This is fine for local/dev.
- A production setup should replace this with object storage.

## CLI Quick Check

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

Invoke-RestMethod http://localhost:4000/api/settings -Headers $headers

$profileBody = @{
  name = "Anakin Skywalker"
} | ConvertTo-Json

Invoke-RestMethod -Method PATCH http://localhost:4000/api/settings/profile `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $profileBody

$notifBody = @{
  email = $true
  app = $true
  sms = $false
} | ConvertTo-Json

Invoke-RestMethod -Method PATCH http://localhost:4000/api/settings/notifications `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $notifBody
```

macOS/Linux:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"athar@athar.com","password":"atharathar"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).token")

curl http://localhost:4000/api/settings \
  -H "Authorization: Bearer $TOKEN"

curl -X PATCH http://localhost:4000/api/settings/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Anakin Skywalker"}'

curl -X PATCH http://localhost:4000/api/settings/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":true,"app":true,"sms":false}'
```

## Errors

Missing token:

```json
{
  "ok": false,
  "error": "AuthError",
  "message": "Missing bearer token"
}
```

Wrong password:

```json
{
  "ok": false,
  "error": "AuthError",
  "message": "Current password is incorrect"
}
```

Validation error:

```json
{
  "ok": false,
  "error": "ValidationError",
  "message": "new_password must be at least 8 characters"
}
```
