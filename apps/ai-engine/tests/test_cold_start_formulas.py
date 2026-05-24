from logshield_ai.inference import cold_start_daily_need, cold_start_forecast, inference_mode, InferenceRequest
from logshield_ai.recommendation import risk_level, recommend_distribution


def _req(**overrides):
    params = dict(
        kib_bencana_id="KIB-001",
        disaster_type="banjir",
        posko_id="P-001",
        posko_name="Posko",
        item_name="beras",
        item_category="pangan",
        unit="kg",
        total_pengungsi=500,
        vulnerable_count=75,
        current_stock_qty=200.0,
        requested_qty=100.0,
        critical_stock_threshold=50.0,
        history=[],
    )
    params.update(overrides)
    return InferenceRequest(**params)


class TestColdStartDailyNeed:
    def test_konsumsi_harian_beras(self):
        r = _req()
        need = cold_start_daily_need(r)
        vulnerable_multiplier = 1.0 + min(75 / 500, 0.35)
        expected = round(max(500 * 0.4 * vulnerable_multiplier, 0.0), 2)
        assert need == expected
        assert need > 0

    def test_konsumsi_berkala_pembalut(self):
        r = _req(item_name="pembalut", item_category="sandang")
        need = cold_start_daily_need(r)
        assert need > 0
        assert need < 500

    def test_perlengkapan_tahan_lama_selimut(self):
        r = _req(item_name="selimut", item_category="sandang")
        need = cold_start_daily_need(r)
        assert need > 0

    def test_elektronik_logistik_radio_ht(self):
        r = _req(item_name="radio_ht", item_category="lainnya")
        need = cold_start_daily_need(r)
        assert need > 0

    def test_unknown_commodity_uses_default(self):
        r = _req(item_name="unknown_item", item_category="lainnya")
        need = cold_start_daily_need(r)
        expected = max(500 * 1.0, 100.0) * (1.0 + min(75 / 500, 0.35))
        assert need == round(expected, 2)

    def test_zero_total_pengungsi(self):
        r = _req(total_pengungsi=0, vulnerable_count=0)
        need = cold_start_daily_need(r)
        assert need >= 0

    def test_requested_qty_overrides_low_base(self):
        r = _req(requested_qty=9999.0, history=[])
        need = cold_start_daily_need(r)
        assert need >= 9999.0


class TestColdStartForecast:
    def test_returns_seven_values(self):
        r = _req()
        forecast = cold_start_forecast(r)
        assert len(forecast) == 7

    def test_disaster_curve_peaks_on_day_4(self):
        r = _req()
        forecast = cold_start_forecast(r)
        assert forecast[3] >= forecast[0]

    def test_all_values_non_negative(self):
        r = _req(total_pengungsi=0, vulnerable_count=0, current_stock_qty=0)
        forecast = cold_start_forecast(r)
        for val in forecast:
            assert val >= 0


class TestInferenceMode:
    def test_cold_start_when_no_history(self):
        r = _req()
        assert inference_mode(r) == "cold_start"

    def test_cold_start_when_partial_history(self):
        r = _req(history=[])
        assert inference_mode(r) == "cold_start"


class TestRiskLevel:
    def test_kritis(self):
        assert risk_level(0, 100) == "kritis"
        assert risk_level(0.5, 50) == "kritis"

    def test_waspada(self):
        assert risk_level(2, 0) == "waspada"

    def test_aman(self):
        assert risk_level(31, 0) == "aman"
        assert risk_level(100, 0) == "aman"


class TestRecommendDistribution:
    def test_recommended_qty_positive(self):
        rec = recommend_distribution(
            item_name="beras",
            forecast_qty=200.0,
            current_stock_qty=50.0,
            critical_stock_threshold=100.0,
            total_pengungsi=500,
            vulnerable_count=75,
            series_length=0,
            model_mape=None,
        )
        assert rec.recommended_qty > 0
        assert rec.shortage_qty >= 0
        assert rec.trust_score >= 0

    def test_rationale_chips_not_empty(self):
        rec = recommend_distribution(
            item_name="beras",
            forecast_qty=200.0,
            current_stock_qty=50.0,
            critical_stock_threshold=100.0,
            total_pengungsi=500,
            vulnerable_count=75,
            series_length=0,
            model_mape=None,
        )
        assert len(rec.rationale_chips) > 0

    def test_sufficient_stock_no_shortage(self):
        rec = recommend_distribution(
            item_name="beras",
            forecast_qty=100.0,
            current_stock_qty=500.0,
            critical_stock_threshold=50.0,
            total_pengungsi=500,
            vulnerable_count=75,
            series_length=0,
            model_mape=None,
        )
        assert rec.shortage_qty == 0
