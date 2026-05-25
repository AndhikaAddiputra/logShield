import { useEffect, useState } from "react";
import { isOfflineMode } from "../lib/offlineOutbox";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => !isOfflineMode());

  useEffect(() => {
    const refresh = () => setOnline(!isOfflineMode());
    const up = () => refresh();
    const down = () => refresh();
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    window.addEventListener("logshield-network-status", refresh);
    const interval = window.setInterval(refresh, 1000);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      window.removeEventListener("logshield-network-status", refresh);
      window.clearInterval(interval);
    };
  }, []);

  return online;
}
