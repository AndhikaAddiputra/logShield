# AI Prediction & Rationale — Refactor Plan

## Masalah Saat Ini

### 1. Prediksi Tidak Realistis

| Item | Prediksi/hari | Realita |
|------|--------------|---------|
| Radio HT | 733 unit | Radio tidak dikonsumsi harian — sekali distribusi untuk 1 posko |
| Baterai | 733 pcs | Baterai mungkin 1-2 pcs/unit RT per minggu, bukan 733/hari |
| Tenda kecil | 733 unit | Tenda adalah aset jangka panjang, bukan harian |
| Beras | 270 kg | Masuk akal (500 org × 0.4 kg + vulnerable) |
| Air bersih | 14.660 liter | Masuk akal (628 org × 20L + vulnerable) |

**Akar masalah:**
- `DEFAULT_DAILY_NEED_PER_PERSON = 1.0` untuk semua item yang tidak punya standar → terlalu besar untuk barang non-konsumtif
- Semua item dipaksa model "harian" → barang modal (radio, tenda, matras) jadi tidak realistis
- Tidak ada perbedaan kategori: frekuensi konsumsi, masa pakai, unit distribusi

### 2. Rationale Chips Template

```
Chip 1: "Ada 350 pengungsi rentan yang menaikkan prioritas bantuan posko ini."
Chip 2: "Kebutuhan harian Beras posko ini 270.0 kg, alokasi safety stock 135 kg."
```

- Selalu 2 chip, urutan sama, struktur kalimat sama
- Tidak mencerminkan kondisi aktual (tren stok, riwayat permintaan, kecepatan distribusi)
- Tidak ada variasi berdasarkan risk level, commodity type, atau data historis

---

## Rencana Refactor

### Fase 1: Klasifikasi Jenis Komoditas (Backend JS + AI Engine)

Buat kategori baru untuk menentukan model prediksi yang tepat:

```python
COMMODITY_CLASS = {
    "konsumsi_harian": {
        "items": ["beras", "air_minum", "air_bersih", "mie_instan", "minyak_goreng",
                  "protein", "mpasi", "obat_obatan", "masker"],
        "model": "daily_per_person",        # kebutuhan = jumlah orang × standar × multiplier
        "display_unit": "/hari",
    },
    "konsumsi_berkala": {
        "items": ["pembalut", "popok_bayi", "hygiene_kit", "sabun", "shampoo"],
        "model": "weekly_per_person",       # kebutuhan = (jumlah orang × standar) / 7 per hari
        "display_unit": "/hari",
    },
    "perlengkapan_tahan_lama": {
        "items": ["selimut", "matras", "tenda", "terpal", "ember", "gayung"],
        "model": "lump_sum",               # kebutuhan = jumlah orang × rasio kepemilikan (0.xx)
        "display_unit": "unit (total)",
    },
    "elektronik_logistik": {
        "items": ["radio ht", "baterai", "powerbank", "lampu", "kabel", "charger"],
        "model": "unit_per_posko",          # kebutuhan = jumlah posko × rasio
        "display_unit": "unit",
    },
}
```

**Dampak:** Radio HT tidak lagi 733/hari, tapi `1 × jumlah_posko` = 5-10 unit.

### Fase 2: Perbaiki Formula Cold-Start (Backend JS + AI Engine)

#### 2a. STANDARD_NEED diperluas

Tambahkan kolom `period_days` untuk tiap komoditas:

```python
STANDARD_NEED = {
    "beras":        {"qty": 0.4, "unit": "kg",   "period_days": 1,  "class": "konsumsi_harian"},
    "selimut":      {"qty": 0.02, "unit": "pcs",  "period_days": 365, "class": "perlengkapan_tahan_lama"},
    "radio_ht":     {"qty": 0.02, "unit": "unit", "period_days": 730, "class": "elektronik_logistik"},
    "baterai":      {"qty": 0.5, "unit": "pcs",  "period_days": 30, "class": "konsumsi_berkala"},
}
```

**Rumus baru:**

```
if item_class == "konsumsi_harian":
    forecast = total_pengungsi × need.qty × vulnerable_multiplier

elif item_class == "konsumsi_berkala":
    forecast = (total_pengungsi × need.qty) / need.period_days × vulnerable_multiplier

elif item_class == "perlengkapan_tahan_lama":
    deficit = max((total_pengungsi × need.qty) - current_stock, 0)
    forecast = deficit / 7  # ratakan ke 7 hari untuk safety stock

elif item_class == "elektronik_logistik":
    forecast = max(active_posko_count × need.qty, 1)  # 1-2 unit per posko
```

#### 2b. Recalculate di Backend JS

Update `DAILY_NEED_PER_PERSON` + `recalcForecastQty()` di `ai.js` untuk pakai klasifikasi di atas. Sinkronkan dengan AI engine.

### Fase 3: Rationale Chips Variatif

Buat generator chips dinamis berdasarkan data aktual:

```
DATA SOURCE                        → CHIP
──────────────────────────────────────────────
request trend (7 hari)             → "Permintaan beras naik 120% dalam 7 hari terakhir."
stock depletion rate               → "Stok berkurang 50 kg/hari — habis dalam 19 hari."
vulnerable ratio                   → "35% pengungsi adalah kelompok rentan."
coverage days (realistic)          → "Stok hanya cukup untuk 3.5 hari ke depan."
item class                         → "Radio HT adalah perlengkapan tahan lama — distribusi 1x."
last distribution                  → "Distribusi terakhir: 7 hari lalu."
quantity vs threshold              → "Stok (950 kg) masih aman di atas batas minimum (100 kg)."
multiple critical items same posko → "Ada 3 item kritis di posko ini."
```

**Kriteria pemilihan chip (max 3 per rekomendasi):**

```
Priority 1: Jika shortage → chip shortage (stok minus)
Priority 2: Jika coverage < threshold → chip coverage
Priority 3: Jika trend request naik >50% → chip trend
Priority 4: Jika vulnerable >20% → chip vulnerable
Default: Chip kebutuhan harian
```

**Contoh output baru:**

```
Radio HT (aman):
  → "Radio HT adalah perlengkapan tahan lama — distribusi 1-2 unit per posko."
  → "Tidak ada permintaan baru untuk Radio HT dalam 30 hari terakhir."

Beras (kritis):
  → "Permintaan beras naik 80% dalam 3 hari terakhir."
  → "Stok hanya cukup untuk 2 hari ke depan."
  → "35% pengungsi adalah balita/lansia/disabilitas."

Baterai (waspada):
  → "Stok baterai berkurang 40% dalam seminggu."
  → "Distribusi terakhir 14 hari lalu — perlu rotasi stok."
```

### Fase 4: Aktifkan TTM (Time Series Model)

TTM memberikan prediksi berbasis data historis, bukan rule-based.

**Langkah:**
1. Install manual di container: `pip install torch granite-tsfm` (20-30 menit build)
2. Pastikan ada history ≥ 30 hari di CouchDB
3. TTM otomatis dipilih kalau history cukup, fallback ke cold-start jika tidak
4. TTM menghasilkan forecast per komoditas per posko dengan confidence interval lebih akurat

### Fase 5: Data-Driven Attribution

Ganti `attribution_values` statis dengan SHAP-like analysis:

```
Saat ini:
  attribution_values = { requested_qty: 0, current_stock_qty: 0.97, vulnerable_count: 0.03 }

Target:
  attribution_values = {
    "trend_30d_increase": 0.45,    # kenaikan permintaan 30 hari
    "stock_depletion_rate": 0.30,  # kecepatan habis stok
    "vulnerable_ratio": 0.15,      # rasio rentan
    "seasonal_factor": 0.10,       # faktor musiman/bencana
  }
```

### Prioritas & Estimasi

| Fase | Effort | Impact | Ketergantungan |
|------|--------|--------|----------------|
| 1. Klasifikasi komoditas | 1 hari | Tinggi | — |
| 2. Formula baru | 1-2 hari | Tinggi | Fase 1 |
| 3. Rationale chips | 1 hari | Sedang | Fase 1 |
| 4. TTM activation | 2-3 jam | Tinggi | History ≥ 30 hari |
| 5. Data attribution | 1-2 hari | Rendah | Fase 2 |

**Rekomendasi:** Kerjakan Fase 1 → 2 → 3 dulu. Fase 4 optional (butuh history). Fase 5 nice-to-have.
