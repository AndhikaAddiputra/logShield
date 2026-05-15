import { useState } from "react";
import { Avatar, Button, Input, PageHeader } from "@log-shield/ui-core";
import { Camera, Eye } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
}

const notificationSettings: NotificationItem[] = [
  {
    id: "email",
    title: "Notifikasi Email",
    description: "Terima update via email",
    enabled: true,
  },
  {
    id: "app",
    title: "Notifikasi Aplikasi",
    description: "Notifikasi push dalam aplikasi",
    enabled: true,
  },
  {
    id: "sms",
    title: "Notifikasi SMS",
    description: "Terima peringatan darurat via SMS",
    enabled: false,
    disabled: true,
  },
];

export function SettingsPage() {
  const [search, setSearch] = useState("");
  const [name] = useState("Anakin Skywalker");
  const [email] = useState("anakin@logshield.id");
  const [workUnit] = useState("SUMATERA BARAT II");
  const [status] = useState("AKTIF");
  const [password] = useState("********");
  const [notifications, setNotifications] = useState(notificationSettings);

  return (
    <>
      <PageHeader title="Pengaturan Sistem" searchValue={search} onSearchChange={setSearch} showNotifications />

      <div className="space-y-6 p-6">
        <section className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
          <div className="mb-4 border-b border-ls-border pb-3">
            <h2 className="text-base font-semibold text-ls-navy">Profil Akun</h2>
            <p className="text-xs text-ls-muted">Kelola informasi akun Anda</p>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar alt="Anakin Skywalker" fallback="AS" size="xl" className="bg-ls-navy" />
                <span className="absolute -bottom-1 -right-1 rounded-full bg-ls-navy p-1.5 text-white">
                  <Camera className="size-3.5" />
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-ls-navy">Foto Profil</p>
                <p className="mb-2 text-xs text-ls-muted">JPG atau PNG, max 2MB</p>
                <Button type="button" variant="outline" size="sm">
                  Ganti Foto
                </Button>
              </div>
            </div>
            <Button type="button" variant="primary" size="md" className="min-w-[200px]">
              Simpan Perubahan
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">Nama Lengkap</p>
                <Input value={name} readOnly />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">Email</p>
                <Input value={email} readOnly />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">Password Baru</p>
                <div className="relative">
                  <Input value={password} readOnly />
                  <Eye className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ls-muted" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">Satuan Kerja</p>
                <Input value={workUnit} readOnly />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">Aktif</p>
                <Input value={status} readOnly />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
          <div className="mb-4 border-b border-ls-border pb-3">
            <h2 className="text-base font-semibold text-ls-navy">Notifikasi</h2>
            <p className="text-xs text-ls-muted">Atur preferensi notifikasi Anda</p>
          </div>

          <div className="divide-y divide-ls-border">
            {notifications.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ls-navy">{item.title}</p>
                  <p className="text-xs text-ls-muted">{item.description}</p>
                </div>

                <label
                  htmlFor={item.id}
                  className={`relative inline-flex h-6 w-11 shrink-0 ${
                    item.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  }`}
                >
                  <input
                    id={item.id}
                    type="checkbox"
                    className="peer sr-only"
                    checked={item.enabled}
                    disabled={item.disabled}
                    onChange={(event) => {
                      setNotifications((current) =>
                        current.map((config) =>
                          config.id === item.id
                            ? { ...config, enabled: event.target.checked }
                            : config
                        )
                      );
                    }}
                  />
                  <span className="block h-full w-full rounded-full bg-slate-200 transition-colors peer-checked:bg-ls-navy" />
                  <span className="pointer-events-none absolute left-0.5 top-0.5 block size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </label>
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="border-t border-ls-border px-6 py-3 text-center text-xs text-ls-muted">
        LOG-SHIELD • Pengaturan Sistem • Versi 1.2.0
      </p>
    </>
  );
}
