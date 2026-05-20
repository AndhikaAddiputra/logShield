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

## Training Dataset untuk Model AI

Training dataset membentuk fitur time-series dari canonical dataset untuk model baru:

- `StatsForecast` memakai format `unique_id`, `ds`, `y`.
- `TinyTimeMixers` memakai window historis 30 hari dan target horizon 7 hari.
- SHAP/explainability memakai fitur lag, rolling mean, stok, distribusi, dan demografi.

```powershell
python apps/ai-engine/scripts/build_training_dataset.py
python apps/ai-engine/scripts/smoke_test_training_dataset.py
```

Output:

- `data/processed/logshield_training_dataset.csv`
- `data/processed/logshield_statsforecast_dataset.csv`
- `data/processed/logshield_tinytimemixer_windows.jsonl`
- `data/processed/logshield_training_dataset_report.json`

## StatsForecast Training

StatsForecast menjadi baseline resmi untuk model time-series sebelum TinyTimeMixers dijadikan active model.

```powershell
pip install -r apps/ai-engine/requirements.txt
python apps/ai-engine/scripts/train_statsforecast.py
```

Output:

- `data/statsforecast/statsforecast_backtest.csv`
- `data/statsforecast/statsforecast_forecast_7d.csv`
- `data/statsforecast/statsforecast_metrics.json`
- `apps/ai-engine/models/statsforecast/statsforecast_model.pkl`

## SHAP Explainability

SHAP dipakai sebagai explainability layer. Untuk tahap awal, SHAP menjelaskan surrogate model dari engineered features agar rationale bisa dipetakan ke faktor seperti permintaan terakhir, tren kebutuhan, stok, dan demografi.

```powershell
python apps/ai-engine/scripts/explain_predictions.py
```

Output:

- `data/explainability/shap_report.json`
- `data/explainability/shap_background.csv`

## TinyTimeMixers

TinyTimeMixers memakai runtime resmi IBM Granite TSFM. Runtime tersebut saat ini membutuhkan Python `>=3.9,<3.13`, jadi gunakan Python 3.11 atau 3.12 untuk fine-tuning TTM.

Siapkan array train/validation/test:

```powershell
python apps/ai-engine/scripts/build_tinytimemixer_arrays.py
```

Output:

- `data/tinytimemixer/logshield_ttm_arrays.npz`
- `data/tinytimemixer/logshield_ttm_arrays_metadata.json`

Install runtime TTM di Python 3.11/3.12:

```powershell
pip install -r apps/ai-engine/requirements-ttm.txt
```

Jalankan runner TTM:

```powershell
python apps/ai-engine/scripts/train_tinytimemixer.py
```

Untuk environment lokal Windows saat ini, runtime TTM yang sudah disiapkan memakai:

```powershell
.venv-ttm/Scripts/python.exe apps/ai-engine/scripts/train_tinytimemixer.py
```

Konfigurasi awal:

- Model: `ibm-granite/granite-timeseries-ttm-r2`
- Epoch: `10`
- Early stopping patience: `3`
- Context length: `30`
- Horizon: `7`
- Input channels: kebutuhan, stok, distribusi, permintaan

Catatan implementasi: checkpoint pretrained `granite-timeseries-ttm-r2` native memakai konfigurasi context/patch yang berbeda dari dataset LogShield. Runner saat ini memakai arsitektur resmi TinyTimeMixer dengan konfigurasi LogShield-specific dan training dari scratch pada window lokal. Hasil 10 epoch pertama dengan konteks 30 hari:

- Validation MAE: `24.8368`
- Validation MAPE: `0.0328`
- Test MAE: `22.1291`
- Test MAPE: `0.0287`

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
- `GET /models/current`
- `POST /infer/need`
- `POST /infer/recommendation`
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

TTM inference smoke test:

```powershell
python apps/ai-engine/scripts/smoke_test_inference.py
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
