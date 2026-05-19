from __future__ import annotations

import json
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from logshield_ai.recommendation import recommend_distribution

ROOT = Path(__file__).resolve().parents[3]
TTM_PYTHON = ROOT / ".venv-ttm" / "Scripts" / "python.exe"
TTM_MODEL_DIR = ROOT / "apps" / "ai-engine" / "models" / "tinytimemixer"
TTM_METRICS_JSON = ROOT / "data" / "tinytimemixer" / "tinytimemixer_metrics.json"

MODEL_VERSION = "ttm-logshield-v1"
MODEL_BACKEND = "tinytimemixer"
CONTEXT_LENGTH = 30
HORIZON = 7

STANDARD_DAILY_NEED_PER_PERSON = {
    "air_bersih": 20.0,
    "air_minum": 4.0,
    "beras": 0.4,
    "mie_instan": 2.0,
    "minyak_goreng": 0.03,
    "protein": 0.05,
    "mpasi": 0.2,
    "hygiene_kit": 0.03,
    "selimut": 0.02,
    "matras": 0.02,
    "masker": 1.0,
    "obat_obatan": 0.05,
    "pembalut": 0.08,
    "popok_bayi": 0.3,
}

DEFAULT_DAILY_NEED_PER_PERSON = 1.0


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
    is_synthetic_series: str
    history: list[HistoryPoint]


def model_status() -> dict[str, Any]:
    metrics = {}
    if TTM_METRICS_JSON.exists():
        metrics = json.loads(TTM_METRICS_JSON.read_text(encoding="utf-8"))
    return {
        "model_version": MODEL_VERSION,
        "model_backend": MODEL_BACKEND,
        "status": "ready" if TTM_PYTHON.exists() and TTM_MODEL_DIR.exists() else "missing_runtime_or_model",
        "runtime": str(TTM_PYTHON.relative_to(ROOT)) if TTM_PYTHON.exists() else None,
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
        is_synthetic_series=str(payload.get("is_synthetic_series", "false")),
        history=history,
    )


def inference_mode(request: InferenceRequest) -> str:
    return "time_series" if len(request.history) == CONTEXT_LENGTH else "cold_start"


def normalize_item_name(item_name: str) -> str:
    return item_name.strip().lower().replace(" ", "_").replace("-", "_")


def cold_start_daily_need(request: InferenceRequest) -> float:
    item_key = normalize_item_name(request.item_name)
    per_person_need = STANDARD_DAILY_NEED_PER_PERSON.get(item_key, DEFAULT_DAILY_NEED_PER_PERSON)
    population_need = max(request.total_pengungsi, 1) * per_person_need
    latest_requested = request.history[-1].requested_qty if request.history else 0.0
    latest_need = request.history[-1].target_need_qty if request.history else 0.0
    vulnerable_ratio = request.vulnerable_count / max(request.total_pengungsi, 1)
    vulnerable_multiplier = 1.0 + min(vulnerable_ratio, 0.35)
    base_need = max(population_need, request.requested_qty, latest_requested, latest_need, request.critical_stock_threshold * 0.35)
    return round(max(base_need * vulnerable_multiplier, 0.0), 2)


def cold_start_forecast(request: InferenceRequest) -> list[float]:
    day_one_need = cold_start_daily_need(request)
    disaster_curve = [1.0, 1.04, 1.07, 1.06, 1.04, 1.02, 1.0]
    return [round(day_one_need * multiplier, 2) for multiplier in disaster_curve]


def forecast_need(request: InferenceRequest) -> list[float]:
    if inference_mode(request) == "cold_start":
        return cold_start_forecast(request)

    if not TTM_PYTHON.exists():
        raise RuntimeError("TinyTimeMixer Python runtime is missing. Run .tools/python312 setup and install .venv-ttm.")
    if not TTM_MODEL_DIR.exists():
        raise RuntimeError("TinyTimeMixer model artifact is missing. Run train_tinytimemixer.py first.")

    completed = subprocess.run(
        [
            str(TTM_PYTHON),
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
    return [round(max(float(value), 0.0), 2) for value in result["forecast"]]


def forecast_dates(history: list[HistoryPoint]) -> list[str]:
    last_date = datetime.strptime(history[-1].date, "%Y-%m-%d").date() if history else datetime.now().date()
    return [(last_date + timedelta(days=offset)).isoformat() for offset in range(1, HORIZON + 1)]


def forecast_dates_from_request(request: InferenceRequest) -> list[str]:
    return forecast_dates(request.history)


def infer_need(payload: dict[str, Any]) -> dict[str, Any]:
    request = parse_inference_request(payload)
    forecast_values = forecast_need(request)
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
    }


def infer_recommendation(payload: dict[str, Any]) -> dict[str, Any]:
    request = parse_inference_request(payload)
    forecast_values = forecast_need(request)
    dates = forecast_dates_from_request(request)
    model_mape = model_status().get("metrics", {}).get("validation", {}).get("mape")
    mode = inference_mode(request)
    daily_recommendations = []

    for date, forecast_qty in zip(dates, forecast_values):
        recommendation = recommend_distribution(
            item_name=request.item_name,
            forecast_qty=forecast_qty,
            current_stock_qty=request.current_stock_qty,
            critical_stock_threshold=request.critical_stock_threshold,
            total_pengungsi=request.total_pengungsi,
            vulnerable_count=request.vulnerable_count,
            series_length=len(request.history),
            is_synthetic_series="cold_start" if mode == "cold_start" else request.is_synthetic_series,
            model_mape=float(model_mape) if model_mape is not None and mode == "time_series" else None,
        )
        rationale_chips = list(recommendation.rationale_chips)
        if mode == "cold_start":
            rationale_chips.insert(0, "Rekomendasi awal dibuat karena riwayat posko belum mencapai 30 hari.")
            rationale_chips = rationale_chips[:4]
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
    }
