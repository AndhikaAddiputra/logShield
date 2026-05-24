import time


class TestHealth:
    def test_health_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "logshield-ai-engine"

    def test_models_current(self, client):
        resp = client.get("/models/current")
        assert resp.status_code == 200
        data = resp.json()
        assert "model_version" in data
        assert "model_backend" in data


class TestInferRecommendation:
    def test_cold_start_structure(self, client, cold_start_payload):
        resp = client.post("/infer/recommendation", json=cold_start_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["inference_mode"] == "cold_start"
        assert data["item_name"] == "beras"
        assert data["unit"] == "kg"
        assert len(data["daily_recommendations"]) == 7

    def test_latency_under_500ms(self, client, cold_start_payload):
        start = time.monotonic()
        resp = client.post("/infer/recommendation", json=cold_start_payload)
        elapsed = (time.monotonic() - start) * 1000
        assert resp.status_code == 200
        assert elapsed < 500, f"Inference took {elapsed:.0f}ms, expected < 500"

    def test_rationale_chips_present(self, client, cold_start_payload):
        resp = client.post("/infer/recommendation", json=cold_start_payload)
        data = resp.json()
        for rec in data["daily_recommendations"]:
            chips = rec["rationale_chips"]
            assert isinstance(chips, list)
            assert len(chips) > 0
            for chip in chips:
                assert isinstance(chip, str)
                assert len(chip) > 0

    def test_top_recommendation_matches_highest_priority(self, client, cold_start_payload):
        resp = client.post("/infer/recommendation", json=cold_start_payload)
        data = resp.json()
        top = data["top_recommendation"]
        daily = data["daily_recommendations"]
        max_priority = max(r["priority_score"] for r in daily)
        assert top["priority_score"] == max_priority

    def test_forecast_horizon_seven_days(self, client, cold_start_payload):
        resp = client.post("/infer/recommendation", json=cold_start_payload)
        data = resp.json()
        assert data["horizon_days"] == 7
        assert len(data["daily_recommendations"]) == 7

    def test_forecast_target_need_qty_positive(self, client, cold_start_payload):
        resp = client.post("/infer/recommendation", json=cold_start_payload)
        data = resp.json()
        for rec in data["daily_recommendations"]:
            assert rec["forecast_target_need_qty"] >= 0

    def test_rationale_chip_details_structure(self, client, cold_start_payload):
        resp = client.post("/infer/recommendation", json=cold_start_payload)
        data = resp.json()
        for rec in data["daily_recommendations"]:
            details = rec["rationale_chip_details"]
            assert isinstance(details, list)
            assert len(details) > 0
            for chip in details:
                assert "feature" in chip
                assert "narrative" in chip
                assert isinstance(chip["narrative"], str)

    def test_risk_level_is_valid(self, client, cold_start_payload):
        resp = client.post("/infer/recommendation", json=cold_start_payload)
        data = resp.json()
        valid = {"kritis", "waspada", "stabil"}
        for rec in data["daily_recommendations"]:
            assert rec["risk_level"] in valid


class TestInferNeed:
    def test_infer_need_structure(self, client, cold_start_payload):
        resp = client.post("/infer/need", json=cold_start_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["inference_mode"] == "cold_start"
        assert len(data["forecast"]) == 7
        for entry in data["forecast"]:
            assert "forecast_date" in entry
            assert "forecast_target_need_qty" in entry


class TestErrorHandling:
    def test_missing_required_field_returns_400(self, client):
        resp = client.post("/infer/recommendation", json={})
        assert resp.status_code == 400

    def test_invalid_payload_type_returns_400(self, client):
        resp = client.post("/infer/recommendation", json={"kib_bencana_id": 123})
        assert resp.status_code == 400
