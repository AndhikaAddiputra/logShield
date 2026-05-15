from __future__ import annotations

from typing import Annotated

from fastapi import FastAPI, Query

from logshield_ai.artifacts import (
    anomalies,
    artifact_summary,
    clear_artifact_cache,
    dashboard_summary,
    forecasts,
    recent_anomalies,
    recommendations,
    top_critical_recommendations,
)

app = FastAPI(
    title="Log-Shield AI Engine",
    version="0.1.0",
    description="Forecasting, recommendation, and anomaly artifacts for Log-Shield.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "logshield-ai-engine"}


@app.get("/summary")
def summary() -> dict:
    return artifact_summary()


@app.post("/refresh")
def refresh() -> dict:
    clear_artifact_cache()
    return artifact_summary()


@app.get("/summary/dashboard")
def dashboard(limit: Annotated[int, Query(ge=1, le=100)] = 10) -> dict:
    return dashboard_summary(limit=limit)


@app.get("/forecasts")
def list_forecasts(
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    kib_bencana_id: str = "",
    posko_id: str = "",
    item_name: str = "",
    disaster_type: str = "",
) -> dict:
    rows = forecasts(
        limit=limit,
        kib_bencana_id=kib_bencana_id,
        posko_id=posko_id,
        item_name=item_name,
        disaster_type=disaster_type,
    )
    return {"count": len(rows), "rows": rows}


@app.get("/recommendations/top-critical")
def list_top_critical_recommendations(
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    kib_bencana_id: str = "",
    posko_id: str = "",
    item_name: str = "",
    disaster_type: str = "",
) -> dict:
    rows = top_critical_recommendations(
        limit=limit,
        kib_bencana_id=kib_bencana_id,
        posko_id=posko_id,
        item_name=item_name,
        disaster_type=disaster_type,
    )
    return {"count": len(rows), "rows": rows}


@app.get("/recommendations")
def list_recommendations(
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    kib_bencana_id: str = "",
    posko_id: str = "",
    item_name: str = "",
    disaster_type: str = "",
    risk_level: str = "",
) -> dict:
    rows = recommendations(
        limit=limit,
        kib_bencana_id=kib_bencana_id,
        posko_id=posko_id,
        item_name=item_name,
        disaster_type=disaster_type,
        risk_level=risk_level,
    )
    return {"count": len(rows), "rows": rows}


@app.get("/anomalies/recent")
def list_recent_anomalies(
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    kib_bencana_id: str = "",
    posko_id: str = "",
    item_name: str = "",
    disaster_type: str = "",
    anomaly_type: str = "",
    severity: str = "",
) -> dict:
    rows = recent_anomalies(
        limit=limit,
        kib_bencana_id=kib_bencana_id,
        posko_id=posko_id,
        item_name=item_name,
        disaster_type=disaster_type,
        anomaly_type=anomaly_type,
        severity=severity,
    )
    return {"count": len(rows), "rows": rows}


@app.get("/anomalies")
def list_anomalies(
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    kib_bencana_id: str = "",
    posko_id: str = "",
    item_name: str = "",
    disaster_type: str = "",
    anomaly_type: str = "",
    severity: str = "",
) -> dict:
    rows = anomalies(
        limit=limit,
        kib_bencana_id=kib_bencana_id,
        posko_id=posko_id,
        item_name=item_name,
        disaster_type=disaster_type,
        anomaly_type=anomaly_type,
        severity=severity,
    )
    return {"count": len(rows), "rows": rows}
