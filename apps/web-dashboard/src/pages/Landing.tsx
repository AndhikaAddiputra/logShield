import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  StatCard,
} from "@log-shield/ui-core";
import { Activity, MapPinned, ShieldCheck, ArrowRight, Zap, Globe, Lock } from "lucide-react";
import logoMark from "../assets/logo.svg";

const highlights = [
  {
    title: "Monitoring Realtime",
    description: "Pantau status posko, stok, dan distribusi bantuan secara terpadu melalui dashboard command center.",
    icon: Activity,
  },
  {
    title: "Distribusi Cerdas",
    description: "Skor risiko otomatis membantu tim memprioritaskan wilayah kritis dengan akurasi tinggi.",
    icon: Zap,
  },
  {
    title: "Keamanan Terjamin",
    description: "Enkripsi end-to-end memastikan seluruh data logistik dan personel tetap aman dan privat.",
    icon: Lock,
  },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ls-surface">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-ls-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-ls-sm border border-ls-border bg-white shadow-ls-sm">
              <img src={logoMark} alt="LogShield" className="size-6 object-contain" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-ls-navy">LogShield</p>
              <p className="hidden text-[10px] font-medium uppercase tracking-[0.1em] text-ls-muted sm:block">
                Command Center
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Masuk
            </Button>
            <Button size="sm" onClick={() => navigate("/login")} className="px-5">
              Mulai Sekarang
            </Button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden px-6 pt-16 pb-24 lg:pt-32 lg:pb-40">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,#dbeafe_0%,#f8fafc_100%)] opacity-40" />
          
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-8 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-ls-accent/20 bg-ls-accent-soft px-3 py-1 text-xs font-semibold text-ls-accent">
                <Globe className="size-3" />
                Sistem Terpadu Tanggap Bencana
              </span>
            </div>
            
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-ls-navy sm:text-6xl lg:leading-[1.1]">
              Platform Koordinasi Logistik <br className="hidden sm:block" />
              <span className="text-ls-accent">Aman & Terpercaya.</span>
            </h1>
            
            <p className="mx-auto mb-10 max-w-2xl text-lg text-ls-muted leading-relaxed">
              LogShield menghubungkan data posko, inventaris, serta personel secara 
              real-time untuk pengambilan keputusan yang lebih cepat, akurat, dan transparan.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" onClick={() => navigate("/login")} className="w-full sm:w-auto">
                Buka Dashboard
                <ArrowRight className="ml-2 size-4" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate("/login")} className="w-full sm:w-auto">
                Pelajari Fitur
              </Button>
            </div>
          </div>

          {/* Stats Preview */}
          <div className="mx-auto mt-20 max-w-6xl grid gap-4 sm:grid-cols-3">
            <StatCard label="Posko Aktif" value="52" icon={MapPinned} className="bg-white/60 backdrop-blur-sm" />
            <StatCard label="Relawan Terdaftar" value="1.240" icon={Activity} tone="success" className="bg-white/60 backdrop-blur-sm" />
            <StatCard label="Uptime Sistem" value="99.9%" icon={ShieldCheck} tone="default" className="bg-white/60 backdrop-blur-sm" />
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-ls-sidebar/50 py-24 px-6 border-y border-ls-border">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-ls-accent mb-3">
                Keunggulan Platform
              </h2>
              <p className="text-3xl font-bold text-ls-navy">Solusi End-to-End Logistik Bencana</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {highlights.map((item) => (
                <Card key={item.title} className="border-none shadow-ls hover:shadow-ls-md transition-shadow bg-white">
                  <CardContent className="p-8">
                    <div className="mb-6 inline-flex size-12 items-center justify-center rounded-ls bg-ls-accent-soft text-ls-accent">
                      <item.icon className="size-6" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-ls-navy">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-ls-muted">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="px-6 py-24">
          <div className="mx-auto max-w-4xl rounded-3xl bg-ls-navy p-12 text-center text-white shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 size-64 rounded-full bg-ls-accent opacity-20 blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 size-64 rounded-full bg-ls-accent opacity-20 blur-3xl" />
            
            <h2 className="relative mb-6 text-3xl font-bold sm:text-4xl">Siap Meningkatkan Efisiensi Operasi?</h2>
            <p className="relative mx-auto mb-10 max-w-xl text-ls-accent-soft/80">
              Bergabunglah dengan jaringan LogShield untuk sistem koordinasi yang lebih 
              terstruktur dan aman di setiap kondisi darurat.
            </p>
            <div className="relative flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button 
                variant="secondary" 
                size="lg" 
                onClick={() => navigate("/login")}
                className="bg-white text-ls-navy hover:bg-ls-sidebar w-full sm:w-auto"
              >
                Mulai Sekarang
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                onClick={() => navigate("/login")}
                className="text-white hover:bg-white/10 w-full sm:w-auto"
              >
                Hubungi Kami
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-ls-border bg-white px-6 py-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src={logoMark} alt="LogShield" className="size-6 opacity-80" />
          <span className="font-bold text-ls-navy opacity-80">LogShield</span>
        </div>
        <p className="text-xs text-ls-muted">
          &copy; 2026 LogShield Command Center. Seluruh hak cipta dilindungi undang-undang.
        </p>
      </footer>
    </div>
  );
}
