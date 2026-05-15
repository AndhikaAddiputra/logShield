import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Button, 
  Card, 
  CardContent, 
  Field, 
  Input 
} from "@log-shield/ui-core";
import { ChevronLeft, ShieldCheck, Lock, Mail, AlertCircle } from "lucide-react";
import { login, storeAuth } from "../lib/api";
import logoMark from "../assets/logo.svg";

interface LoginPageProps {
  onLogin: (redirectTo?: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo =
    (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/dashboard";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.includes("@") && email.length < 16) {
      setError("Masukkan alamat email atau NIK yang valid.");
      return;
    }

    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await login(email, password);
      storeAuth(res.token, res.user);
      onLogin(redirectTo);
    } catch (err: any) {
      setError(err.message || "Kredensial tidak valid. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-ls-surface flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] size-96 rounded-full bg-ls-accent/5 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] size-96 rounded-full bg-ls-navy/5 blur-3xl" />
      </div>

      <div className="w-full max-w-[440px] space-y-6">
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
                <h1 className="text-2xl font-bold tracking-tight text-ls-navy">Selamat Datang</h1>
                <p className="text-sm text-ls-muted max-w-[280px] mx-auto">
                  Masuk untuk mengakses Dashboard Command Center LogShield.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-ls border border-ls-danger/20 bg-ls-danger-soft p-4 text-sm text-ls-danger animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="size-5 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <Field label="Alamat Email/ NIK" htmlFor="email">
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ls-muted group-focus-within:text-ls-accent transition-colors">
                      <Mail className="size-4" />
                    </div>
                    <Input
                      id="email"
                      type="text"
                      placeholder="nama@logshield.id"
                      className="pl-10 h-11 border-ls-border focus:border-ls-accent focus:ring-ls-accent/10 transition-all"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </Field>

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
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      className="text-xs font-semibold text-ls-accent hover:text-ls-navy transition-colors"
                    >
                      Lupa kata sandi?
                    </button>
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
                    Memproses...
                  </span>
                ) : (
                  "Masuk ke Sistem"
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
          Belum memiliki akun? <br />
          <div className="mt-1 flex items-center justify-center gap-4">
            <button 
              className="font-semibold text-ls-navy hover:underline"
              onClick={() => navigate("/signup")}
            >
              Daftar Sekarang
            </button>
            <span className="text-ls-border">•</span>
            <button className="font-semibold text-ls-navy hover:underline">
              Hubungi Administrator
            </button>
          </div>
        </p>
      </div>
    </div>
  );
}
