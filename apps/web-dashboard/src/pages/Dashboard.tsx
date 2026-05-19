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
  type DashboardOverview,
  type StockWeightResponse,
  type RegionalHeatmapResponse,
  type VulnerableFulfillmentResponse,
  type SearchResult,
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
              <SelectField
                value={selectedWeightValue}
                onChange={(event) => handleStockWeightChange(event.target.value)}
                className="h-8 w-44 bg-white text-xs"
                aria-label="Pilih item stok harian"
              >
                <option value="all">Semua Kategori</option>
                {stockWeightOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SelectField>
              <Filter className="size-4" />
            </div>
          </div>
          <div className="h-72 w-full">
            {stockWeightDays.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stockWeightDays} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                  <YAxis hide domain={[0, Math.ceil(yMax * 1.2)]} />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="kebutuhan"
                    name="Kebutuhan"
                    stroke="#184a87"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="persediaan"
                    name="Persediaan"
                    stroke="#b6c1d2"
                    strokeWidth={3}
                    strokeDasharray="6 6"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-ls-muted">
                Data grafik belum tersedia
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-5 text-xs text-ls-muted">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#184a87]" />
              <span>Kebutuhan</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#b6c1d2]" />
              <span>Persediaan</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
            <h2 className="mb-4 text-base font-semibold text-ls-navy">Regional Heatmap</h2>
            {heatmap ? (
              <>
                <div className="space-y-1.5">
                  {heatmap.rows.map((row) => (
                    <div key={row.category} className="flex items-center gap-1.5">
                      <span className="w-14 text-[10px] text-ls-muted">{row.label}</span>
                      <div className="grid flex-1 grid-cols-7 gap-1.5">
                        {heatmap.columns.map((col) => {
                          const val = row.values.find((v) => v.posko_id === col.posko_id);
                          const intensity = val ? val.intensity : 0;
                          return (
                            <div
                              key={`${row.category}-${col.posko_id}`}
                              className="h-8 rounded-sm bg-[#3f5b9e]"
                              style={{ opacity: Math.max(0.14, intensity / 100) }}
                              title={`${col.name}: ${val?.value ?? 0}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-[56px_1fr] items-start gap-1.5">
                  <span />
                  <div className="grid grid-cols-7 gap-1.5">
                    {heatmap.columns.map((col) => (
                      <span
                        key={col.posko_id}
                        className="truncate text-[9px] text-ls-muted"
                        title={col.name}
                      >
                        {col.name.length > 8 ? col.name.slice(0, 7) + ".." : col.name}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm text-ls-muted">
                Data heatmap belum tersedia
              </div>
            )}
          </div>

          <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
            <h2 className="mb-5 text-base font-semibold text-ls-navy">
              Pemenuhan Distribusi Kelompok Rentan
            </h2>
            {vulnerable ? (
              <div className="space-y-5">
                {vulnerable.groups.map((group) => (
                  <div key={group.key} className="grid grid-cols-[90px_1fr_28px] items-center gap-3">
                    <span className="text-xs text-ls-muted">{group.label}</span>
                    <div className="h-7 rounded-sm bg-slate-100">
                      <div
                        className="h-7 rounded-sm"
                        style={{
                          width: `${group.percentage}%`,
                          backgroundColor: group.percentage >= 80 ? "#6478a9" : group.percentage >= 40 ? "#9daac4" : "#c8d2e6",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-ls-muted">{group.percentage}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm text-ls-muted">
                Data distribusi belum tersedia
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="border-t border-ls-border px-6 py-3 text-center text-xs text-ls-muted">
        LOG-SHIELD • Dashboard • Komponen dari @log-shield/ui-core
      </p>
    </>
  );
}

