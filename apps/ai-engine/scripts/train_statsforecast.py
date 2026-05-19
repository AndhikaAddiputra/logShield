from __future__ import annotations

import json
import pickle
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
INPUT_CSV = ROOT / "data" / "processed" / "logshield_statsforecast_dataset.csv"
OUTPUT_DIR = ROOT / "data" / "statsforecast"
METRICS_JSON = OUTPUT_DIR / "statsforecast_metrics.json"
BACKTEST_CSV = OUTPUT_DIR / "statsforecast_backtest.csv"
FORECAST_CSV = OUTPUT_DIR / "statsforecast_forecast_7d.csv"
MODEL_PATH = ROOT / "apps" / "ai-engine" / "models" / "statsforecast" / "statsforecast_model.pkl"

HORIZON = 7
N_WINDOWS = 3
STEP_SIZE = 7
MIN_SERIES_LENGTH = HORIZON + (N_WINDOWS * STEP_SIZE)


def require_dependencies() -> tuple[object, object, object, object, object]:
    try:
        import pandas as pd
        from statsforecast import StatsForecast
        from statsforecast.models import AutoETS, Naive, SeasonalNaive, WindowAverage
    except ModuleNotFoundError as error:
        missing = error.name or "unknown"
        message = {
            "status": "missing_dependency",
            "missing": missing,
            "install": "pip install -r apps/ai-engine/requirements.txt",
        }
        print(json.dumps(message, indent=2), file=sys.stderr)
        raise
    return pd, StatsForecast, AutoETS, Naive, SeasonalNaive, WindowAverage


def metric_summary(backtest_df: object, model_columns: list[str]) -> dict[str, object]:
    summary: dict[str, object] = {}
    y = backtest_df["y"]
    for model in model_columns:
        prediction = backtest_df[model].clip(lower=0)
        absolute_error = (y - prediction).abs()
        percentage_error = absolute_error / y.clip(lower=1)
        summary[model] = {
            "mae": round(float(absolute_error.mean()), 4),
            "rmse": round(float(((y - prediction) ** 2).mean() ** 0.5), 4),
            "mape": round(float(percentage_error.mean()), 4),
        }
    best_model = min(summary, key=lambda name: (summary[name]["mae"], summary[name]["mape"]))
    return {"models": summary, "best_model": best_model}


def main() -> int:
    if not INPUT_CSV.exists():
        print(f"Missing StatsForecast dataset: {INPUT_CSV.relative_to(ROOT)}", file=sys.stderr)
        return 1

    try:
        pd, StatsForecast, AutoETS, Naive, SeasonalNaive, WindowAverage = require_dependencies()
    except ModuleNotFoundError:
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(INPUT_CSV, parse_dates=["ds"])
    model_df = df[["unique_id", "ds", "y"]].copy()
    series_lengths = model_df.groupby("unique_id").size()
    eligible_ids = series_lengths[series_lengths >= MIN_SERIES_LENGTH].index
    skipped_short_series = int((series_lengths < MIN_SERIES_LENGTH).sum())
    model_df = model_df[model_df["unique_id"].isin(eligible_ids)].copy()
    if model_df.empty:
        print("No series are long enough for StatsForecast cross-validation settings.", file=sys.stderr)
        return 1

    models = [
        Naive(),
        SeasonalNaive(season_length=7),
        WindowAverage(window_size=7),
        AutoETS(season_length=7),
    ]
    forecaster = StatsForecast(models=models, freq="D", n_jobs=-1)
    backtest_df = forecaster.cross_validation(
        df=model_df,
        h=HORIZON,
        n_windows=N_WINDOWS,
        step_size=STEP_SIZE,
    )
    model_columns = [
        column
        for column in backtest_df.columns
        if column not in {"unique_id", "ds", "cutoff", "y"}
    ]
    metrics = metric_summary(backtest_df, model_columns)

    forecaster.fit(model_df)
    forecast_df = forecaster.forecast(h=HORIZON)

    backtest_df.to_csv(BACKTEST_CSV, index=False)
    forecast_df.to_csv(FORECAST_CSV, index=False)
    with MODEL_PATH.open("wb") as handle:
        pickle.dump(forecaster, handle)

    report = {
        "input": str(INPUT_CSV.relative_to(ROOT)),
        "horizon": HORIZON,
        "n_windows": N_WINDOWS,
        "step_size": STEP_SIZE,
        "rows": int(len(model_df)),
        "series": int(model_df["unique_id"].nunique()),
        "min_series_length": MIN_SERIES_LENGTH,
        "skipped_short_series": skipped_short_series,
        "metrics": metrics,
        "outputs": {
            "backtest": str(BACKTEST_CSV.relative_to(ROOT)),
            "forecast": str(FORECAST_CSV.relative_to(ROOT)),
            "model": str(MODEL_PATH.relative_to(ROOT)),
        },
    }
    METRICS_JSON.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
