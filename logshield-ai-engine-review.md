# Review AI Engine LogShield

> Cara kerja, input-output, batasan, dan panduan pemanfaatan maksimal
> **Tanggal:** 20 Mei 2026

---

## Ringkasan Eksekutif

AI Engine LogShield sudah layak untuk MVP inference dan demo operasional. Model utama yang digunakan adalah **TinyTimeMixer (TTM)** untuk prediksi kebutuhan logistik 7 hari ke depan berdasarkan 30 hari riwayat data. StatsForecast tetap digunakan sebagai baseline pembanding, bukan jalur inference utama.

| Metrik | Nilai |
|---|---|
| TTM Validation MAPE | 3.28% |
| TTM Test MAPE | 2.87% |
| Baseline StatsForecast terbaik | 6.82% MAPE |
| Target deliverable | < 15% error |

AI Engine juga memiliki **fallback cold start** untuk posko atau item yang belum punya 30 hari riwayat, agar sistem tetap bisa memberi rekomendasi sejak hari pertama operasi bencana.

---

## Tujuan AI Engine

AI Engine menjawab empat pertanyaan utama koordinator logistik:

1. Posko mana yang perlu diprioritaskan?
2. Item apa yang berisiko kurang?
3. Berapa jumlah barang yang sebaiknya dikirim?
4. Mengapa sistem memberi rekomendasi tersebut?

Output akhir adalah rekomendasi distribusi yang dilengkapi **risk level**, **priority score**, **trust score**, dan **rationale chips**.

---

## Cara Kerja

### Alur Utama

```
Input kondisi posko & item
  → Pilih mode inference
  → Prediksi kebutuhan 7 hari
  → Hitung shortage & safety stock
  → Tentukan risk level & priority score
  → Hasilkan rationale chips
  → Keluarkan rekomendasi distribusi
```

### Mode Inference

#### 1. Time-Series Mode
Dipakai saat riwayat **30 hari lengkap** tersedia. TTM membaca empat channel:
- `target_need_qty`
- `current_stock_qty`
- `distributed_qty`
- `requested_qty`

#### 2. Cold-Start Mode
Dipakai saat riwayat **kurang dari 30 hari atau kosong**. Menggunakan formula kebutuhan awal berbasis jumlah pengungsi, kelompok rentan, request awal, stok saat ini, dan batas stok kritis.

---

## Model dan Baseline

| Model | Peran |
|---|---|
| **TTM** | Model utama inference |
| **StatsForecast** | Baseline pembanding |

TTM mengungguli baseline dengan selisih signifikan (2.87% vs 6.82% MAPE).

---

## Explainability

AI Engine menggunakan **live attribution** dari TTM dengan metode **gradient × input** — menghitung pengaruh relatif channel input terhadap output model saat inference berjalan.

### Contoh Output Attribution

```json
{
  "attribution_method": "ttm_gradient_x_input",
  "attribution_values": {
    "past_target_need_qty": 1.0,
    "past_current_stock_qty": 0.0,
    "past_distributed_qty": 0.0,
    "past_requested_qty": 0.0
  }
}
```

Attribution diterjemahkan menjadi **rationale chips** bahasa Indonesia, contoh:
- *Pola kebutuhan 30 hari terakhir memengaruhi estimasi kebutuhan berikutnya.*
- *Riwayat stok terakhir ikut membentuk estimasi risiko kebutuhan.*
- *Riwayat distribusi sebelumnya memengaruhi estimasi kebutuhan mendatang.*

Selain attribution model, ditambahkan juga **operational rationale**, contoh:
- *Coverage stok kurang dari 1 hari.*
- *Ada kelompok rentan yang menaikkan prioritas.*
- *Stok kurang dari kebutuhan dan safety stock.*

---

## Input yang Dibutuhkan

**Endpoint:** `POST /infer/recommendation`

### Payload Minimal

```json
{
  "kib_bencana_id": "BNC-2024-GM-RUANG",
  "disaster_type": "gunung_meletus",
  "posko_id": "POSKO-1A3E3900",
  "posko_name": "Posko Kisihang",
  "item_name": "air_bersih",
  "item_category": "air_sanitasi",
  "unit": "liter",
  "total_pengungsi": 970,
  "vulnerable_count": 250,
  "current_stock_qty": 12400,
  "critical_stock_threshold": 35860.28,
  "requested_qty": 30000,
  "history": []
}
```

> Jika `history` kosong → **cold-start mode**. Jika berisi 30 data → **time-series mode**.

### Format Item History

```json
{
  "date": "2024-05-11",
  "target_need_qty": 14500,
  "current_stock_qty": 18000,
  "distributed_qty": 12000,
  "requested_qty": 15000
}
```

---

## Output Utama

Field yang dikembalikan oleh `/infer/recommendation`:

- `model_version`
- `model_backend`
- `inference_mode`
- `horizon_days`
- `daily_recommendations`
- `top_recommendation`
- `prediction_documents`
- `explainability`

### Contoh Output

```json
{
  "model_version": "ttm-logshield-v1",
  "model_backend": "tinytimemixer",
  "inference_mode": "time_series",
  "horizon_days": 7,
  "top_recommendation": {
    "forecast_date": "2024-06-09",
    "forecast_target_need_qty": 13914.88,
    "recommended_qty": 32467.3,
    "shortage_qty": 32467.3,
    "coverage_days": 0.89,
    "risk_level": "kritis",
    "priority_score": 95.43,
    "trust_score": 0.91,
    "rationale_chips": [
      "Stok air_bersih kurang 32467.30 unit dari kebutuhan dan safety stock.",
      "Coverage stok kurang dari 1 hari sehingga perlu prioritas distribusi."
    ]
  }
}
```

---

## Expected Behavior

### Time-Series Mode
- History harus 30 hari
- Output forecast 7 hari
- `inference_mode` = `time_series`
- Attribution method = `ttm_gradient_x_input`
- `top_recommendation` dipilih dari hari dengan priority score tertinggi

### Cold-Start Mode
- History boleh kosong atau < 30 hari
- Output forecast tetap 7 hari
- `inference_mode` = `cold_start`
- Rationale menjelaskan bahwa rekomendasi awal dibuat karena riwayat belum cukup

---

## Boundary dan Batasan

AI Engine adalah **decision support**, bukan pengambil keputusan final.

### Batasan Utama
- Tidak menggantikan validasi petugas lapangan
- Tidak menjamin angka distribusi final tanpa pengecekan stok fisik
- Tidak membaca konteks eksternal (cuaca, akses jalan, prioritas politik/logistik lokal)
- Cold-start adalah estimasi awal, bukan deep learning
- TTM paling kuat saat data historis lengkap dan input stabil
- Attribution menjelaskan pengaruh input model, bukan sebab-akibat dunia nyata secara mutlak

### Kondisi yang Perlu Hati-Hati
- Request input salah ketik atau terlalu besar
- Stok fisik belum diperbarui
- Posko baru tanpa riwayat
- Satuan barang tidak konsisten
- Jumlah pengungsi berubah cepat tapi belum masuk sistem

---

## Cara Memanfaatkan Maksimal

1. **Pastikan input harian konsisten** — kualitas prediksi sangat bergantung pada konsistensi `target_need_qty`, `current_stock_qty`, `distributed_qty`, dan `requested_qty`.
2. **Gunakan 30 hari history jika tersedia** — time-series mode memberi hasil lebih kuat daripada cold-start.
3. **Standarkan nama item dan satuan** — gunakan nama canonical (`air_bersih`, `beras`, `masker`, dll). Jangan campur `liter`, `ltr`, dan `L`.
4. **Tampilkan risk level dan rationale bersamaan** — jangan hanya tampilkan recommended quantity; petugas perlu alasan agar rekomendasi mudah dipercaya dan diaudit.
5. **Pakai trust score sebagai indikator kehati-hatian** — trust score rendah berarti perlu validasi manual lebih kuat.
6. **Simpan hasil inference penting** — simpan `model_version`, `inference_mode`, `timestamp`, `top_recommendation`, dan `prediction_documents` untuk audit.
7. **Review rekomendasi kritis lebih dahulu** — prioritaskan item dengan:
   - `risk_level` = `kritis`
   - `coverage_days` < 1
   - `shortage_qty` besar
   - `vulnerable_count` tinggi
   - `priority_score` tinggi

---

## Rekomendasi Pemakaian di UI

### Mobile
- Tampilkan 2–3 rationale chips saja
- Gunakan bahasa pendek
- Tampilkan status cold-start agar petugas tahu rekomendasi masih estimasi awal

### Dashboard
- Tampilkan daftar top critical
- Tampilkan filter posko, item, disaster type, dan risk level
- Tampilkan forecast 7 hari dalam chart
- Tampilkan attribution detail di panel expand/collapse

---

## Rekomendasi Teknis Lanjutan

1. Benchmark latency inference
2. Validasi hasil dengan data lapangan tambahan
3. Tambahkan scheduler refresh model/artifact harian
4. Simpan `prediction_documents` sebagai snapshot audit
5. Tambahkan evaluasi attribution agar rationale chips tidak terlalu teknis

---

## Kesimpulan

AI Engine LogShield sudah kuat untuk MVP. TTM melampaui target deliverable secara akurasi, dan sistem explainability sudah bergerak dari explanation offline ke live attribution yang terhubung langsung dengan prediksi TTM.

> AI ini paling tepat digunakan sebagai **sistem pendukung keputusan logistik**: memberi prioritas, estimasi kebutuhan, rekomendasi jumlah distribusi, dan alasan operasional yang bisa dipahami manusia.
