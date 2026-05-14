import { useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  AppLayout,
  Badge,
  Button,
  FilterBar,
  LogShieldSidebar,
  PageHeader,
  Pagination,
  SelectField,
  StatCard,
  Table,
  TableCell,
  TableHead,
  TableHeaderRow,
  TableRow,
} from "@log-shield/ui-core";
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Package,
  Sparkles,
  Users,
  MapPin,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AssetsPage } from "./pages/Assets";
import { LogisticsPage } from "./pages/Logistics";
import { LogisticsRequestPage } from "./pages/LogisticsRequest";
import { PersonnelPage } from "./pages/Personnel";
import { PoskoPage } from "./pages/Posko";

const chartDemo = [
  { name: "Mon", kebutuhan: 400, persediaan: 320 },
  { name: "Tue", kebutuhan: 380, persediaan: 340 },
  { name: "Wed", kebutuhan: 420, persediaan: 300 },
];

function DashboardPage() {
  const [page, setPage] = useState(1);

  return (
    <>
      <PageHeader title="Dashboard" onSearchChange={() => {}} showNotifications />
      <FilterBar meta="Ringkasan wilayah aktif">
        <SelectField defaultValue="all" className="min-w-[180px]">
          <option value="all">Semua posko</option>
        </SelectField>
        <Button type="button" variant="primary" size="md">
          Refresh
        </Button>
      </FilterBar>

      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Posko" value="1,240" icon={ClipboardList} />
          <StatCard
            label="Critical Items"
            value="42 Units"
            tone="danger"
            icon={AlertTriangle}
          />
          <StatCard
            label="Pending Requests"
            value="188"
            icon={ClipboardList}
          />
          <StatCard
            label="AI Health"
            value="Stable"
            tone="success"
            icon={Sparkles}
          />
        </div>

        <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-ls-navy">
              Daily Stock Weight per Item Category
            </h2>
            <SelectField defaultValue="beras" className="w-44">
              <option value="beras">Pangan — Beras</option>
            </SelectField>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDemo}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="kebutuhan" fill="#1a2b5d" name="Kebutuhan" radius={[4, 4, 0, 0]} />
                <Bar dataKey="persediaan" fill="#94a3b8" name="Persediaan" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
          <h2 className="mb-4 text-base font-semibold text-ls-navy">
            Contoh tabel personel
          </h2>
          <Table>
            <thead>
              <TableHeaderRow>
                <TableHead>Nama</TableHead>
                <TableHead>KIB</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Aksi</TableHead>
              </TableHeaderRow>
            </thead>
            <tbody>
              <TableRow>
                <TableCell className="font-medium">Dewi Lestari</TableCell>
                <TableCell>
                  <Badge variant="muted">BNC-2024-JB-0142</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="success" dot>
                    Lapangan
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button type="button" variant="destructive" size="sm">
                      Hapus
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </tbody>
          </Table>
          <Pagination
            className="mt-4"
            currentPage={page}
            totalPages={8}
            onPageChange={setPage}
            summary="Menampilkan 7 dari 52 personel"
          />
        </div>
      </div>

      <p className="border-t border-ls-border px-6 py-3 text-center text-xs text-ls-muted">
        LOG-SHIELD • Dashboard • Komponen dari @log-shield/ui-core
      </p>
    </>
  );
}

const routes = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
    element: <DashboardPage />,
  },
  {
    id: "logistics",
    label: "Logistics",
    icon: Package,
    path: "/logistics",
    element: <LogisticsPage />,
  },
  {
    id: "posko",
    label: "Data Posko",
    icon: MapPin,
    path: "/posko",
    element: <PoskoPage />,
  },
  {
    id: "assets",
    label: "Assets",
    icon: Boxes,
    path: "/assets",
    element: <AssetsPage />,
  },
  {
    id: "personnel",
    label: "Personnel",
    icon: Users,
    path: "/personnel",
    element: <PersonnelPage />,
  },
];

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId =
    routes.find((route) =>
      route.path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(route.path)
    )?.id ?? "dashboard";

  const sidebar = useMemo(
    () => (
      <LogShieldSidebar
        productSubtitle="Disaster Response v1.2"
        navItems={routes.map(({ id, label, icon }) => ({ id, label, icon }))}
        activeId={activeId}
        onNavigate={(id) => {
          const target = routes.find((route) => route.id === id);
          if (target) {
            navigate(target.path);
          }
        }}
        onNewReport={() => {}}
        onSupportClick={() => {}}
        user={{ name: "Anakin", role: "Officer 742" }}
      />
    ),
    [activeId, navigate]
  );

  return (
    <AppLayout sidebar={sidebar}>
      <Routes>
        {routes.map((route) => (
          <Route key={route.id} path={route.path} element={route.element} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
