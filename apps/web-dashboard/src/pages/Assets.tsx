import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Field,
  Input,
  PageHeader,
  SelectField,
  StatCard,
} from "@log-shield/ui-core";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type StockCategory,
  type StockReading,
  type StockSummary,
  type StockTrendDay,
  addStock,
  deleteAsset,
  fetchStockCategories,
  fetchStockReadings,
  fetchStockSummary,
  fetchStockTrend,
  updateAsset,
} from "../lib/api";

const accentColors: Record<string, string> = {
  sandang: "#1f3b7d",
  pangan: "#2563eb",
  papan: "#16a34a",
  lainnya: "#9333ea",
};

const accentClasses: Record<string, string> = {
  sandang: "bg-[#1f3b7d]",
  pangan: "bg-[#2563eb]",
  papan: "bg-[#16a34a]",
  lainnya: "bg-[#9333ea]",
};

function formatNumber(value: number) {
  return value.toLocaleString("id-ID");
}

function StockRow({
  name,
  stock,
  unit,
  progress,
  isCritical,
  category,
  threshold,
  assetId,
  onEdit,
  onDelete,
}: {
  name: string;
  stock: number;
  unit: string;
  progress: number;
  isCritical: boolean;
  category: string;
  threshold: number;
  assetId: string;
  onEdit: (commodity: string, category: string, unit: string, threshold: number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-ls-navy">{name}</span>
          <span className="text-xs font-semibold text-ls-navy">
            {formatNumber(stock)}
            <span className="ml-1 text-[10px] uppercase text-ls-muted">{unit}</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100">
          <div
            className={`h-1.5 rounded-full transition-all ${isCritical ? "bg-red-500" : "bg-[#1f3b7d]"}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(name, category, unit, threshold)}
          className="text-[10px] font-semibold text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(assetId)}
          className="text-[10px] font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

function CategoryCard({
  title,
  subtitle,
  itemCount,
  accent,
  accentBg,
  category,
  items,
  onAddStock,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  itemCount: number;
  accent: string;
  accentBg: string;
  category: string;
  items: { _id: string; commodity: string; quantity_available: number; unit: string; min_threshold: number; is_critical: boolean; progress: number }[];
  onAddStock: (category: string) => void;
  onEdit: (commodity: string, category: string, unit: string, threshold: number) => void;
  onDelete: (id: string) => void;
}) {
  const criticalItems = items.filter((i) => i.is_critical);

  return (
    <Card className="overflow-hidden" style={{ borderTopWidth: 4, borderTopColor: accent }}>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-ls-navy">{title}</h3>
            <p className="text-xs text-ls-muted">{subtitle}</p>
          </div>
          <Badge variant="muted">{itemCount} Item</Badge>
        </div>

        {items.length > 0 && (
          <div className="text-[11px] font-semibold uppercase text-ls-muted">
            <div className="flex items-center justify-between">
              <span>Nama Item</span>
              <span>Stok</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <StockRow
              key={item._id || item.commodity}
              name={item.commodity}
              stock={item.quantity_available}
              unit={item.unit}
              progress={item.progress}
              isCritical={item.is_critical}
              category={category}
              threshold={item.min_threshold}
              assetId={item._id || `asset::WH-JKT-001::${item.commodity}`}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {items.length === 0 && (
            <p className="text-sm text-ls-muted italic">Belum ada data stok</p>
          )}
        </div>

        {criticalItems.length > 0 && (
          <div className="rounded-ls-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {criticalItems.map((i) => i.commodity).join(", ")} mendekati/melampaui batas minimum.
          </div>
        )}
      </CardContent>
      <div className="border-t border-ls-border bg-ls-sidebar/40 px-5 py-3">
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onAddStock(category)}>
          + Tambah Stok
        </Button>
      </div>
    </Card>
  );
}

export function AssetsPage() {
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [trend, setTrend] = useState<StockTrendDay[]>([]);
  const [readings, setReadings] = useState<StockReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addCategory, setAddCategory] = useState("pangan");
  const [addCommodity, setAddCommodity] = useState("");
  const [addWarehouseId, setAddWarehouseId] = useState("WH-JKT-001");
  const [addQuantity, setAddQuantity] = useState(0);
  const [addUnit, setAddUnit] = useState("kg");
  const [addThreshold, setAddThreshold] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState("");
  const [editCommodity, setEditCommodity] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editThreshold, setEditThreshold] = useState(0);
  const [editUnit, setEditUnit] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [deleteName, setDeleteName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [iotFilter, setIotFilter] = useState("all");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c, t, r] = await Promise.all([
        fetchStockSummary(),
        fetchStockCategories(),
        fetchStockTrend(7),
        fetchStockReadings({ limit: 100 }).catch(() => ({ ok: false, readings: [] })),
      ]);
      setSummary(s);
      setCategories(c.categories);
      setTrend(t.days);
      setReadings(r.readings);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data inventaris");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCategories = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((i) => i.commodity.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.items.length > 0 || cat.title.toLowerCase().includes(q));
  }, [categories, search]);

  const trendLines = useMemo(() => {
    if (trend.length === 0) {
      return { data: [] as { day: string; masuk: number; keluar: number }[], keys: [] as string[] };
    }
    return {
      data: trend.map((d) => ({ day: d.label || d.date, masuk: d.masuk, keluar: d.keluar })),
      keys: ["masuk", "keluar"],
    };
  }, [trend]);

  const handleAddStock = async () => {
    setSubmitting(true);
    try {
      await addStock({
        warehouse_id: addWarehouseId,
        commodity: addCommodity,
        category: addCategory,
        quantity: addQuantity,
        unit: addUnit,
        min_threshold: addThreshold,
      });
      setShowAdd(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menambah stok");
    } finally {
      setSubmitting(false);
    }
  };

  const openAdd = (category: string) => {
    setAddCategory(category);
    setAddCommodity("");
    setAddQuantity(0);
    setAddUnit("kg");
    setAddThreshold(0);
    setShowAdd(true);
  };

  const openEdit = (commodity: string, category: string, unit: string, threshold: number) => {
    const item = categories.flatMap((c) => c.items).find((i) => i.commodity === commodity);
    setEditId(item?._id || `asset::WH-JKT-001::${commodity}`);
    setEditCommodity(commodity);
    setEditCategory(category);
    setEditUnit(unit);
    setEditThreshold(threshold);
    setShowEdit(true);
  };

  const handleEditAsset = async () => {
    setSavingEdit(true);
    try {
      await updateAsset(editId, { category: editCategory, unit: editUnit, min_threshold: editThreshold });
      setShowEdit(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal mengupdate aset");
    } finally {
      setSavingEdit(false);
    }
  };

  const openDelete = (id: string) => {
    setDeleteId(id);
    const parts = id.split("::");
    const name = parts.length > 1 ? parts[parts.length - 1] : id;
    setDeleteName(name);
    setShowDelete(true);
  };

  const handleDeleteAsset = async () => {
    setDeleting(true);
    try {
      await deleteAsset(deleteId);
      setShowDelete(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus aset");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Inventaris Pusat"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari komoditas..."
        showNotifications
      />

      <div className="space-y-6 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-ls-muted">Memuat data...</div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-ls-danger">{error}</p>
            <Button onClick={loadData} variant="outline" size="sm">Coba Lagi</Button>
          </div>
        ) : (
          <>
            <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-ls-navy">Ringkasan Total Stok</h2>
                <p className="text-xs text-ls-muted">
                  Update terakhir: {summary?.updated_at ? new Date(summary.updated_at).toLocaleString("id-ID") : "-"}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total Item" value={formatNumber(summary?.total_item || 0)} sublabel="Unit / Pcs / Karton" tone="default" />
                <StatCard label="Stok Kritis" value={String(summary?.critical_count || 0)} sublabel="Item di bawah batas" tone="danger" />
                <StatCard label="Distribusi Hari Ini" value={String(summary?.distribution_today || 0)} sublabel="Item keluar" tone="success" />
                <StatCard label="Posko Terlayani" value={`${summary?.posko_served || 0}`} sublabel={`dari ${summary?.active_posko_count || 0} posko aktif`} tone="muted" />
              </div>
            </div>

            {filteredCategories.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-3">
                {filteredCategories.map((cat) => (
                  <CategoryCard
                    key={cat.category}
                    title={cat.title}
                    subtitle={cat.subtitle}
                    itemCount={cat.item_count}
                    category={cat.category}
                    accent={accentColors[cat.category] || "#64748b"}
                    accentBg={accentClasses[cat.category] || "bg-slate-500"}
                    items={cat.items}
                    onAddStock={openAdd}
                    onEdit={openEdit}
                    onDelete={openDelete}
                  />
                ))}
              </div>
            )}

            {trendLines.data.length > 0 && (
              <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-ls-navy">Tren Distribusi Mingguan</h2>
                    <p className="text-xs text-ls-muted">Perbandingan stok masuk vs stok keluar per hari</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-ls-muted">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#1f3b7d]" aria-hidden />
                      <span>Stok Masuk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-slate-300" aria-hidden />
                      <span>Stok Keluar</span>
                    </div>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendLines.data} margin={{ left: 8, right: 8, top: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                        }}
                      />
                      <Line type="monotone" dataKey="masuk" stroke="#1f3b7d" strokeWidth={2} dot={{ r: 3 }} name="Stok Masuk" />
                      <Line type="monotone" dataKey="keluar" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Stok Keluar" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ls-navy">Pembacaan Sensor IoT</h2>
                  <p className="text-xs text-ls-muted">Data timbangan dari load cell per komoditas</p>
                </div>
                {readings.length > 0 && (
                  <select
                    value={iotFilter}
                    onChange={(e) => setIotFilter(e.target.value)}
                    className="rounded-ls-md border border-ls-border bg-white px-3 py-1.5 text-xs text-ls-navy"
                  >
                    <option value="all">Semua Komoditas</option>
                    {[...new Set(readings.map((r) => r.commodity))].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>
              {readings.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(
                    readings
                      .filter((r) => iotFilter === "all" || r.commodity === iotFilter)
                      .reduce<Record<string, StockReading[]>>((acc, r) => {
                        (acc[r.commodity] ??= []).push(r);
                        return acc;
                      }, {})
                  ).map(([commodity, rs]) => {
                    const latest = rs[0];
                    const avg = rs.reduce((s, r) => s + r.weight_g, 0) / rs.length;
                    return (
                      <div key={commodity} className="rounded-ls-md border border-ls-border p-4 text-sm">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-semibold capitalize text-ls-navy">{commodity}</span>
                          <span className="rounded-full bg-ls-sidebar px-2 py-0.5 text-[10px] font-medium text-ls-muted">{rs.length} bacaan</span>
                        </div>
                        <div className="space-y-1.5 text-xs text-ls-muted">
                          <div className="flex justify-between">
                            <span>Berat terkini</span>
                            <span className="font-mono font-semibold text-ls-navy">{(latest.weight_g / 1000).toFixed(2)} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Berat rata-rata</span>
                            <span className="font-mono text-ls-navy">{(avg / 1000).toFixed(2)} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Delta</span>
                            <span className={`font-mono ${latest.weight_delta_g < 0 ? "text-red-500" : "text-green-600"}`}>
                              {latest.weight_delta_g >= 0 ? "+" : ""}{(latest.weight_delta_g / 1000).toFixed(2)} kg
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Baterai</span>
                            <span className={`font-mono ${latest.battery_mv !== null && latest.battery_mv < 3000 ? "text-red-500" : "text-ls-navy"}`}>
                              {latest.battery_mv !== null ? `${(latest.battery_mv / 1000).toFixed(2)}V` : "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sinyal RSSI</span>
                            <span className="font-mono text-ls-navy">{latest.rssi} dBm</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Node</span>
                            <span className="font-mono text-ls-navy">{latest.node_id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Terakhir</span>
                            <span className="text-ls-navy">{new Date(latest.timestamp).toLocaleString("id-ID")}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-10 text-sm text-ls-muted">
                  <span className="text-2xl">📡</span>
                  <span>Belum ada data dari sensor IoT</span>
                  <span className="text-xs">Kirim data via POST /api/stock-readings atau melalui MQTT</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-ls-lg border border-ls-border bg-white p-6 shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-ls-navy">Tambah Stok</h2>
            <div className="space-y-4">
              <Field label="Kategori">
                <SelectField value={addCategory} onChange={(e) => setAddCategory(e.target.value)}>
                  <option value="pangan">Pangan</option>
                  <option value="sandang">Sandang</option>
                  <option value="papan">Papan</option>
                  <option value="lainnya">Lainnya</option>
                </SelectField>
              </Field>
              <Field label="Komoditas">
                <Input value={addCommodity} onChange={(e) => setAddCommodity(e.target.value)} placeholder="beras" />
              </Field>
              <Field label="Gudang">
                <Input value={addWarehouseId} onChange={(e) => setAddWarehouseId(e.target.value)} placeholder="WH-JKT-001" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jumlah">
                  <Input type="number" value={addQuantity || ""} onChange={(e) => setAddQuantity(Number(e.target.value))} />
                </Field>
                <Field label="Satuan">
                <SelectField value={addUnit} onChange={(e) => setAddUnit(e.target.value)}>
                    <option value="kg">kg</option>
                    <option value="liter">liter</option>
                    <option value="pcs">pcs</option>
                    <option value="karton">karton</option>
                    <option value="unit">unit</option>
                  </SelectField>
                </Field>
              </div>
              <Field label="Batas Minimum">
                <Input type="number" value={addThreshold || ""} onChange={(e) => setAddThreshold(Number(e.target.value))} />
              </Field>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)} disabled={submitting}>Batal</Button>
              <Button type="button" variant="primary" onClick={handleAddStock} disabled={submitting || !addCommodity || addQuantity <= 0}>
                {submitting ? "Menyimpan..." : "Tambah Stok"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-ls-lg border border-ls-border bg-white p-6 shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-ls-navy">Edit Aset</h2>
            <p className="text-xs text-ls-muted">{editCommodity} ({editId})</p>
            <div className="space-y-4">
              <Field label="Kategori">
                <SelectField value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                  <option value="pangan">Pangan</option>
                  <option value="sandang">Sandang</option>
                  <option value="papan">Papan</option>
                  <option value="lainnya">Lainnya</option>
                </SelectField>
              </Field>
              <Field label="Satuan">
                <SelectField value={editUnit} onChange={(e) => setEditUnit(e.target.value)}>
                  <option value="kg">kg</option>
                  <option value="pcs">pcs</option>
                  <option value="karton">karton</option>
                  <option value="unit">unit</option>
                  <option value="liter">liter</option>
                </SelectField>
              </Field>
              <Field label={`Batas Minimum (${editUnit})`}>
                <Input type="number" value={editThreshold || ""} onChange={(e) => setEditThreshold(Number(e.target.value))} />
              </Field>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)} disabled={savingEdit}>Batal</Button>
              <Button type="button" variant="primary" onClick={handleEditAsset} disabled={savingEdit}>
                {savingEdit ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-ls-lg border border-ls-border bg-white p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-ls-navy">Hapus Aset</h2>
            <p className="text-sm text-ls-muted">
              Yakin ingin menghapus <strong>{deleteName}</strong>? Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>Batal</Button>
              <Button type="button" variant="destructive" onClick={handleDeleteAsset} disabled={deleting}>
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <p className="border-t border-ls-border px-6 py-3 text-center text-xs text-ls-muted">
        LOG-SHIELD • Inventaris Pusat • Komponen dari @log-shield/ui-core
      </p>
    </>
  );
}
