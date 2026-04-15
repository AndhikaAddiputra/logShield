"""Log-Shield AI Engine — placeholder API; add statsforecast pipelines next."""

from fastapi import FastAPI

app = FastAPI(title="Log-Shield AI Engine", version="0.1.0")


@app.get("/health")
def health():
    return {"ok": True, "service": "log-shield-ai-engine"}


@app.get("/forecast/demo")
def forecast_demo():
    """Replace with statsforecast + SHAP-backed rationale."""
    return {"predicted_demand": 0.0, "model": "fallback-local-mean"}
