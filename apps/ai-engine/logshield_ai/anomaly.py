from __future__ import annotations

from dataclasses import dataclass
from statistics import mean, pstdev


@dataclass(frozen=True)
class AnomalyEvent:
    anomaly_type: str
    severity: str
    score: float
    message: str
    action_suggestion: str


def demand_spike(current_need: float, history: list[float]) -> AnomalyEvent | None:
    if len(history) < 7:
        return None
    baseline = mean(history[-7:])
    if baseline <= 0:
        return None
    deviation = pstdev(history[-7:]) or max(baseline * 0.05, 1.0)
    z_score = (current_need - baseline) / deviation
    ratio = current_need / baseline
    if ratio >= 1.75 or z_score >= 3:
        severity = "high" if ratio >= 2.25 or z_score >= 4 else "medium"
        return AnomalyEvent(
            anomaly_type="demand_spike",
            severity=severity,
            score=round(max(ratio, z_score), 2),
            message=f"Kebutuhan melonjak {ratio:.2f}x dibanding rata-rata 7 hari terakhir.",
            action_suggestion="Verifikasi lonjakan pengungsi/request dan siapkan tambahan stok untuk item terkait.",
        )
    return None


def stock_critical(current_stock: float, critical_threshold: float, target_need: float) -> AnomalyEvent | None:
    threshold = max(critical_threshold, target_need)
    if threshold <= 0:
        return None
    ratio = current_stock / threshold
    if ratio < 0.5:
        return AnomalyEvent(
            anomaly_type="critical_stock",
            severity="high" if ratio < 0.25 else "medium",
            score=round(1 - ratio, 2),
            message=f"Stok hanya {ratio:.2f} dari ambang kritis.",
            action_suggestion="Prioritaskan distribusi ulang atau restock dari gudang terdekat.",
        )
    return None


def fulfillment_gap(requested_qty: float, distributed_qty: float) -> AnomalyEvent | None:
    if requested_qty <= 0:
        return None
    gap_ratio = max(requested_qty - distributed_qty, 0.0) / requested_qty
    if gap_ratio >= 0.45:
        return AnomalyEvent(
            anomaly_type="fulfillment_gap",
            severity="high" if gap_ratio >= 0.7 else "medium",
            score=round(gap_ratio, 2),
            message=f"Distribusi belum memenuhi {gap_ratio:.0%} dari request.",
            action_suggestion="Cek kendala pemenuhan request dan eskalasi jika stok pusat tidak mencukupi.",
        )
    return None


def stock_drop(current_stock: float, previous_stock: float | None, stock_in_qty: float, distributed_qty: float) -> AnomalyEvent | None:
    if previous_stock is None or previous_stock <= 0:
        return None
    expected_stock = max(previous_stock + stock_in_qty - distributed_qty, 0.0)
    unexplained_drop = expected_stock - current_stock
    if unexplained_drop <= 0:
        return None
    drop_ratio = unexplained_drop / max(previous_stock, 1.0)
    if drop_ratio >= 0.35:
        return AnomalyEvent(
            anomaly_type="stock_drop",
            severity="high" if drop_ratio >= 0.6 else "medium",
            score=round(drop_ratio, 2),
            message=f"Stok turun tidak wajar sebesar {drop_ratio:.0%} dari stok sebelumnya.",
            action_suggestion="Lakukan audit stok fisik dan cek kemungkinan salah input atau kehilangan barang.",
        )
    return None


def detect_row_anomalies(
    current_need: float,
    current_stock: float,
    critical_threshold: float,
    requested_qty: float,
    distributed_qty: float,
    stock_in_qty: float,
    need_history: list[float],
    previous_stock: float | None,
) -> list[AnomalyEvent]:
    candidates = [
        demand_spike(current_need, need_history),
        stock_critical(current_stock, critical_threshold, current_need),
        fulfillment_gap(requested_qty, distributed_qty),
        stock_drop(current_stock, previous_stock, stock_in_qty, distributed_qty),
    ]
    return [event for event in candidates if event is not None]
