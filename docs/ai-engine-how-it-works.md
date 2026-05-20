# AI Engine — Cara Kerja

## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                   Mobile / Web Dashboard                    │
│  GET /api/ai/recommendations/top-critical                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Node.js) — server-backend              │
│  src/ai.js:                                                 │
│    - getRecommendationsFromDb()  ← rekomendasi live         │
│    - inferPoskoCommodities()     ← trigger infer AI         │
│    - recalcForecastQty()         ← formula cold-start (JS)  │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────┐   ┌──────────────────────┐
│   CouchDB        │   │ AI Engine (FastAPI)   │
│  - prediction    │   │ POST /infer/need      │
│  - asset         │   │ POST /infer/recommend  │
│  - posko         │   └──────────────────────┘
│  - request       │
│  - stock_movement│
└──────────────────┘
```

## Dua Jalur Prediksi

### 1. Cold-Start (Rule-Based) — Default

Formula di `inference.py`:

```
per_person_need = STANDARD_DAILY_NEED_PER_PERSON[commodity]
                = 0.4 kg  (beras)
                = 4.0 L   (air_minum)
                = 2.0 pcs (mie_instan)
                = ...

population_need = total_pengungsi × per_person_need

vulnerable_ratio     = vulnerable_count / total_pengungsi
vulnerable_multiplier = 1.0 + min(vulnerable_ratio, 0.35)
                      = max 1.35 (jika >35% rentan)

base_need = max(population_need, qty_requested, threshold × 0.35)
forecast  = base_need × vulnerable_multiplier
```

7-hari forecast dikalikan disaster curve:
```
[1.0, 1.04, 1.07, 1.06, 1.04, 1.02, 1.0]
```

### 2. TTM (Time Series) — Opsional

Membutuhkan `torch` + `granite-tsfm`. Tidak di Docker (build timeout).
Gunakan history 30 hari untuk prediksi 7 hari ke depan.

## Rekomendasi Live (Backend JS)

Saat dashboard request `GET /api/ai/recommendations/top-critical`, backend **tidak** proxy ke AI engine. Sebaliknya:

1. Baca dokumen `prediction` dari CouchDB (metadata: commodity, posko_id, attribution)
2. Baca data `posko` terkini (`total_pengungsi`, `count_balita/lansia/disabilitas`)
3. Baca data `asset` (`quantity_available` — stok pusat)
4. **Hitung ulang** forecast dengan `recalcForecastQty()` (sama persis formula cold-start AI engine)
5. Hitung safety stock, recommended allocation, priority score

```
recalcForecastQty(commodity, totalPengungsi, vulnerableCount, requestedQty, criticalThreshold)
  → daily_need_per_person[normalize(commodity)] × max(totalPengungsi,1)
  × (1 + min(vulnerableRatio, 0.35))
```

Jadi **setiap perubahan data pengungsi langsung bereaksi** tanpa perlu re-infer ke AI engine.

## Flow End-to-End

### Trigger Inference (dari Web Dashboard)
```
User klik "Jalankan Analisis" → POST /api/ai/infer/posko/:poskoId
  → inferPoskoCommodities()
    → Query CouchDB: asset, request, movement untuk posko tsb
    → Group by commodity
    → Untuk tiap commodity: POST /infer/recommend (AI Engine)
    → Simpan 7 prediction docs per commodity ke CouchDB
```

### Baca Rekomendasi (Mobile & Web)
```
GET /api/ai/recommendations/top-critical
  → getRecommendationsFromDb()
    → Baca prediction docs (metadata saja)
    → Baca posko + asset terkini
    → Recalculate forecast_qty dari data real-time
    → Hitung: recommended_qty, risk_level, priority_score
    → Return sorted by priority
```

## Struktur Prediction Doc di CouchDB

```json
{
  "_id": "prediction::posko::<id>::<commodity>::<date>",
  "type": "prediction",
  "posko_id": "posko::...",
  "commodity": "Beras",
  "prediction_date": "2026-05-21",
  "predicted_qty": 161.6,
  "unit": "kg",
  "confidence_low": 148.35,
  "confidence_high": 174.85,
  "attribution_method": "cold_start_rule_attribution",
  "attribution_values": {
    "requested_qty": 0,
    "current_stock_qty": 0.97,
    "vulnerable_count": 0.03
  },
  "rationale_chips": [
    { "feature": "current_stock_qty", "narrative": "...", "attribution_value": 0.97 }
  ],
  "model_version": "ttm-logshield-v1",
  "created_at": "2026-05-20T16:17:17"
}
```

## Risk & Priority (Backend JS)

Risk level berdasarkan **vulnerable ratio** posko (bukan stok pusat):

```
vulnerableRatio = (balita + lansia + disabilitas) / total_pengungsi

risk = kritis   jika vulnerableRatio > 30%
     = waspada  jika vulnerableRatio > 15%
     = aman     selebihnya

priority_score = risk_weight(5-35)
               + vulnerable_ratio_weight(0-20)
               + total_pengungsi_weight(0-15)
               + trust(0-2)
               + forecast_weight(0-10)
               = max 100
```

## Kolom di Mobile Dashboard

| Kolom | Sumber | Arti |
|-------|--------|------|
| KEBUTUHAN | `forecast_qty` | Prediksi kebutuhan harian posko ini (kg/hari) |
| REKOMENDASI | `recommended_qty` | Alokasi yang disarankan = forecast + safety stock |
| STOK PUSAT | `current_stock_qty` | Total stok gudang pusat (informasional) |

## Catatan

- **Cold-start**: Bekerja tanpa data historis, pakai standar kebutuhan per orang
- **TTM**: Perlu install manual `pip install torch granite-tsfm` di container
- **Live update**: Forecast otomatis recalculate saat `total_pengungsi` berubah (tanpa re-infer)
- **Stok pusat vs per-posko**: Saat request selesai (diproses → selesai), stok otomatis terkurangi dari asset pusat via `completeRequest()` di `requests.js`
