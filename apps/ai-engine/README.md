# Log-Shield AI Engine

Dataset foundation menyiapkan dataset canonical untuk pekerjaan AI Engineer dan AI Scientist sebelum masuk training model.

## Sumber Data Lokal

- `dataset/Banjir-Longsor/data_distribusi_final.csv`
- `dataset/Banjir-Longsor/data_pengungsi_bnpb_final.csv`
- `dataset/GempaBumi-tsunami/features_demografi.csv`
- `dataset/GempaBumi-tsunami/targets_logistik.csv`
- `dataset/Gunung-Meletus/logshield_gunung_meletus.csv`

## Output

- `data/processed/logshield_timeseries.csv`
- `data/processed/logshield_dataset_report.json`

Dataset output berbentuk long time series harian:

```text
date + kib_bencana_id + posko_id + item_name -> kebutuhan, distribusi, stok, demografi
```

## Jalankan Pipeline

```powershell
python apps/ai-engine/scripts/prepare_data.py
python apps/ai-engine/scripts/validate_data.py
```

## Baseline Forecasting

Baseline forecasting membuat prediksi 7 hari untuk `target_need_qty` per `kib_bencana_id + posko_id + item_name`.

```powershell
python apps/ai-engine/scripts/train_baseline.py
```

Output:

- `data/forecasting/baseline_metrics.csv`
- `data/forecasting/baseline_forecast_7d.csv`
- `data/forecasting/baseline_summary.json`

## Recommendation Engine

Recommendation engine mengubah forecast menjadi rekomendasi distribusi, risk level, trust score, dan Rationale Chips rule-based.

```powershell
python apps/ai-engine/scripts/build_recommendations.py
```

Output:

- `data/recommendations/distribution_recommendations.csv`
- `data/recommendations/recommendation_summary.json`

## Anomaly Detection

Anomaly detection menandai demand spike, stok kritis, fulfillment gap, dan stock drop.

```powershell
python apps/ai-engine/scripts/detect_anomalies.py
```

Output:

- `data/anomalies/anomaly_events.csv`
- `data/anomalies/anomaly_summary.json`

## API Service

Install dependency:

```powershell
pip install -r apps/ai-engine/requirements.txt
```

Run service:

```powershell
uvicorn logshield_ai.api:app --app-dir apps/ai-engine --reload --port 8000
```

Endpoints:

- `GET /health`
- `GET /summary`
- `POST /refresh`
- `GET /summary/dashboard`
- `GET /forecasts`
- `GET /recommendations`
- `GET /recommendations/top-critical`
- `GET /anomalies`
- `GET /anomalies/recent`

Artifact smoke test tanpa FastAPI:

```powershell
python apps/ai-engine/scripts/smoke_test_artifacts.py
```

## Rebuild All Artifacts

Jalankan seluruh pipeline dari data preparation sampai smoke test:

```powershell
python apps/ai-engine/scripts/run_pipeline.py
```

Output summary:

- `data/pipeline_summary.json`

## Catatan Modeling

- Baris real berasal dari data distribusi banjir-longsor.
- Baris synthetic berasal dari target logistik gempa-tsunami yang diekspansi menjadi 45 hari.
- Data sintetis mengikuti pola respons bencana: kebutuhan lebih tinggi pada minggu pertama, variasi mingguan, shock demand, restock periodik, dan penurunan kebutuhan setelah fase stabil.
- Kolom `is_synthetic` wajib dipakai saat evaluasi agar performa pada data real dan data sintetis tidak tercampur tanpa sadar.
- `baseline_summary.json` memisahkan `metric_breakdown.real`, `metric_breakdown.synthetic`, dan `metric_breakdown.mixed`.
- Backend dapat mengonsumsi AI melalui `/api/ai/*` dan menyimpan snapshot dashboard ke CouchDB lewat `POST /api/ai/sync`.
