# Hasil Pengujian LogShield Backend

**Tanggal:** 24 Mei 2026  
**Total:** 98 tests — ✅ 98 lulus, ❌ 0 gagal  
**Durasi:** ~529ms  

---

## Ringkasan per Kelompok

| Kelompok | File | Jumlah | Status |
|---|---|---|---|
| **Unit — AI Formulas** | `test/ai-formulas.test.js` | 41 | ✅ |
| **Unit — Anomaly Report** | `test/anomaly-report.test.js` | 10 | ✅ |
| **Unit — Auth** | `test/auth.test.js` | 3 | ✅ |
| **Unit — Document Schema** | `test/document-schema.test.js` | 22 | ✅ |
| **Integration — Health** | `test/health.integration.test.js` | 3 | ✅ |
| **Integration — Anomalies CRUD** | `test/anomalies.integration.test.js` | 12 | ✅ |
| **Integration — Quick Request** | `test/quick-request.integration.test.js` | 5 | ✅ |
| **Integration — Stocks & Audit** | `test/stocks.integration.test.js` | 4 | ✅ |

---

## 1. Unit Test — AI Formulas (41 tests)

### COMMODITY_SPECS (6 tests)
- Semua 16 komoditas terdefinisi: `air_bersih`, `air_minum`, `beras`, `mie_instan`, `minyak_goreng`, `protein`, `mpasi`, `obat_obatan`, `masker`, `pembalut`, `popok_bayi`, `hygiene_kit`, `baterai`, `selimut`, `matras`, `radio_ht`
- Class valid: `konsumsi_harian`, `konsumsi_berkala`, `perlengkapan_tahan_lama`, `elektronik_logistik`
- Category valid: `pangan`, `sandang`, `papan`, `lainnya`
- `qty > 0` untuk semua item
- `unit` berupa string untuk semua item
- Item `konsumsi_berkala` memiliki `period_days > 0`

### NAME_ALIASES (1 test)
- Alias langsung: `radio → radio_ht`, `popok → popok_bayi`, `air → air_bersih`, `minyak → minyak_goreng`, `hygiene → hygiene_kit`
- Alias via `normalizeItemName`: `"radio ht" → radio_ht`, `"popok bayi" → popok_bayi`, `"air bersih" → air_bersih`, `"mie instan" → mie_instan`, `"hygiene kit" → hygiene_kit`

### normalizeItemName (4 tests)
- Nama komoditas langsung: `"beras"`, `"Beras"`, `"MIE INSTAN"`, `"Selimut"`
- Resolusi alias: `"Radio"`, `"Popok Bayi"`, `"Air Mineral"`, `"Mie Instan"`
- Unknown commodity: `"Some Unknown Item" → "some_unknown_item"`
- Normalisasi spasi dan case: `"  Beras  " → "beras"`, `"MIE   INSTAN" → "mie_instan"`

### getCommoditySpec (3 tests)
- Mengembalikan spec untuk komoditas known (`beras`)
- Resolusi alias (`"Radio" → class elektronik_logistik`)
- Mengembalikan `null` untuk unknown commodity

### recalcForecastQty (10 tests)
- **konsumsi_harian**: `pengungsi * qty + bonus vulnerable`, capped at 35%
- **konsumsi_berkala**: `pengungsi * qty / period_days`
- **perlengkapan_tahan_lama**: `ceil(pengungsi * qty) / 7`
- **elektronik_logistik**: fixed qty per posko, tidak peduli populasi
- `requestedQty` override jika lebih besar dari base
- `criticalThreshold` override jika lebih besar dari lainnya
- Tidak negatif (min 0)
- `pengungsi = 0` graceful

### computeTrendAnalysis (6 tests)
- Deteksi tren **rising** (pct7d > 20%)
- Deteksi tren **falling** (pct7d < -20%)
- **Stable** jika perubahan < 20%
- **No data** → direction `"stable"`, pct7d/pct30d = 0
- Filter by `posko_id`
- Filter by `commodity` via `normalizeItemName`

### computeDataAttribution (3 tests)
- Normalized values **sum to 1**
- Semua 5 keys: `trend_request_change`, `coverage_risk`, `vulnerable_impact`, `stock_depletion_risk`, `threshold_gap`
- High shortage + low coverage → **stock_depletion_risk** dan **trend_request_change** lebih tinggi

### buildRecommendationChips (8 tests)
- Shortage → chip "kekurangan"
- Sufficient stock → chip "aman"
- Class-based: `konsumsi_berkala` → chip "berkala"
- Class-based: `perlengkapan_tahan_lama` → chip "tahan lama"
- Vulnerable ratio > 15% → chip "rentan"
- **Max 3 chips** (tidak lebih)
- Rising trend > 30% → chip "naik"
- Falling trend > 30% → chip "turun"

---

## 2. Unit Test — Anomaly Report (10 tests)

### createAnomalyReportDoc
- UUID id tergenerate
- Default severity `"medium"` saat tidak diisi
- Default status `"reported"` saat tidak diisi

### validateAnomalyReport
- Complete document valid
- Invalid severity ditolak
- Invalid status ditolak
- Missing required fields (`posko_id`, `commodity`) ditolak
- Optional fields (`description`, `location`) boleh kosong
- Semua severity valid: `low`, `medium`, `high`, `critical`
- Semua status valid: `reported`, `investigating`, `resolved`

---

## 3. Unit Test — Auth (3 tests)

- Normalisasi email (lowercase + trim)
- Hash NIK deterministik, tidak mengembalikan raw NIK
- Enkripsi/dekripsi secret berhasil

---

## 4. Unit Test — Document Schema (22 tests)

- User document (valid, invalid NIK, invalid role)
- Posko document (valid, KIB 16 digit, invalid status, duplicate KIB)
- Signup request, auth credential, email outbox
- User settings notification preferences
- Distribution document (valid, invalid unit)
- Stock reading (default sample_count)
- Prediction (confidence interval validation)
- Request document (valid, invalid fields, prediction ID)
- AI recommendation, AI anomaly, AI run summary
- Audit log, stock movement

---

## 5. Integration Test — Health & Auth (3 tests)

| Test | Status |
|---|---|
| `GET /api/health` mengembalikan service info | ✅ |
| `GET /api/couchdb/health` mengembalikan couchdb status | ✅ |
| `POST /api/auth/login` dengan kredensial kosong mengembalikan 401 | ✅ |

---

## 6. Integration Test — Anomalies CRUD (12 tests)

| Test | Status |
|---|---|
| `POST /api/anomalies` tanpa auth → 401 | ✅ |
| `GET /api/anomalies` tanpa auth → 401 | ✅ |
| Buat anomaly report baru | ✅ |
| Default severity `medium` | ✅ |
| List anomaly reports (min 2 items) | ✅ |
| Filter by severity | ✅ |
| `GET /api/anomalies/:id` mengembalikan report spesifik | ✅ |
| `GET /api/anomalies/:id` untuk ID tidak ada → 404 | ✅ |
| `PATCH .../status` update ke `investigating` | ✅ |
| `PATCH .../status` status invalid → 400 | ✅ |
| Full lifecycle: `reported → investigating → resolved` | ✅ |
| `POST` tanpa `posko_id` → 400 | ✅ |

---

## 7. Integration Test — Quick Request (5 tests)

| Test | Status |
|---|---|
| Tanpa auth → 401 | ✅ |
| Missing fields → 400 | ✅ |
| Buat request valid (posko_id + commodity + quantity + unit) | ✅ |
| Default priority `normal` saat tidak diisi | ✅ |
| `posko_id` invalid → 400 | ✅ |

Alur end-to-end: create posko → create quick request → verifikasi status `menunggu` dan field items

---

## 8. Integration Test — Stocks & Audit (4 tests)

| Test | Status |
|---|---|
| `GET /api/stocks/summary` (auth) | ✅ |
| `GET /api/stocks/categories` (auth) | ✅ |
| `POST /api/stock-readings` tanpa auth → 201 (IOT/sensor endpoint) | ✅ |
| `POST /api/audit-logs` tanpa auth → 201 | ✅ |

---

## Catatan Infrastruktur

- **Test runner:** `node:test` (built-in, tanpa dependensi eksternal)
- **Integration tests:** menggunakan `test/helpers/setup.js` yang:
  - Membuat HTTP server dari `src/app.js` di port random (port 0)
  - Membuat JWT token test dengan `jsonwebtoken`
  - Membersihkan server setelah tes (`after` hook)
- **Database:** Integration tests membutuhkan CouchDB berjalan (`docker compose up`)
- **Refaktor:** `src/app.js` diekstrak dari `src/index.js` agar app bisa di-import tanpa memulai server

## Perintah

```bash
# Semua tes
npm test

# Tes spesifik
node --test test/anomalies.integration.test.js
node --test test/ai-formulas.test.js
```
