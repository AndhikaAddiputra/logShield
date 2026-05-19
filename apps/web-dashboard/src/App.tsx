import { useMemo, useState, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  AppLayout,
  LogShieldSidebar,
} from "@log-shield/ui-core";
import {
  Boxes,
  LayoutDashboard,
  Settings,
  Package,
  Users,
  MapPin,
} from "lucide-react";
import { AssetsPage } from "./pages/Assets";
import { DashboardPage } from "./pages/Dashboard";
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
