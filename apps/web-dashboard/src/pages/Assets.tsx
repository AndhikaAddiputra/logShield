import { useMemo, useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  PageHeader,
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

const summaryStats = [
  {
    label: "Total Item",
    value: "5,847",
    sublabel: "Unit / Pcs / Karton",
    tone: "default" as const,
  },
  {
    label: "Stok Kritis",
    value: "12",
    sublabel: "Item di bawah batas",
    tone: "danger" as const,
  },
  {
    label: "Distribusi Hari Ini",
    value: "324",
    sublabel: "Item keluar",
    tone: "success" as const,
  },
  {
    label: "Posko Terlayani",
    value: "47",
    sublabel: "dari 52 posko aktif",
    tone: "muted" as const,
  },
];

const sandangItems = [
  {
    name: "Pakaian Dewasa",
    stock: 500,
    unit: "Pcs",
    progress: 84,
    barClass: "bg-[#1f3b7d]",
  },
  {
    name: "Pakaian Anak",
    stock: 300,
    unit: "Pcs",
    progress: 62,
    barClass: "bg-[#1f3b7d]/70",
  },
  {
    name: "Alas Kaki",
    stock: 150,
    unit: "Pasang",
    progress: 38,
    barClass: "bg-amber-400",
  },
];

const panganItems = [
  { name: "Beras", amount: "20 Ton", color: "bg-[#1f3b7d]" },
  { name: "Mie Instan", amount: "1.000 Karton", color: "bg-[#3b82f6]" },
  { name: "Air Mineral", amount: "500 Karton", color: "bg-[#93c5fd]" },
];

const papanItems = [
  {
    name: "Kayu Triplek",
    stock: 1000,
    unit: "Pcs",
    progress: 82,
    barClass: "bg-emerald-500",
  },
  {
    name: "Paku",
    stock: 100,
    unit: "Box",
    progress: 36,
    barClass: "bg-emerald-500/70",
  },
  {
    name: "Baut",
    stock: 200,
    unit: "Pcs",
    progress: 58,
    barClass: "bg-amber-400",
  },
];

const distributionData = [
  { day: "Mon", masuk: 680, keluar: 420 },
  { day: "Tue", masuk: 820, keluar: 520 },
  { day: "Wed", masuk: 930, keluar: 360 },
  { day: "Thu", masuk: 860, keluar: 520 },
  { day: "Fri", masuk: 920, keluar: 560 },
  { day: "Sat", masuk: 880, keluar: 460 },
  { day: "Sun", masuk: 910, keluar: 600 },
];

const donutData = [
  { name: "Tercapai", value: 59 },
  { name: "Sisa", value: 41 },
];

function formatNumber(value: number) {
  return value.toLocaleString("id-ID");
}

function StockRow({
  name,
  stock,
  unit,
  progress,
  barClass,
}: {
  name: string;
  stock: number;
  unit: string;
  progress: number;
  barClass: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ls-navy">{name}</span>
        <span className="text-xs font-semibold text-ls-navy">
          {formatNumber(stock)}
          <span className="ml-1 text-[10px] uppercase text-ls-muted">{unit}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100">
        <div
          className={`h-1.5 rounded-full ${barClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function CategoryCard({
  title,
  subtitle,
  itemCount,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  itemCount: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden" style={{ borderTopWidth: 4, borderTopColor: accent }}>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-ls-navy">{title}</h3>
            <p className="text-xs text-ls-muted">{subtitle}</p>
          </div>
          <Badge variant="muted">{itemCount}</Badge>
        </div>
        {children}
      </CardContent>
      <div className="border-t border-ls-border bg-ls-sidebar/40 px-5 py-3">
        <Button type="button" variant="outline" size="sm" className="w-full">
          + Tambah Stok
        </Button>
      </div>
    </Card>
  );
}

export function AssetsPage() {
  const [search, setSearch] = useState("");
  const donutColors = useMemo(() => ["#1f3b7d", "#e2e8f0"], []);

  return (
    <>
      <PageHeader
        title="Inventaris Pusat"
        searchValue={search}
        onSearchChange={setSearch}
        showNotifications
      />

      <div className="space-y-6 p-6">
        <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-ls-navy">Ringkasan Total Stok</h2>
            <p className="text-xs text-ls-muted">Update terakhir: 15 April 2024, 06:00 WIB</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryStats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                sublabel={stat.sublabel}
                tone={stat.tone}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <CategoryCard
            title="Sandang"
            subtitle="Pakaian & Kebutuhan Berpakaian"
            itemCount="3 Item"
            accent="#1f3b7d"
          >
            <div className="text-[11px] font-semibold uppercase text-ls-muted">
              <div className="flex items-center justify-between">
                <span>Nama Item</span>
                <span>Stok</span>
              </div>
            </div>
            <div className="space-y-3">
              {sandangItems.map((item) => (
                <StockRow key={item.name} {...item} />
              ))}
            </div>
            <div className="rounded-ls-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Alas kaki mendekati batas minimum.
            </div>
          </CategoryCard>

          <CategoryCard
            title="Pangan"
            subtitle="Kebutuhan Pangan & Nutrisi"
            itemCount="3 Item"
            accent="#2563eb"
          >
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-2 text-sm">
                {panganItems.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${item.color}`} aria-hidden />
                    <div>
                      <div className="text-sm font-medium text-ls-navy">{item.name}</div>
                      <div className="text-xs text-ls-muted">{item.amount}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="relative h-36 w-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      innerRadius={46}
                      outerRadius={60}
                      dataKey="value"
                      paddingAngle={2}
                      stroke="none"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={entry.name} fill={donutColors[index]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-ls-navy">
                  59%
                </div>
              </div>
            </div>
          </CategoryCard>

          <CategoryCard
            title="Papan"
            subtitle="Material Shelter & Bangunan"
            itemCount="3 Item"
            accent="#16a34a"
          >
            <div className="text-[11px] font-semibold uppercase text-ls-muted">
              <div className="flex items-center justify-between">
                <span>Nama Item</span>
                <span>Stok</span>
              </div>
            </div>
            <div className="space-y-3">
              {papanItems.map((item) => (
                <StockRow key={item.name} {...item} />
              ))}
            </div>
          </CategoryCard>
        </div>

        <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ls-navy">Tren Distribusi Mingguan</h2>
              <p className="text-xs text-ls-muted">
                Perbandingan stok masuk vs stok keluar per hari
              </p>
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
              <LineChart data={distributionData} margin={{ left: 8, right: 8, top: 12 }}>
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
                <Line
                  type="monotone"
                  dataKey="masuk"
                  stroke="#1f3b7d"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Stok Masuk"
                />
                <Line
                  type="monotone"
                  dataKey="keluar"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Stok Keluar"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <p className="border-t border-ls-border px-6 py-3 text-center text-xs text-ls-muted">
        LOG-SHIELD • Inventaris Pusat • Komponen dari @log-shield/ui-core
      </p>
    </>
  );
}
