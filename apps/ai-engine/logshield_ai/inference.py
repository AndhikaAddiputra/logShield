from __future__ import annotations

import json
import math
import os
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from logshield_ai.recommendation import recommend_distribution

ROOT = Path(__file__).resolve().parents[3]
TTM_RUNTIME_ENV = "LOGSHIELD_TTM_PYTHON"
TTM_WINDOWS_PYTHON = ROOT / ".venv-ttm" / "Scripts" / "python.exe"
TTM_POSIX_PYTHON = ROOT / ".venv-ttm" / "bin" / "python"
TTM_MODEL_DIR = ROOT / "apps" / "ai-engine" / "models" / "tinytimemixer"
TTM_METRICS_JSON = ROOT / "data" / "tinytimemixer" / "tinytimemixer_metrics.json"

MODEL_VERSION = "ttm-logshield-v1"
MODEL_BACKEND = "tinytimemixer"
CONTEXT_LENGTH = 30
HORIZON = 7

COMMODITY_SPECS = {
    "air_bersih":    {"qty": 20.0,  "unit": "liter", "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "air_minum":     {"qty": 4.0,   "unit": "liter", "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "beras":         {"qty": 0.4,   "unit": "kg",    "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "mie_instan":    {"qty": 2.0,   "unit": "pcs",   "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "minyak_goreng": {"qty": 0.03,  "unit": "liter", "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "protein":       {"qty": 0.05,  "unit": "kg",    "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "mpasi":         {"qty": 0.2,   "unit": "kg",    "period_days": 1,   "class": "konsumsi_harian",         "category": "pangan"},
    "obat_obatan":   {"qty": 0.05,  "unit": "pcs",   "period_days": 1,   "class": "konsumsi_harian",         "category": "sandang"},
    "masker":        {"qty": 1.0,   "unit": "pcs",   "period_days": 1,   "class": "konsumsi_harian",         "category": "sandang"},

    "pembalut":      {"qty": 8.0,   "unit": "pcs",   "period_days": 28,  "class": "konsumsi_berkala",        "category": "sandang"},
    "popok_bayi":    {"qty": 30.0,  "unit": "pcs",   "period_days": 14,  "class": "konsumsi_berkala",        "category": "sandang"},
    "hygiene_kit":   {"qty": 1.0,   "unit": "kit",   "period_days": 30,  "class": "konsumsi_berkala",        "category": "sandang"},
    "baterai":       {"qty": 4.0,   "unit": "pcs",   "period_days": 30,  "class": "konsumsi_berkala",        "category": "lainnya"},

    "selimut":       {"qty": 1.0,   "unit": "pcs",   "period_days": 365, "class": "perlengkapan_tahan_lama", "category": "sandang"},
    "matras":        {"qty": 1.0,   "unit": "pcs",   "period_days": 365, "class": "perlengkapan_tahan_lama", "category": "sandang"},

    "radio_ht":      {"qty": 2.0,   "unit": "unit",  "period_days": 730, "class": "elektronik_logistik",     "category": "lainnya"},
}

DEFAULT_DAILY_NEED_PER_PERSON = 1.0
TOP_EXPLANATION_FEATURES = 3
ATTRIBUTION_FEATURES = {
    "past_target_need_qty": "Pola kebutuhan 30 hari terakhir memengaruhi estimasi kebutuhan berikutnya.",
    "past_current_stock_qty": "Riwayat stok terakhir ikut membentuk estimasi risiko kebutuhan.",
    "past_distributed_qty": "Riwayat distribusi sebelumnya memengaruhi estimasi kebutuhan mendatang.",
    "past_requested_qty": "Riwayat permintaan logistik menjadi sinyal penting dalam prediksi.",
    "requested_qty": "Permintaan logistik awal menjadi sinyal penting untuk rekomendasi awal.",
    "current_stock_qty": "Stok saat ini memengaruhi estimasi risiko distribusi.",
    "vulnerable_count": "Jumlah kelompok rentan menaikkan prioritas bantuan.",
}


@dataclass(frozen=True)
class HistoryPoint:
    date: str
    target_need_qty: float
    current_stock_qty: float
    distributed_qty: float
    requested_qty: float


@dataclass(frozen=True)
class InferenceRequest:
    kib_bencana_id: str
    disaster_type: str
    posko_id: str
    posko_name: str
    item_name: str
    item_category: str
    unit: str
    total_pengungsi: int
    vulnerable_count: int
    current_stock_qty: float
    requested_qty: float
    critical_stock_threshold: float
    history: list[HistoryPoint]


def model_status() -> dict[str, Any]:
    metrics = {}
    if TTM_METRICS_JSON.exists():
        metrics = json.loads(TTM_METRICS_JSON.read_text(encoding="utf-8"))
    runtime = resolve_ttm_python()
    return {
        "model_version": MODEL_VERSION,
        "model_backend": MODEL_BACKEND,
        "status": "ready" if runtime and TTM_MODEL_DIR.exists() else "missing_runtime_or_model",
        "runtime": display_runtime(runtime),
        "model_path": str(TTM_MODEL_DIR.relative_to(ROOT)) if TTM_MODEL_DIR.exists() else None,
        "context_length": CONTEXT_LENGTH,
        "horizon": HORIZON,
        "metrics": {
            "validation": metrics.get("validation"),
            "test": metrics.get("test"),
            "epochs_completed": metrics.get("epochs_completed"),
            "best_epoch": metrics.get("best_epoch"),
        },
    }


def resolve_ttm_python() -> Path | None:
    configured = os.environ.get(TTM_RUNTIME_ENV)
    candidates = [
        Path(configured) if configured else None,
        TTM_WINDOWS_PYTHON,
        TTM_POSIX_PYTHON,
        Path(sys.executable),
    ]
    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate
    return None


def display_runtime(runtime: Path | None) -> str | None:
    if runtime is None:
        return None
    try:
        return str(runtime.relative_to(ROOT))
    except ValueError:
        return str(runtime)


def parse_inference_request(payload: dict[str, Any]) -> InferenceRequest:
    history = [
        HistoryPoint(
            date=str(point["date"]),
            target_need_qty=float(point.get("target_need_qty", 0)),
            current_stock_qty=float(point.get("current_stock_qty", 0)),
            distributed_qty=float(point.get("distributed_qty", 0)),
            requested_qty=float(point.get("requested_qty", 0)),
        )
        for point in payload.get("history", [])
    ]
    if len(history) > CONTEXT_LENGTH:
        history = history[-CONTEXT_LENGTH:]

    return InferenceRequest(
        kib_bencana_id=str(payload["kib_bencana_id"]),
        disaster_type=str(payload["disaster_type"]),
        posko_id=str(payload["posko_id"]),
        posko_name=str(payload.get("posko_name", payload["posko_id"])),
        item_name=str(payload["item_name"]),
        item_category=str(payload.get("item_category", "")),
        unit=str(payload.get("unit", "unit")),
        total_pengungsi=int(payload.get("total_pengungsi", 0)),
        vulnerable_count=int(payload.get("vulnerable_count", 0)),
        current_stock_qty=float(payload.get("current_stock_qty", history[-1].current_stock_qty if history else 0)),
        requested_qty=float(payload.get("requested_qty", history[-1].requested_qty if history else 0)),
        critical_stock_threshold=float(payload.get("critical_stock_threshold", 0)),
        history=history,
    )


def inference_mode(request: InferenceRequest) -> str:
    return "time_series" if len(request.history) == CONTEXT_LENGTH else "cold_start"


def normalize_item_name(item_name: str) -> str:
    return item_name.strip().lower().replace(" ", "_").replace("-", "_")


def cold_start_daily_need(request: InferenceRequest) -> float:
    item_key = normalize_item_name(request.item_name)
    spec = COMMODITY_SPECS.get(item_key)
    vulnerable_ratio = request.vulnerable_count / max(request.total_pengungsi, 1)
    vulnerable_multiplier = 1.0 + min(vulnerable_ratio, 0.35)

    if spec is None:
        base_need = max(request.total_pengungsi, 1) * DEFAULT_DAILY_NEED_PER_PERSON
    elif spec["class"] == "konsumsi_harian":
        base_need = max(request.total_pengungsi, 1) * spec["qty"]
    elif spec["class"] == "konsumsi_berkala":
        base_need = (max(request.total_pengungsi, 1) * spec["qty"]) / spec["period_days"]
    elif spec["class"] == "perlengkapan_tahan_lama":
        total_needed = max(int(math.ceil(max(request.total_pengungsi, 1) * spec["qty"])), 1)
        base_need = total_needed / 7
    elif spec["class"] == "elektronik_logistik":
        base_need = spec["qty"]
    else:
        base_need = max(request.total_pengungsi, 1) * spec.get("qty", 1.0)

    latest_requested = request.history[-1].requested_qty if request.history else 0.0
    latest_need = request.history[-1].target_need_qty if request.history else 0.0
    base_need = max(base_need, request.requested_qty, latest_requested, latest_need, request.critical_stock_threshold * 0.35)
    return round(max(base_need * vulnerable_multiplier, 0.0), 2)


def cold_start_forecast(request: InferenceRequest) -> list[float]:
    day_one_need = cold_start_daily_need(request)
    disaster_curve = [1.0, 1.04, 1.07, 1.06, 1.04, 1.02, 1.0]
    return [round(day_one_need * multiplier, 2) for multiplier in disaster_curve]


def forecast_need(request: InferenceRequest) -> list[float]:
    return forecast_with_attribution(request)["forecast"]


def forecast_with_attribution(request: InferenceRequest) -> dict[str, Any]:
    if inference_mode(request) == "cold_start":
        return {
            "forecast": cold_start_forecast(request),
            "attribution": cold_start_attribution(request),
            "attribution_method": "cold_start_rule_attribution",
        }

    runtime = resolve_ttm_python()
    if runtime is None:
        raise RuntimeError(
            f"TinyTimeMixer Python runtime is missing. Set {TTM_RUNTIME_ENV} or install .venv-ttm."
        )
    if not TTM_MODEL_DIR.exists():
        raise RuntimeError("TinyTimeMixer model artifact is missing. Run train_tinytimemixer.py first.")

    completed = subprocess.run(
        [
            str(runtime),
            str(ROOT / "apps" / "ai-engine" / "scripts" / "predict_tinytimemixer.py"),
            "--model-dir",
            str(TTM_MODEL_DIR),
        ],
        input=json.dumps({"history": [asdict(point) for point in request.history]}, ensure_ascii=False),
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if completed.returncode != 0:
        message = completed.stderr.strip() or completed.stdout.strip() or "TinyTimeMixer inference failed"
        raise RuntimeError(message)
    result = json.loads(completed.stdout)
    return {
        "forecast": [round(max(float(value), 0.0), 2) for value in result["forecast"]],
        "attribution": {
            str(key): round(float(value), 6)
            for key, value in dict(result.get("attribution", {})).items()
        },
        "attribution_method": "ttm_gradient_x_input",
    }


def forecast_dates(history: list[HistoryPoint]) -> list[str]:
    last_date = datetime.strptime(history[-1].date, "%Y-%m-%d").date() if history else datetime.now().date()
    return [(last_date + timedelta(days=offset)).isoformat() for offset in range(1, HORIZON + 1)]


def forecast_dates_from_request(request: InferenceRequest) -> list[str]:
    return forecast_dates(request.history)


def infer_need(payload: dict[str, Any]) -> dict[str, Any]:
    request = parse_inference_request(payload)
    prediction = forecast_with_attribution(request)
    forecast_values = prediction["forecast"]
    dates = forecast_dates_from_request(request)
    return {
        "model_version": MODEL_VERSION,
        "model_backend": MODEL_BACKEND,
        "inference_mode": inference_mode(request),
        "forecast": [
            {
                "forecast_date": date,
                "forecast_target_need_qty": value,
            }
            for date, value in zip(dates, forecast_values)
        ],
        "prediction_documents": build_prediction_documents(
            request,
            dates,
            forecast_values,
            attribution_values=prediction.get("attribution", {}),
            attribution_method=prediction.get("attribution_method"),
        ),
    }


def infer_recommendation(payload: dict[str, Any]) -> dict[str, Any]:
    request = parse_inference_request(payload)
    prediction = forecast_with_attribution(request)
    forecast_values = prediction["forecast"]
    dates = forecast_dates_from_request(request)
    model_mape = model_status().get("metrics", {}).get("validation", {}).get("mape")
    model_mae = model_status().get("metrics", {}).get("validation", {}).get("mae")
    mode = inference_mode(request)
    daily_recommendations = []
    prediction_documents = build_prediction_documents(
        request=request,
        dates=dates,
        forecast_values=forecast_values,
        attribution_values=prediction.get("attribution", {}),
        attribution_method=prediction.get("attribution_method"),
        model_mae=float(model_mae) if model_mae is not None else None,
        model_mape=float(model_mape) if model_mape is not None else None,
    )

    for date, forecast_qty, prediction_doc in zip(dates, forecast_values, prediction_documents):
        recommendation = recommend_distribution(
            item_name=request.item_name,
            forecast_qty=forecast_qty,
            current_stock_qty=request.current_stock_qty,
            critical_stock_threshold=request.critical_stock_threshold,
            total_pengungsi=request.total_pengungsi,
            vulnerable_count=request.vulnerable_count,
            series_length=len(request.history),
            model_mape=float(model_mape) if model_mape is not None and mode == "time_series" else None,
        )
        rationale_chips = list(recommendation.rationale_chips)
        if mode == "cold_start":
            rationale_chips.insert(0, "Rekomendasi awal dibuat karena riwayat posko belum mencapai 30 hari.")
            rationale_chips = rationale_chips[:4]
        rationale_objects = build_rationale_objects(
            request=request,
            text_chips=rationale_chips,
            prediction_doc=prediction_doc,
        )
        daily_recommendations.append(
            {
                "forecast_date": date,
                "forecast_target_need_qty": forecast_qty,
                "recommended_qty": recommendation.recommended_qty,
                "shortage_qty": recommendation.shortage_qty,
                "coverage_days": recommendation.coverage_days,
                "risk_level": recommendation.risk_level,
                "priority_score": recommendation.priority_score,
                "trust_score": recommendation.trust_score,
                "rationale_chips": rationale_chips,
                "rationale_chip_details": rationale_objects,
            }
        )

    top = max(daily_recommendations, key=lambda row: (row["priority_score"], row["recommended_qty"]))
    return {
        "model_version": MODEL_VERSION,
        "model_backend": MODEL_BACKEND,
        "inference_mode": mode,
        "kib_bencana_id": request.kib_bencana_id,
        "disaster_type": request.disaster_type,
        "posko_id": request.posko_id,
        "posko_name": request.posko_name,
        "item_name": request.item_name,
        "item_category": request.item_category,
        "unit": request.unit,
        "current_stock_qty": request.current_stock_qty,
        "critical_stock_threshold": request.critical_stock_threshold,
        "horizon_days": HORIZON,
        "daily_recommendations": daily_recommendations,
        "top_recommendation": top,
        "prediction_documents": prediction_documents,
        "explainability": {
            "method": prediction.get("attribution_method"),
            "note": "Rationale chips use live attribution from the active inference path plus rule-based operational rationale.",
            "top_features": [chip["feature"] for chip in prediction_documents[0]["rationale_chips"][:TOP_EXPLANATION_FEATURES]]
            if prediction_documents
            else [],
        },
    }


def build_prediction_documents(
    request: InferenceRequest,
    dates: list[str],
    forecast_values: list[float],
    attribution_values: dict[str, float] | None = None,
    attribution_method: str | None = None,
    model_mae: float | None = None,
    model_mape: float | None = None,
) -> list[dict[str, Any]]:
    attribution = attribution_values or cold_start_attribution(request)
    chips = attribution_rationale_chips(attribution)
    interval_ratio = confidence_interval_ratio(model_mape)
    documents = []
    for date, value in zip(dates, forecast_values):
        documents.append(
            {
                "_id": f"prediction::{request.posko_id}::{request.item_name}::{date}",
                "type": "prediction",
                "posko_id": request.posko_id,
                "commodity": request.item_name,
                "prediction_date": date,
                "predicted_qty": value,
                "unit": request.unit,
                "predicted_kg": value if request.unit == "kg" else None,
                "confidence_low": round(max(value * (1.0 - interval_ratio), 0.0), 2),
                "confidence_high": round(value * (1.0 + interval_ratio), 2),
                "mae_last_7d": round(model_mae, 4) if model_mae is not None else None,
                "attribution_method": attribution_method or "rule_attribution",
                "attribution_values": attribution,
                "rationale_chips": chips,
                "model_version": MODEL_VERSION,
                "created_at": datetime.now().isoformat(timespec="seconds"),
            }
        )
    return documents


def confidence_interval_ratio(model_mape: float | None) -> float:
    if model_mape is None:
        return 0.2
    return min(max(model_mape * 2.5, 0.08), 0.35)


def cold_start_attribution(request: InferenceRequest) -> dict[str, float]:
    values = {
        "requested_qty": request.requested_qty,
        "current_stock_qty": request.current_stock_qty,
        "vulnerable_count": float(request.vulnerable_count),
    }
    total = sum(abs(value) for value in values.values()) or 1.0
    return {key: round(abs(value) / total, 6) for key, value in values.items()}


def attribution_rationale_chips(attribution_values: dict[str, float]) -> list[dict[str, Any]]:
    return [
        {
            "feature": feature,
            "narrative": attribution_narrative(feature),
            "attribution_value": value,
        }
        for feature, value in sorted(attribution_values.items(), key=lambda item: abs(item[1]), reverse=True)[
            :TOP_EXPLANATION_FEATURES
        ]
    ]


def attribution_narrative(feature: str) -> str:
    return ATTRIBUTION_FEATURES.get(feature, f"Fitur {feature} memengaruhi hasil prediksi.")


def build_rationale_objects(
    request: InferenceRequest,
    text_chips: list[str],
    prediction_doc: dict[str, Any],
) -> list[dict[str, Any]]:
    attribution_chips = list(prediction_doc.get("rationale_chips", []))
    details = attribution_chips[:2]
    if text_chips:
        details.append(
            {
                "feature": "operational_risk",
                "narrative": text_chips[0],
                "attribution_value": 0.0,
            }
        )
    if request.vulnerable_count > 0 and len(details) < TOP_EXPLANATION_FEATURES:
        details.append(
            {
                "feature": "vulnerable_count",
                "narrative": f"Ada {request.vulnerable_count} pengungsi rentan yang menaikkan prioritas bantuan.",
                "attribution_value": 0.0,
            }
        )
    return details[:TOP_EXPLANATION_FEATURES]
