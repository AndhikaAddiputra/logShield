import { useEffect, useMemo, useState } from "react";
import { MobileBottomNav } from "@log-shield/ui-core";
import { LayoutDashboard, Package, User } from "lucide-react";
import { createLocalDb, startCouchReplication } from "./lib/pouch";
import { useSyncStore } from "./store/syncStore";
import { MobileDashboardPage } from "./pages/MobileDashboardPage";
import { MobilePlaceholderPage } from "./pages/MobilePlaceholderPage";

type MobileTab = "dashboard" | "logistics" | "profile";

const navItems = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "logistics" as const, label: "Logistik", icon: Package },
  { id: "profile" as const, label: "Profil", icon: User },
];

export default function App() {
  const [tab, setTab] = useState<MobileTab>("dashboard");
  const remoteUrl = import.meta.env.VITE_COUCHDB_URL;

  useEffect(() => {
    const local = createLocalDb();
    if (!remoteUrl) {
      useSyncStore.getState().setFromReplication({
        status: "paused",
        detail:
          "Variabel VITE_COUCHDB_URL belum diatur — hanya mode lokal (tanpa replikasi).",
      });
      return;
    }
    const handle = startCouchReplication(local, remoteUrl);
    return () => {
      handle.cancel();
    };
  }, [remoteUrl]);

  const bottomNavItems = useMemo(
    () =>
      navItems.map(({ id, label, icon }) => ({
        id,
        label,
        icon,
      })),
    []
  );

  return (
    <div className="relative flex min-h-dvh flex-col bg-ls-surface">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {tab === "dashboard" ? (
          <MobileDashboardPage
            onMenuPress={() => {
              /* drawer menu — iterasi berikutnya */
            }}
            onAddResource={() => {
              /* navigasi ke data entry — iterasi berikutnya */
            }}
          />
        ) : null}
        {tab === "logistics" ? (
          <MobilePlaceholderPage title="Logistik" />
        ) : null}
        {tab === "profile" ? (
          <MobilePlaceholderPage title="Profil" />
        ) : null}
      </div>

      <MobileBottomNav
        items={bottomNavItems}
        activeId={tab}
        onChange={(id) => setTab(id as MobileTab)}
      />
    </div>
  );
}
