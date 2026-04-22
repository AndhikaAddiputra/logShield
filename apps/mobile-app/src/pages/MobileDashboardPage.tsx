import {
  Button,
  LogItem,
  MobileHeader,
  ResourceStatCard,
  StatusBanner,
  TelemetryRow,
} from "@log-shield/ui-core";
import type { StatusBannerVariant } from "@log-shield/ui-core";
import type { SyncStatus } from "@log-shield/shared-types";
import { Droplet, FileEdit, Package } from "lucide-react";
import { useSyncStore } from "../store/syncStore";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

function bannerForSync(
  online: boolean,
  status: SyncStatus
): { message: string; variant: StatusBannerVariant } {
  if (status === "error") {
    return {
      message: "STATUS: GANGGUAN SINKRON — periksa jaringan lalu coba lagi",
      variant: "danger",
    };
  }
  if (status === "syncing") {
    return { message: "STATUS: SINKRONISASI AKTIF", variant: "success" };
  }
  if (!online) {
    return { message: "STATUS OFFLINE: SINKRON", variant: "success" };
  }
  return { message: "TERHUBUNG · SINKRON", variant: "success" };
}

export interface MobileDashboardPageProps {
  onMenuPress?: () => void;
  onAddResource?: () => void;
}

export function MobileDashboardPage({
  onMenuPress,
  onAddResource,
}: MobileDashboardPageProps) {
  const online = useOnlineStatus();
  const { status } = useSyncStore();
  const banner = bannerForSync(online, status);

  return (
    <div className="min-h-0 flex-1">
      <MobileHeader offline={!online} onMenuPress={onMenuPress} />
      <StatusBanner message={banner.message} variant={banner.variant} />

      <main className="space-y-6 px-4 pb-28 pt-5">
        <header>
          <h1 className="text-xl font-bold uppercase tracking-wide text-ls-navy">
            Operational Overview
          </h1>
          <div className="mt-2 flex gap-3 border-l-4 border-ls-accent pl-3">
            <div>
              <p className="text-sm font-semibold text-ls-navy">Rajeg Timur</p>
              <p className="text-xs text-ls-muted">Posko Evakuasi</p>
            </div>
          </div>
        </header>

        <section className="space-y-3" aria-label="Stok utama">
          <ResourceStatCard
            title="Penyimpanan Air"
            value="844"
            unit="L"
            icon={Droplet}
            progressPercent={82}
          />
          <ResourceStatCard
            title="Ransum"
            value="1,240"
            unit="Porsi"
            icon={Package}
            progressPercent={58}
          />
        </section>

        <section
          className="rounded-ls-lg border border-ls-border bg-ls-sidebar/80 p-4"
          aria-label="Aksi lapangan"
        >
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-ls-muted">
            Aksi langsung lapangan
          </p>
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="mt-3 w-full rounded-ls py-6 text-sm font-bold uppercase tracking-wide"
            leftIcon={<FileEdit className="size-5" />}
            onClick={onAddResource}
          >
            Tambah sumber daya
          </Button>
        </section>

        <section aria-label="Log terbaru">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ls-navy">
            Recent logs
          </h2>
          <div className="space-y-2">
            <LogItem
              time="12:45"
              title="Permintaan LSH-01 dibuat"
              detail="400L Air / 50 unit pangan"
            />
            <LogItem
              time="11:20"
              title="Kalibrasi sensor perangkat"
              detail="Cell ID: LC-009 reset"
            />
          </div>
        </section>

        <section
          className="rounded-ls-lg border border-ls-border bg-white p-4 shadow-ls"
          aria-label="Telemetri perangkat"
        >
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ls-muted">
            Telemetri perangkat
          </h2>
          <div className="space-y-3">
            <TelemetryRow label="Baterai" value="92%" />
            <TelemetryRow
              label="Sinyal"
              value="Rendah (12KB/s)"
              valueTone="danger"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
