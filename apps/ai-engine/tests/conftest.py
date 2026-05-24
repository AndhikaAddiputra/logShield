import pytest
from fastapi.testclient import TestClient
from logshield_ai.api import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def cold_start_payload():
    return {
        "kib_bencana_id": "KIB-2026-001",
        "disaster_type": "banjir",
        "posko_id": "POSKO-001",
        "posko_name": "Posko Utama",
        "item_name": "beras",
        "item_category": "pangan",
        "unit": "kg",
        "total_pengungsi": 500,
        "vulnerable_count": 75,
        "current_stock_qty": 200.0,
        "requested_qty": 100.0,
        "critical_stock_threshold": 50.0,
        "history": [],
    }


@pytest.fixture
def time_series_payload(cold_start_payload):
    import datetime

    today = datetime.date.today()
    history = []
    for i in range(30, 0, -1):
        d = today - datetime.timedelta(days=i)
        history.append(
            {
                "date": d.isoformat(),
                "target_need_qty": 200.0,
                "current_stock_qty": 180.0 + i * 0.5,
                "distributed_qty": 20.0,
                "requested_qty": 150.0,
            }
        )
    return {**cold_start_payload, "history": history}
