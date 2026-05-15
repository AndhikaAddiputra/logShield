import { useEffect, useState } from "react";
import { createLocalDb, startCouchReplication } from "./lib/pouch";
import AppLayout from "./pages/AppLayout";
import { useSyncStore } from "./store/syncStore";
import { SplashScreen } from "./components/SplashScreen";

export default function App() {
  const remoteUrl = import.meta.env.VITE_COUCHDB_URL;
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Database initialization
    const local = createLocalDb();
    let handle: any;

    if (!remoteUrl) {
      useSyncStore.getState().setFromReplication({
        status: "paused",
        detail:
          "Variabel VITE_COUCHDB_URL belum diatur - hanya mode lokal tanpa replikasi.",
      });
    } else {
      handle = startCouchReplication(local, remoteUrl);
    }

    // Splash screen timer
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => {
      if (handle) handle.cancel();
      clearTimeout(splashTimer);
    };
  }, [remoteUrl]);

  return (
    <>
      {showSplash && <SplashScreen />}
      <div className={showSplash ? "hidden" : "block animate-fade-in"}>
        <AppLayout />
      </div>
    </>
  );
}
