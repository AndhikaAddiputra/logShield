import { useEffect } from "react";
import { createLocalDb, startCouchReplication } from "./lib/pouch";
import AppLayout from "./pages/AppLayout";
import { useSyncStore } from "./store/syncStore";

export default function App() {
  const remoteUrl = import.meta.env.VITE_COUCHDB_URL;

  useEffect(() => {
    const local = createLocalDb();
    if (!remoteUrl) {
      useSyncStore.getState().setFromReplication({
        status: "paused",
        detail:
          "Variabel VITE_COUCHDB_URL belum diatur - hanya mode lokal tanpa replikasi.",
      });
      return;
    }

    const handle = startCouchReplication(local, remoteUrl);
    return () => {
      handle.cancel();
    };
  }, [remoteUrl]);

  return <AppLayout />;
}
