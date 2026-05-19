import { useEffect, useState } from "react";
import { Avatar, Button, Input, PageHeader } from "@log-shield/ui-core";
import { Camera, Check, X, AlertCircle } from "lucide-react";
import {
  type SettingsProfile,
  type SettingsNotifications,
  fetchSettings,
  updateProfile,
  changePassword,
  updateNotificationSettings,
} from "../lib/api";

export function SettingsPage() {
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [notifications, setNotifications] = useState<SettingsNotifications | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSettings();
      setProfile(res.profile);
      setNotifications(res.notifications);
      setEditName(res.profile.name);
      setEditEmail(res.profile.email);
      setEditPhone(res.profile.phone);
    } catch (err: any) {
      setError(err.message || "Gagal memuat pengaturan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await updateProfile({ name: editName, email: editEmail, phone: editPhone });
      setProfile(res.profile);
      setProfileMsg("Profil berhasil diperbarui");
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      setProfileMsg(err.message || "Gagal memperbarui profil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordError("Password baru minimal 8 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak cocok");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      setPasswordMsg(res.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Gagal mengubah password");
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleNotification = async (key: "email" | "app" | "sms", value: boolean) => {
    if (!notifications) return;
    const prev = { ...notifications };
    setNotifications({ ...notifications, [key]: value });
    try {
      const res = await updateNotificationSettings({ [key]: value });
      setNotifications(res.notifications);
    } catch {
      setNotifications(prev);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-ls-muted">
        <PageHeader title="Pengaturan Sistem" />
        <p className="mt-20">Memuat pengaturan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Pengaturan Sistem" />
        <div className="flex flex-col items-center gap-4 py-20">
          <p className="text-ls-danger">{error}</p>
          <Button onClick={loadData} variant="outline" size="sm">Coba Lagi</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Pengaturan Sistem" />

      <div className="space-y-6 p-6">
        <section className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
          <div className="mb-4 border-b border-ls-border pb-3">
            <h2 className="text-base font-semibold text-ls-navy">Profil Akun</h2>
            <p className="text-xs text-ls-muted">Kelola informasi akun Anda</p>
          </div>

          {profileMsg && (
            <div className={`mb-4 flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
              profileMsg.includes("gagal") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
            }`}>
              {profileMsg.includes("gagal") ? <X className="size-4" /> : <Check className="size-4" />}
              {profileMsg}
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name} className="size-14 rounded-full object-cover" />
                ) : (
                  <Avatar alt={profile?.name || ""} fallback={profile?.initials || "U"} size="xl" className="bg-ls-navy" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-ls-navy">{profile?.name}</p>
                <p className="text-xs text-ls-muted">{profile?.role} — {profile?.status_label}</p>
                {profile?.kib_bencana_id && (
                  <p className="text-xs text-ls-muted">KIB: {profile.kib_bencana_id}</p>
                )}
              </div>
            </div>
            <Button type="button" variant="primary" size="md" className="min-w-[200px]" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">Nama Lengkap</p>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">Email</p>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">No. Handphone</p>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">Role</p>
                <Input value={profile?.role || ""} readOnly />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">Status</p>
                <Input value={profile?.status_label || ""} readOnly />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">Terdaftar Sejak</p>
                <Input value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID") : ""} readOnly />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
          <div className="mb-4 border-b border-ls-border pb-3">
            <h2 className="text-base font-semibold text-ls-navy">Ubah Password</h2>
            <p className="text-xs text-ls-muted">Minimal 8 karakter</p>
          </div>

          {passwordMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-xs font-medium text-green-700">
              <Check className="size-4" /> {passwordMsg}
            </div>
          )}
          {passwordError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">
              <AlertCircle className="size-4" /> {passwordError}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">Password Saat Ini</p>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">Password Baru</p>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 karakter" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-ls-muted">Konfirmasi Password</p>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="button" variant="primary" size="sm" onClick={handleChangePassword} disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}>
              {savingPassword ? "Menyimpan..." : "Update Password"}
            </Button>
          </div>
        </section>

        <section className="rounded-ls-lg border border-ls-border bg-white p-5 shadow-ls">
          <div className="mb-4 border-b border-ls-border pb-3">
            <h2 className="text-base font-semibold text-ls-navy">Notifikasi</h2>
            <p className="text-xs text-ls-muted">Atur preferensi notifikasi Anda</p>
          </div>

          <div className="divide-y divide-ls-border">
            {[
              { key: "email" as const, title: "Notifikasi Email", desc: "Terima update via email" },
              { key: "app" as const, title: "Notifikasi Aplikasi", desc: "Notifikasi push dalam aplikasi" },
              { key: "sms" as const, title: "Notifikasi SMS", desc: "Terima peringatan darurat via SMS" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ls-navy">{item.title}</p>
                  <p className="text-xs text-ls-muted">{item.desc}</p>
                </div>
                <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={notifications?.[item.key] ?? false}
                    onChange={(e) => toggleNotification(item.key, e.target.checked)}
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
