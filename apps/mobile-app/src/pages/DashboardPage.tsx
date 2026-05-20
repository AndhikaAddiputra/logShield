import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, Utensils, Shirt, Tent } from 'lucide-react';
import { fetchAiDashboard, fetchStockSummary } from '../lib/api';
import type { AiDashboardResponse, StockSummary } from '../lib/api';

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rationaleChips(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((chip) => {
      if (typeof chip === 'string') return chip;
      if (chip && typeof chip === 'object') {
        const objectChip = chip as { narrative?: unknown; feature?: unknown };
        return String(objectChip.narrative ?? objectChip.feature ?? '');
      }
      return String(chip ?? '');
    }).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[;,|]/)
      .map((chip) => chip.trim())
      .filter(Boolean);
  }
  return [];
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [aiData, setAiData] = useState<AiDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, ai] = await Promise.all([
        fetchStockSummary().catch(() => null),
        fetchAiDashboard(5).catch(() => null),
      ]);
      if (s) setSummary(s);
      if (ai) setAiData(ai);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const topCritical = aiData?.recommendations?.top_critical || [];
  const riskCounts = aiData?.recommendations?.risk_counts || {};
  const criticalCount = riskCounts.kritis ?? riskCounts.critical;
  const recentAnomalies = aiData?.anomalies?.recent || [];

  return (
    <div className="flex flex-col w-full">
      <div className={`px-4 py-2 flex justify-between items-center text-xs font-bold tracking-wide ${summary ? 'bg-green-700' : 'bg-gray-600'} text-white`}>
        <div className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>
            {loading ? 'MEMUAT...' : summary ? 'TERHUBUNG · SINKRON' : 'OFFLINE'}
          </span>
        </div>
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      </div>

      <div className="p-5">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs font-medium text-red-700">{error}</p>
          </div>
        )}

        <h2 className="text-2xl font-black text-blue-900 leading-tight mb-1">OPERATIONAL<br/>OVERVIEW</h2>
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 font-medium">
          <div className="w-1 h-4 bg-blue-500" />
          {summary
            ? `${summary.posko_served}/${summary.active_posko_count} Posko · ${summary.total_item} Item`
            : 'Rajeg Timur - Posko Evakuasi'}
        </div>

        {summary && (
          <div className="grid grid-cols-4 gap-2 mb-6">
            <div className="bg-white rounded-lg p-3 text-center shadow-sm border">
              <p className="text-lg font-black text-blue-900">{summary.total_item}</p>
              <p className="text-[9px] font-bold text-gray-500">Total Item</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm border">
              <p className="text-lg font-black text-red-600">{summary.critical_count}</p>
              <p className="text-[9px] font-bold text-gray-500">Kritis</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm border">
              <p className="text-lg font-black text-green-600">{summary.distribution_today}</p>
              <p className="text-[9px] font-bold text-gray-500">Distribusi</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm border">
              <p className="text-lg font-black text-blue-900">{summary.posko_served}</p>
              <p className="text-[9px] font-bold text-gray-500">Posko</p>
            </div>
          </div>
        )}

        {topCritical.length > 0 && (
          <>
            <h3 className="font-black text-lg text-gray-800 mb-4 tracking-tight">
              KRITIS · REKOMENDASI PRIORITAS
              {criticalCount != null && (
                <span className="ml-2 text-xs font-bold text-red-500">
                  ({criticalCount} kritis)
                </span>
              )}
            </h3>
            <div className="space-y-3 mb-8">
              {topCritical.slice(0, 5).map((rec: any, idx: number) => {
                const recommendedQty = numberValue(rec.recommended_qty);
                const shortageQty = numberValue(rec.shortage_qty);
                const coverageDays = numberValue(rec.coverage_days);
                const priorityScore = numberValue(rec.priority_score);
                const trustScore = numberValue(rec.trust_score);
                const chips = rationaleChips(rec.rationale_chips);

                return (
                <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-red-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-black text-red-600 tracking-widest uppercase">
                      {rec.posko_name || rec.posko_id}
                    </span>
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">
                      {rec.risk_level}
                    </span>
                  </div>
                  {rec.inference_mode === 'cold_start' && (
                    <span className="inline-flex mb-2 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      Estimasi awal
                    </span>
                  )}
                  <p className="text-sm font-medium text-gray-700">
                    {rec.item_name}: butuh <span className="font-bold">{recommendedQty} {rec.unit}</span>
                    {shortageQty > 0 && (
                      <span className="text-red-600"> (kekurangan {shortageQty})</span>
                    )}
                  </p>
                  {rec.coverage_days != null && (
                    <p className="text-xs text-gray-500 mt-1">
                      Coverage: {coverageDays} hari · Skor: {priorityScore.toFixed(1)} · Trust: {trustScore.toFixed(2)}
                    </p>
                  )}
                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {chips.map((chip: string, i: number) => (
                        <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </>
        )}

        {recentAnomalies.length > 0 && (
          <>
            <h3 className="font-black text-lg text-gray-800 mb-3 tracking-tight">
              ANOMALI TERBARU
            </h3>
            <div className="space-y-2 mb-8">
              {recentAnomalies.slice(0, 3).map((anomaly: any, idx: number) => (
                <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-xs font-bold text-orange-700 uppercase">{anomaly.anomaly_type}</span>
                    <span className="text-[10px] font-bold text-orange-600 ml-auto">{anomaly.severity}</span>
                  </div>
                  <p className="text-xs text-orange-800">{anomaly.message}</p>
                  {anomaly.action_suggestion && (
                    <p className="text-[10px] text-orange-600 mt-1">Saran: {anomaly.action_suggestion}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {!topCritical.length && !recentAnomalies.length && !loading && (
          <>
            <h3 className="font-black text-lg text-gray-800 mb-4 tracking-tight">PREDIKSI KEBUTUHAN 72 JAM</h3>
            <div className="space-y-4 mb-8">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-black text-orange-600 tracking-widest uppercase">Pangan & Air</span>
                  <div className="bg-orange-50 p-2 rounded-lg">
                    <Utensils className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-700 leading-relaxed">
                  Estimasi kebutuhan untuk periode mendatang. Data akan tersedia setelah sinkronisasi dengan AI engine.
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-black text-blue-600 tracking-widest uppercase">Sandang & Sanitasi</span>
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <Shirt className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-700 leading-relaxed">
                  Menunggu data rekomendasi dari AI engine.
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-teal-100">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-black text-teal-600 tracking-widest uppercase">Papan & Shelter</span>
                  <div className="bg-teal-50 p-2 rounded-lg">
                    <Tent className="w-5 h-5 text-teal-500" />
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-700 leading-relaxed">
  Kapasitas dan kebutuhan shelter akan ditampilkan setelah data tersedia.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
