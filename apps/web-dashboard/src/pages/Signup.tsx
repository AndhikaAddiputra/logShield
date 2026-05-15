import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Button, 
  Card, 
  CardContent, 
  Field, 
  Input 
} from "@log-shield/ui-core";
import { ChevronLeft, ShieldCheck, Lock, Mail, User, Phone, CreditCard } from "lucide-react";
import { signup } from "../lib/api";
import logoMark from "../assets/logo.svg";

export function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    nik: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!formData.email.includes("@")) {
      setError("Masukkan alamat email yang valid.");
      return;
    }
    if (formData.nik.length < 16 || !/^\d{16}$/.test(formData.nik)) {
      setError("NIK harus berisi 16 digit angka.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        email: formData.email,
        name: formData.fullName,
        nik: formData.nik,
        password: formData.password,
        phone: formData.phone,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat pendaftaran. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative min-h-screen bg-ls-surface flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="w-full max-w-[480px] space-y-6 text-center">
          <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-full bg-ls-success/10">
                  <ShieldCheck className="size-8 text-ls-success" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-ls-navy">Pendaftaran Berhasil</h1>
                <p className="text-sm text-ls-muted max-w-[320px]">
                  Pengajuan akun Anda telah diterima dan sedang menunggu persetujuan admin.
                  Anda akan menerima email setelah akun disetujui.
                </p>
              </div>
              <Button
                className="w-full h-11 font-bold text-base"
                onClick={() => navigate("/login")}
              >
                Kembali ke Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-ls-surface flex flex-col items-center justify-center p-6 py-12 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] size-96 rounded-full bg-ls-accent/5 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] size-96 rounded-full bg-ls-navy/5 blur-3xl" />
      </div>

      <div className="w-full max-w-[480px] space-y-6">
        <div className="flex justify-start">
          <button
            type="button"
            className="group inline-flex items-center gap-2 text-sm font-medium text-ls-muted hover:text-ls-navy transition-colors"
            onClick={() => navigate("/")}
          >
            <ChevronLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
            Kembali ke Beranda
          </button>
        </div>

        <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardContent className="p-8 space-y-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-ls-border bg-white shadow-ls-md">
                <img src={logoMark} alt="LogShield" className="size-8 object-contain" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-ls-navy">Daftar Akun Baru</h1>
                <p className="text-sm text-ls-muted max-w-[320px] mx-auto">
                  Lengkapi data diri Anda untuk bergabung dalam jaringan koordinasi LogShield.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-ls border border-ls-danger/20 bg-ls-danger-soft p-4 text-sm text-ls-danger animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="font-medium">{error}</p>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama Lengkap" htmlFor="fullName">
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ls-muted group-focus-within:text-ls-accent transition-colors">
                      <User className="size-4" />
                    </div>
                    <Input
                      id="fullName"
                      placeholder="Nama Lengkap"
                      className="pl-10 h-11 border-ls-border focus:border-ls-accent focus:ring-ls-accent/10 transition-all"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </Field>

                <Field label="NIK" htmlFor="nik">
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ls-muted group-focus-within:text-ls-accent transition-colors">
                      <CreditCard className="size-4" />
                    </div>
                    <Input
                      id="nik"
                      placeholder="16 Digit NIK"
                      className="pl-10 h-11 border-ls-border focus:border-ls-accent focus:ring-ls-accent/10 transition-all"
                      value={formData.nik}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </Field>
              </div>

              <Field label="Alamat Email" htmlFor="email">
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ls-muted group-focus-within:text-ls-accent transition-colors">
                    <Mail className="size-4" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@instansi.go.id"
                    className="pl-10 h-11 border-ls-border focus:border-ls-accent focus:ring-ls-accent/10 transition-all"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </Field>

              <Field label="Nomor Telepon" htmlFor="phone">
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ls-muted group-focus-within:text-ls-accent transition-colors">
                    <Phone className="size-4" />
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="081234567890"
                    className="pl-10 h-11 border-ls-border focus:border-ls-accent focus:ring-ls-accent/10 transition-all"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kata Sandi" htmlFor="password">
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ls-muted group-focus-within:text-ls-accent transition-colors">
                      <Lock className="size-4" />
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 h-11 border-ls-border focus:border-ls-accent focus:ring-ls-accent/10 transition-all"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </Field>

                <Field label="Konfirmasi" htmlFor="confirmPassword">
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ls-muted group-focus-within:text-ls-accent transition-colors">
                      <Lock className="size-4" />
                    </div>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 h-11 border-ls-border focus:border-ls-accent focus:ring-ls-accent/10 transition-all"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </Field>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 font-bold text-base shadow-ls-accent/20 shadow-lg active:scale-[0.98] transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Mendaftarkan...
                  </span>
                ) : (
                  "Buat Akun Sekarang"
                )}
              </Button>
            </form>

            <div className="pt-6 border-t border-ls-border/50 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ls-sidebar text-[10px] font-bold uppercase tracking-wider text-ls-muted">
                <ShieldCheck className="size-3 text-ls-success" />
                Protected by LogShield Auth
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-ls-muted">
          Sudah memiliki akun? <br />
          <button 
            className="mt-1 font-semibold text-ls-navy hover:underline"
            onClick={() => navigate("/login")}
          >
            Masuk ke Sistem
          </button>
        </p>
      </div>
    </div>
  );
}
