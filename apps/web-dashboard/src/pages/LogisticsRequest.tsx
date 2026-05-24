import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  FilterBar,
  PageHeader,
  SelectField,
  Table,
  TableCell,
  TableHead,
  TableHeaderRow,
  TableRow,
} from "@log-shield/ui-core";
import { Plus, RefreshCw } from "lucide-react";
import {
  type RequestRow,
  completeRequest,
  fetchRequests,
  processRequest,
} from "../lib/api";

const statusBadge: Record<string, "danger" | "warning" | "success" | "info"> = {
  danger: "danger",
  warning: "warning",
  success: "success",
  info: "info",
};

function LogisticsRequestCard({
  request,
  onAction,
}: {
  request: RequestRow;
  onAction: (id: string, action: "process" | "complete") => void;
}) {
  return (
    <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs text-ls-muted">{request.request_code}</div>
          <h3 className="text-base font-semibold text-ls-navy">{request.title}</h3>
          <p className="text-sm text-ls-muted">{request.location}</p>
        </div>
        <Badge variant={statusBadge[request.status_color] || "muted"} dot>
          {request.status_label}
        </Badge>
      </div>

      <div className="mb-4">
        <Table>
          <thead>
            <TableHeaderRow>
              <TableHead>NAMA KEBUTUHAN</TableHead>
              <TableHead>JUMLAH</TableHead>
              <TableHead>KETERANGAN</TableHead>
            </TableHeaderRow>
          </thead>
          <tbody>
            {request.items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell className="text-ls-muted">{item.keterangan}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t border-ls-border pt-4">
        <div className="text-xs text-ls-muted">
          {request.date} &bull; {request.time}
        </div>
        <Button
          type="button"
          variant={request.status === "diproses" ? "primary" : request.action_disabled ? "outline" : "primary"}
          size="md"
          disabled={request.status === "selesai"}
          onClick={() => {
            if (request.status === "diproses") {
              onAction(request.id, "complete");
            } else {
              onAction(request.id, "process");
            }
          }}
        >
          {request.status === "diproses" ? "Selesaikan" : request.status === "selesai" ? "Selesai" : "Proses Request"}
        </Button>
      </div>
    </div>
  );
}

export function LogisticsRequestPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [data, setData] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (search) params.search = search;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await fetchRequests(params as any);
      setData(res.rows);
    } catch (err: any) {
      setError(err.message || "Gagal memuat request");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (id: string, action: "process" | "complete") => {
    try {
      if (action === "process") {
        await processRequest(id);
      } else {
        await completeRequest(id);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal memproses request");
    }
  };

  return (
    <>
      <PageHeader
        title="Logistics Request"
        searchPlaceholder="Cari request..."
        searchValue={search}
        onSearchChange={setSearch}
        showNotifications
      />

      <FilterBar meta={`${data.length} Request`}>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-ls-md border border-ls-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ls-primary"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-ls-md border border-ls-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ls-primary"
        />
        <SelectField
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-w-[160px]"
        >
          <option value="all">Semua Status</option>
          <option value="mendesak">Mendesak</option>
          <option value="menunggu">Menunggu</option>
          <option value="diproses">Diproses</option>
          <option value="selesai">Selesai</option>
        </SelectField>
        <Button
          type="button"
          variant="outline"
          size="md"
          leftIcon={<RefreshCw className="size-4" />}
          onClick={loadData}
        >
          Refresh
        </Button>
      </FilterBar>

      <div className="space-y-4 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-ls-muted">Memuat data...</div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-ls-danger">{error}</p>
            <Button onClick={loadData} variant="outline" size="sm">Coba Lagi</Button>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-ls-muted">Tidak ada request</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.map((request) => (
              <LogisticsRequestCard key={request.id} request={request} onAction={handleAction} />
            ))}
          </div>
        )}
      </div>

      <p className="border-t border-ls-border px-6 py-3 text-center text-xs text-ls-muted">
        LOG-SHIELD &bull; Logistics Request &bull; Komponen dari @log-shield/ui-core
      </p>
    </>
  );
}
