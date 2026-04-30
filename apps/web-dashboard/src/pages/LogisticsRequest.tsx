import { useState } from "react";
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

const logisticsRequests = [
  {
    id: "REG-20246015-001",
    title: "Posko Cianjur A",
    location: "Cianjur, Jawa Barat",
    status: "Mendesak",
    statusColor: "danger" as const,
    date: "15 April 2024",
    time: "08:32 WIB",
    items: [
      { name: "Beras", quantity: "500 KG", keterangan: "Stok ±3 hari" },
      { name: "Selimut", quantity: "200 Pcs", keterangan: "Tambahan pengunji baru" },
      { name: "Air Mineral", quantity: "300 Karton", keterangan: "Kebutuhan harian" },
    ],
    actionLabel: "Proses Request",
  },
  {
    id: "REG-20249015-002",
    title: "Posko Garut B",
    location: "Garut, Jawa Barat",
    status: "Diproses",
    statusColor: "success" as const,
    date: "15 April 2024",
    time: "07:14 WIB",
    items: [
      { name: "Pakaian Dewasa", quantity: "150 Pcs", keterangan: "Ukuran campur" },
      { name: "Mie Instan", quantity: "100 Karton", keterangan: "Stok darurat" },
      { name: "Obat P3K", quantity: "50 Kit", keterangan: "Perlengkapan medis dasar" },
    ],
    actionLabel: "Sedang Diproses",
    actionDisabled: true,
  },
  {
    id: "REG-20243014-008",
    title: "Posko Sukabumi C",
    location: "Sukabumi, Jawa Barat",
    status: "Selesai",
    statusColor: "info" as const,
    date: "14 April 2024",
    time: "15:45 WIB",
    items: [
      { name: "Tanda Penganggal", quantity: "10 Unit", keterangan: "Kebutuhan 5 orang" },
      { name: "Kayu Triplek", quantity: "500 Pcs", keterangan: "Partisisan shelter" },
    ],
    actionLabel: "✓ Selesai",
    actionDisabled: true,
  },
  {
    id: "REG-20249010-003",
    title: "Posko Bandung D",
    location: "Bandung, Jawa Barat",
    status: "Menunggu",
    statusColor: "warning" as const,
    date: "19 April 2024",
    time: "09:08 WIB",
    items: [
      { name: "Susu Formula", quantity: "80 Kaleng", keterangan: "Untuk bayi 0-12 bulan" },
      { name: "Obat Diare", quantity: "200 Strip", keterangan: "Kasus mengingat" },
    ],
    actionLabel: "Proses Request",
  },
];

interface LogisticsRequestItem {
  name: string;
  quantity: string;
  keterangan: string;
}

interface LogisticsRequestData {
  id: string;
  title: string;
  location: string;
  status: string;
  statusColor: "danger" | "success" | "info" | "warning";
  date: string;
  time: string;
  items: LogisticsRequestItem[];
  actionLabel: string;
  actionDisabled?: boolean;
}

function LogisticsRequestCard({ request }: { request: LogisticsRequestData }) {
  const variantMap = {
    danger: "danger" as const,
    success: "success" as const,
    info: "info" as const,
    warning: "warning" as const,
  };

  return (
    <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs text-ls-muted">{request.id}</div>
          <h3 className="text-base font-semibold text-ls-navy">{request.title}</h3>
          <p className="text-sm text-ls-muted">{request.location}</p>
        </div>
        <Badge variant={variantMap[request.statusColor]} dot>
          {request.status}
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
          {request.date} • {request.time}
        </div>
        <Button
          type="button"
          variant={request.actionDisabled ? "outline" : "primary"}
          size="md"
          disabled={request.actionDisabled}
        >
          {request.actionLabel}
        </Button>
      </div>
    </div>
  );
}

export function LogisticsRequestPage() {
  const [search, setSearch] = useState("");

  return (
    <>
      <PageHeader
        title="Logistics Request"
        onSearchChange={setSearch}
        showNotifications
      />
      <FilterBar meta="">
        <input
          type="text"
          placeholder="Nama Barang"
          className="rounded-ls-md border border-ls-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ls-primary"
        />
        <input
          type="text"
          placeholder="Nama Posko"
          className="rounded-ls-md border border-ls-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ls-primary"
        />
        <SelectField defaultValue="all" className="min-w-[180px]">
          <option value="all">Tanggal</option>
          <option value="today">Hari Ini</option>
          <option value="week">Minggu Ini</option>
          <option value="month">Bulan Ini</option>
        </SelectField>
        <Button type="button" variant="primary" size="md">
          Refresh
        </Button>
      </FilterBar>

      <div className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {logisticsRequests.map((request) => (
            <LogisticsRequestCard key={request.id} request={request} />
          ))}
        </div>
      </div>

      <p className="border-t border-ls-border px-6 py-3 text-center text-xs text-ls-muted">
        LOG-SHIELD • Logistics Request • Komponen dari @log-shield/ui-core
      </p>
    </>
  );
}
