import { useMemo, useState, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  AppLayout,
  LogShieldSidebar,
  PageHeader,
  SelectField,
  StatCard,
} from "@log-shield/ui-core";
import {
  AlertTriangle,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Filter,
  LayoutDashboard,
  Settings,
  Package,
  Sparkles,
  Users,
  MapPin,
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
import { AssetsPage } from "./pages/Assets";
import { LandingPage } from "./pages/Landing";
import { LogisticsPage } from "./pages/Logistics";
import { LogisticsRequestPage } from "./pages/LogisticsRequest";
import { LoginPage } from "./pages/Login";
import { SignupPage } from "./pages/Signup";
import { PersonnelPage } from "./pages/Personnel";
import { PoskoPage } from "./pages/Posko";
import { SettingsPage } from "./pages/Settings";
import { getStoredToken, getStoredUser, clearAuth } from "./lib/api";
import type { UserProfile } from "./lib/api";
import logoMark from "./assets/logo.svg";

const weeklyStockData = [
  { day: "MON", kebutuhan: 420, persediaan: 360 },
  { day: "TUE", kebutuhan: 620, persediaan: 500 },
  { day: "WED", kebutuhan: 760, persediaan: 300 },
  { day: "THU", kebutuhan: 450, persediaan: 590 },
  { day: "FRI", kebutuhan: 320, persediaan: 420 },
  { day: "SAT", kebutuhan: 360, persediaan: 470 },
  { day: "SUN", kebutuhan: 740, persediaan: 520 },
];

const regionalRows = [
  { label: "Sandang", values: [18, 32, 24, 56, 22, 26, 52] },
  { label: "Pangan", values: [24, 48, 60, 30, 20, 26, 36] },
  { label: "Papan", values: [20, 88, 96, 72, 28, 22, 78] },
  { label: "Lainnya", values: [26, 40, 54, 32, 30, 28, 64] },
];

const poskoLabels = [
  "(NamaPosko)",
  "(NamaPosko)",
  "(NamaPosko)",
  "(NamaPosko)",
  "(NamaPosko)",
  "(NamaPosko)",
  "(NamaPosko)",
];

const vulnerableDistribution = [
  { label: "Balita", value: 82, className: "bg-[#6478a9]" },
  { label: "Lansia", value: 15, className: "bg-[#c8d2e6]" },
  { label: "Ibu Hamil", value: 94, className: "bg-[#3f5b9e]" },
  { label: "Disabilitas", value: 48, className: "bg-[#9daac4]" },
];

function DashboardPage() {
  const [search, setSearch] = useState("");
  const [stockWeightItem, setStockWeightItem] = useState("pangan-beras");
  const stockWeightOptions = [
    { label: "Pangan - Beras", value: "pangan-beras" },
    { label: "Pangan - Mie Instan", value: "pangan-mie" },
    { label: "Pangan - Air Mineral", value: "pangan-air" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" searchValue={search} onSearchChange={setSearch} showNotifications />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Posko" value="1,240" icon={ClipboardCheck} />
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ls-navy">
              Daily Stock Weight per Item Category
            </h2>
            <div className="flex items-center gap-4 text-sm text-ls-navy">
              <SelectField
                value={stockWeightItem}
                onChange={(event) => setStockWeightItem(event.target.value)}
                className="h-8 w-44 bg-white text-xs"
                aria-label="Pilih item stok harian"
              >
                {stockWeightOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <Filter className="size-4" />
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyStockData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis hide domain={[200, 800]} />
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
            <div className="space-y-1.5">
              {regionalRows.map((row) => (
                <div key={row.label} className="flex items-center gap-1.5">
                  <span className="w-14 text-[10px] text-ls-muted">{row.label}</span>
                  <div className="grid flex-1 grid-cols-7 gap-1.5">
                    {row.values.map((value, index) => (
                      <div
                        key={`${row.label}-${index}`}
                        className="h-8 rounded-sm bg-[#3f5b9e]"
                        style={{ opacity: Math.max(0.14, value / 100) }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-[56px_1fr] items-start gap-1.5">
              <span />
              <div className="grid grid-cols-7 gap-1.5">
                {poskoLabels.map((label, index) => (
                  <span key={`${label}-${index}`} className="truncate text-[9px] text-ls-muted">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
            <h2 className="mb-5 text-base font-semibold text-ls-navy">
              Pemenuhan Distribusi Kelompok Rentan
            </h2>
            <div className="space-y-5">
              {vulnerableDistribution.map((item) => (
                <div key={item.label} className="grid grid-cols-[90px_1fr_28px] items-center gap-3">
                  <span className="text-xs text-ls-muted">{item.label}</span>
                  <div className="h-7 rounded-sm bg-slate-100">
                    <div
                      className={`h-7 rounded-sm ${item.className}`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-ls-muted">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
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
    path: "/dashboard",
    element: <DashboardPage />,
  },
  {
    id: "logistics",
    label: "Logistics",
    icon: Package,
    path: "/logistics",
    element: <LogisticsRequestPage />,
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
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    path: "/settings",
    element: <SettingsPage />,
  },
];

function ProtectedLayout({
  isAuthenticated,
  sidebar,
}: {
  isAuthenticated: boolean;
  sidebar: ReactNode;
}) {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <AppLayout sidebar={sidebar}>
      <Outlet />
    </AppLayout>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(() => {
    return getStoredUser();
  });
  const isAuthenticated = !!user && !!getStoredToken();
  const activeId =
    routes.find((route) => location.pathname.startsWith(route.path))?.id ?? "dashboard";

  const handleLogin = (redirectTo = "/dashboard") => {
    const currentUser = getStoredUser();
    setUser(currentUser);
    navigate(redirectTo, { replace: true });
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    navigate("/login", { replace: true });
  };

  const sidebar = useMemo(
    () => (
      <LogShieldSidebar
        brandName="LogShield"
        brandLogoSrc={logoMark}
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
        onLogout={handleLogout}
        user={{ name: user?.name || "User", role: user?.role || "Unknown" }}
      />
    ),
    [activeId, navigate]
  );

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} />
        }
      />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedLayout isAuthenticated={isAuthenticated} sidebar={sidebar} />}>
        {routes.map((route) => (
          <Route key={route.id} path={route.path} element={route.element} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}
