import { useEffect, useState } from "react";
import { PageHeader } from "@log-shield/ui-core";
import { AlertTriangle, CheckCircle, Search, Eye } from "lucide-react";
import {
  fetchAnomalyReports,
  updateAnomalyStatus,
  type AnomalyReport,
} from "../lib/api";

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const STATUS_STYLES: Record<string, string> = {
  reported: "bg-blue-100 text-blue-700",
  investigating: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  reported: "Dilaporkan",
  investigating: "Ditindaklanjuti",
  resolved: "Selesai",
};

export function AnomaliesPage() {
  const [reports, setReports] = useState<AnomalyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [search, setSearch] = useState("");

  const loadReports = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSeverity) params.severity = filterSeverity;
      const res = await fetchAnomalyReports(params);
      setReports(res.rows || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filterStatus, filterSeverity]);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateAnomalyStatus(id, status);
      loadReports();
    } catch (err: any) {
      alert("Gagal: " + (err.message || ""));
    }
  };

  const filtered = reports.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.commodity || "").toLowerCase().includes(q) ||
      (r.description || "").toLowerCase().includes(q) ||
      (r.location || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <PageHeader title="Laporan Anomali" />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded border border-ls-border bg-white px-3 py-1.5 text-xs">
            <Search className="size-3.5 text-ls-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari sesuatu..."
              className="border-0 bg-transparent outline-none text-ls-navy"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-7 rounded border border-ls-border bg-white px-2 text-xs text-ls-navy"
          >
            <option value="">Semua Status</option>
            <option value="reported">Dilaporkan</option>
            <option value="investigating">Ditindaklanjuti</option>
            <option value="resolved">Selesai</option>
          </select>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="h-7 rounded border border-ls-border bg-white px-2 text-xs text-ls-navy"
          >
            <option value="">Semua Tingkat</option>
            <option value="low">Rendah</option>
            <option value="medium">Sedang</option>
            <option value="high">Tinggi</option>
            <option value="critical">Kritis</option>
          </select>
          <button onClick={loadReports} className="rounded bg-ls-navy px-3 py-1.5 text-xs font-medium text-white">
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-ls-muted text-center py-8">Memuat laporan...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-ls-muted">
            <AlertTriangle className="size-8 mb-2" />
            <p className="text-sm">Belum ada laporan anomali</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r._id} className="rounded-lg border border-ls-border bg-white p-4 text-xs">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-semibold text-ls-navy capitalize">{r.commodity}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${SEVERITY_STYLES[r.severity] || ""}`}>
                    {r.severity}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLES[r.status] || ""}`}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                </div>
                {r.description && (
                  <p className="text-ls-muted mb-1.5">{r.description}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-ls-muted">
                  <span>Posko: <strong>{r.posko_id}</strong></span>
                  {r.location && <span>Lokasi: <strong>{r.location}</strong></span>}
                  <span>Pelapor: <strong>{r.reported_by}</strong></span>
                  <span>{new Date(r.created_at).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {r.status !== "resolved" && (
                  <div className="mt-3 flex gap-2">
                    {r.status === "reported" && (
                      <button onClick={() => handleStatusUpdate(r._id, "investigating")}
                        className="flex items-center gap-1 rounded bg-purple-600 px-2.5 py-1.5 text-[10px] font-bold text-white"
                      ><Eye className="size-3" />Tindaklanjuti</button>
                    )}
                    {r.status === "investigating" && (
                      <button onClick={() => handleStatusUpdate(r._id, "resolved")}
                        className="flex items-center gap-1 rounded bg-green-600 px-2.5 py-1.5 text-[10px] font-bold text-white"
                      ><CheckCircle className="size-3" />Selesaikan</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
