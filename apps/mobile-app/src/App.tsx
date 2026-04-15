import { useEffect, useMemo, useState } from "react";
import { Shell } from "@log-shield/ui-core";
import { isValidKib16 } from "@log-shield/shared-types";
import { createLocalDb, startCouchReplication } from "./lib/pouch";
import { useSyncStore } from "./store/syncStore";

export default function App() {
  const { status, detail, lastError } = useSyncStore();
  const [kibInput, setKibInput] = useState("");

  const remoteUrl = import.meta.env.VITE_COUCHDB_URL;
  const kibOk = useMemo(() => isValidKib16(kibInput.trim()), [kibInput]);

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

  const statusColor =
    status === "syncing"
      ? "text-amber-300"
      : status === "error"
        ? "text-rose-400"
        : "text-emerald-400";

  return (
    <Shell title="Log-Shield — Petugas Lapangan">
      <div className="space-y-6">
        <section
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
          aria-live="polite"
        >
          <h2 className="text-sm font-medium text-slate-300">
            Status sinkronisasi
          </h2>
          <p className={`mt-1 text-lg font-semibold ${statusColor}`}>
            {status.toUpperCase()}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{detail}</p>
          {lastError ? (
            <p className="mt-2 text-xs text-rose-300/90">{lastError}</p>
          ) : null}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <label className="text-sm text-slate-300" htmlFor="kib">
            KIB (16 digit) — validasi klien
          </label>
          <input
            id="kib"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-slate-100 outline-none ring-0 focus:border-sky-500"
            inputMode="numeric"
            maxLength={16}
            placeholder="Contoh: 3201010101010101"
            value={kibInput}
            onChange={(e) => setKibInput(e.target.value.replace(/\D/g, ""))}
          />
          <p className="mt-2 text-xs text-slate-500">
            {kibInput.length === 0
              ? "Masukkan tepat 16 angka."
              : kibOk
                ? "Format KIB valid."
                : "Belum valid — harus 16 digit numerik."}
          </p>
        </section>
      </div>
    </Shell>
  );
}
