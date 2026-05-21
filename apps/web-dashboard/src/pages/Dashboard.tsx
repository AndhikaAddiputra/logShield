import { useEffect, useState, useCallback } from "react";
import {
  PageHeader,
  SelectField,
  StatCard,
} from "@log-shield/ui-core";
import {
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  Filter,
  Sparkles,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchDashboardOverview,
  fetchStockWeight,
  fetchRegionalHeatmap,
  fetchVulnerableFulfillment,
  fetchDashboardSearch,
  fetchPoskos,
  triggerAiInference,
  quickRequest,
  type DashboardOverview,
  type StockWeightResponse,
  type RegionalHeatmapResponse,
  type VulnerableFulfillmentResponse,
  type SearchResult,
  type PoskoDoc,
  type AiInferenceResult,
} from "../lib/api";

export function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [stockWeight, setStockWeight] = useState<StockWeightResponse | null>(null);
  const [heatmap, setHeatmap] = useState<RegionalHeatmapResponse | null>(null);
  const [vulnerable, setVulnerable] = useState<VulnerableFulfillmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [weightCategory, setWeightCategory] = useState("all");
  const [weightCommodity, setWeightCommodity] = useState("all");
  const [heatmapLimit] = useState(7);

  const [poskos, setPoskos] = useState<PoskoDoc[]>([]);
  const [selectedPoskoId, setSelectedPoskoId] = useState("");
  const [inferring, setInferring] = useState(false);
  const [inferResults, setInferResults] = useState<AiInferenceResult[] | null>(null);
  const [inferError, setInferError] = useState<string | null>(null);
  const [reqMessage, setReqMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPoskos().then((res) => setPoskos(res.rows.map((r: any) => r.doc).filter(Boolean))).catch(() => {});
  }, []);

  const handleRunInference = async () => {
    if (!selectedPoskoId) return;
    setInferring(true);
    setInferError(null);
    setInferResults(null);
    try {
      const res = await triggerAiInference(selectedPoskoId);
      setInferResults(res.results || []);
    } catch (err: any) {
      setInferError(err.message || "Gagal menjalankan analisis AI");
    } finally {
      setInferring(false);
    }
  };

  const handleQuickRequest = async (item: AiInferenceResult) => {
    try {
      const qty = Math.max(1, Math.round(Number(item.recommended_qty || item.forecast_qty || 0)));
      await quickRequest({
        posko_id: selectedPoskoId,
        commodity: item.item_name,
        quantity: qty,
        unit: item.unit || "unit",
        priority: "normal",
        note: `Permintaan cepat dari rekomendasi AI: ${item.item_name}`,
      });
      setReqMessage(`Permintaan ${item.item_name} (${qty} ${item.unit}) berhasil dikirim.`);
      setTimeout(() => setReqMessage(null), 4000);
    } catch (err: any) {
      setReqMessage("Gagal: " + (err.message || ""));
      setTimeout(() => setReqMessage(null), 4000);
    }
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, sw, hm, vf] = await Promise.all([
        fetchDashboardOverview().catch(() => null),
        fetchStockWeight({ category: weightCategory !== "all" ? weightCategory : undefined, days: 7 }).catch(() => null),
        fetchRegionalHeatmap(heatmapLimit).catch(() => null),
        fetchVulnerableFulfillment().catch(() => null),
      ]);
      if (ov) setOverview(ov);
      if (sw) setStockWeight(sw);
      if (hm) setHeatmap(hm);
      if (vf) setVulnerable(vf);
    } finally {
      setLoading(false);
    }
  }, [weightCategory, heatmapLimit]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!weightCategory && !weightCommodity) return;
    fetchStockWeight({
      category: weightCategory !== "all" ? weightCategory : undefined,
      commodity: weightCommodity !== "all" ? weightCommodity : undefined,
      days: 7,
    }).then((res) => setStockWeight(res)).catch(() => {});
  }, [weightCategory, weightCommodity]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetchDashboardSearch(search);
        setSearchResults(res.results);
        setShowSearchResults(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const cards = overview?.cards;

  const stockWeightOptions = stockWeight?.options.flatMap((opt) =>
    (opt.commodities || []).map((c) => ({
      label: `${opt.label} - ${c}`,
      value: `${opt.category}-${c}`,
    }))
  ) || [];

  const handleStockWeightChange = (val: string) => {
    if (val === "all") {
      setWeightCategory("all");
      setWeightCommodity("all");
    } else {
      const [cat, ...rest] = val.split("-");
      setWeightCategory(cat);
      setWeightCommodity(rest.join("-"));
    }
  };

  const selectedWeightValue = weightCategory !== "all" && weightCommodity !== "all"
    ? `${weightCategory}-${weightCommodity}`
    : "all";

  const stockWeightDays = stockWeight?.days || [];

  const maxKebutuhan = Math.max(...stockWeightDays.map((d) => d.kebutuhan), 0);
  const maxPersediaan = Math.max(...stockWeightDays.map((d) => d.persediaan), 0);
  const yMax = Math.max(maxKebutuhan, maxPersediaan, 1);

  return (
    <>
      <PageHeader
        title="Dashboard"
        searchValue={search}
        onSearchChange={setSearch}
        showNotifications
      />

      {showSearchResults && searchResults.length > 0 && (
        <div className="mx-6 mt-4 rounded-lg border border-ls-border bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold text-ls-muted uppercase">
            Hasil pencarian "{search}"
          </p>
          <div className="space-y-1">
            {searchResults.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50">
                <span className="text-[10px] font-bold uppercase text-ls-muted w-12">{r.type}</span>
                <span className="text-sm font-medium text-ls-navy">{r.title}</span>
                <span className="text-xs text-ls-muted ml-auto">{r.subtitle}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6 p-6">
        {loading && (
          <div className="text-sm text-ls-muted text-center py-8">Memuat data dashboard...</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Posko"
            value={cards ? String(cards.total_posko) : "-"}
            icon={ClipboardCheck}
          />
          <StatCard
            label="Critical Items"
            value={cards ? `${cards.critical_items} Units` : "-"}
            tone={cards?.critical_items ? "danger" : undefined}
            icon={AlertTriangle}
          />
          <StatCard
            label="Pending Requests"
            value={cards ? String(cards.pending_requests) : "-"}
            icon={ClipboardList}
          />
          <StatCard
            label="AI Health"
            value={cards?.ai_health || "-"}
            tone={cards?.ai_status === "healthy" ? "success" : "danger"}
            icon={Sparkles}
          />
        </div>

        <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ls-navy">
              Daily Stock Weight per Item Category
            </h2>
            <div className="flex items-center gap-4 text-sm text-ls-navy">
            </div>
          </div>
          </div>

      {reqMessage && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {reqMessage}
        </div>
      )}

      {inferError && (
          <div className="rounded-ls-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {inferError}
          </div>
        )}

        {inferResults && inferResults.length > 0 && (
          <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
            <h2 className="mb-4 text-base font-semibold text-ls-navy">
              Hasil Analisis AI
            </h2>
            <div className="space-y-3">
              {inferResults.map((r, i) => {
                const mode = String(r.inference_mode || "");
                const risk = String(r.risk_level || "");
                const trust = Number(r.trust_score || 0);
                const priority = Number(r.priority_score || 0);
                const shortage = Number(r.shortage_qty || 0);
                const recommended = Number(r.recommended_qty || 0);
                const forecast = Number(r.forecast_qty || 0);
                const commClass = String(r.commodity_class || "");
                const showPerHari = commClass === "konsumsi_harian" || commClass === "konsumsi_berkala";
                const chips = Array.isArray(r.rationale_chips) ? r.rationale_chips : [];
                return (
                  <div key={i} className={`rounded border p-3 text-xs ${
                    risk === "kritis" ? "border-red-200 bg-red-50" : "border-ls-border bg-ls-bg"
                  }`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ls-navy">
                        {String(r.item_name || "-")}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        risk === "kritis" ? "bg-red-100 text-red-700"
                        : risk === "waspada" ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                      }`}>
                        {risk}
                      </span>
                      {mode === "cold_start" && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                          Estimasi Awal
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-ls-muted">
                      {forecast > 0 && (
                        <span>Kebutuhan: <strong>{forecast.toFixed(0)}</strong> {String(r.unit || "")}{showPerHari ? "/hari" : ""}</span>
                      )}
                      {recommended > 0 && (
                        <span>Rekomendasi: <strong>{recommended.toFixed(0)}</strong> {String(r.unit || "")}</span>
                      )}
                      {shortage > 0 && (
                        <span className="text-red-500">Kekurangan: <strong>{shortage.toFixed(0)}</strong></span>
                      )}
                      {trust > 0 && (
                        <span>Trust: <strong>{trust.toFixed(2)}</strong></span>
                      )}
                      {priority > 0 && (
                        <span>Prioritas: <strong>{priority.toFixed(1)}</strong></span>
                      )}
                      {Number(r.coverage_days || 0) > 0 && (
                        <span>Coverage: <strong>{Number(r.coverage_days).toFixed(1)}</strong> hari</span>
                      )}
                      {r.trend_direction === 'rising' && (
                        <span className="text-red-600 font-semibold">↑ Naik {r.trend_pct_7d ? `(${Number(r.trend_pct_7d).toFixed(0)}%)` : ''}</span>
                      )}
                      {r.trend_direction === 'falling' && (
                        <span className="text-green-600 font-semibold">↓ Turun {r.trend_pct_7d ? `(${Math.abs(Number(r.trend_pct_7d)).toFixed(0)}%)` : ''}</span>
                      )}
                    </div>
                    <button onClick={() => handleQuickRequest(r)}
                      className="mt-2 flex items-center gap-1 rounded bg-ls-navy px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-ls-navy/80"
                    >
                      <ClipboardList className="w-3 h-3" />
                      Ajukan Permintaan
                    </button>
                    {chips.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {chips.slice(0, 3).map((chip: string, ci: number) => (
                          <span key={ci} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ls-navy">
              Analisis AI untuk Posko
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={selectedPoskoId}
                onChange={(e) => { setSelectedPoskoId(e.target.value); setInferResults(null); setInferError(null); }}
                className="h-8 rounded border border-ls-border bg-white px-2 text-xs text-ls-navy"
              >
                <option value="">Pilih posko...</option>
                {poskos.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={handleRunInference}
                disabled={!selectedPoskoId || inferring}
                className="flex items-center gap-1.5 rounded bg-ls-navy px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ls-navy/80 disabled:opacity-50"
              >
                {inferring ? "Menganalisis..." : "Jalankan Analisis"}
              </button>
            </div>
          </div>
          {!inferResults && !inferError && (
            <p className="text-xs text-ls-muted">Pilih posko dan klik "Jalankan Analisis" untuk memulai.</p>
          )}
        </div>
      </div>

      <p className="border-t border-ls-border px-6 py-3 text-center text-xs text-ls-muted">
        LOG-SHIELD • Dashboard • Komponen dari @log-shield/ui-core
      </p>
    </>
  );
}
