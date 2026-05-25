import { Shield, ArrowRight } from 'lucide-react';

export default function InitPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="flex flex-col h-screen bg-blue-900 p-6 justify-center items-center">
      <div className="flex flex-col items-center mb-12">
        <div className="bg-white p-4 rounded-2xl mb-6 shadow-lg">
          <Shield className="w-14 h-14 text-blue-900" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-widest uppercase text-center">Log-Shield</h1>
        <p className="text-blue-200 text-sm mt-3 text-center max-w-xs">
          Sistem Manajemen Logistik Kemanusiaan
        </p>
      </div>

      <div className="bg-white/10 rounded-2xl p-6 mb-8 text-center max-w-sm">
        <p className="text-white text-sm font-medium leading-relaxed">
          Selamat datang! Anda sudah terdaftar sebagai petugas lapangan.
          Data pengungsi dapat diedit kapan saja melalui halaman dashboard.
        </p>
      </div>

      <button
        onClick={() => onNavigate('dashboard')}
        className="bg-white text-blue-900 font-black py-4 px-10 rounded-xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition"
      >
        MULAI <ArrowRight className="w-5 h-5" />
      </button>

      <p className="text-center text-blue-300 text-xs mt-8 font-medium">
        Log-Shield v1.0 • Logistik Kemanusiaan
      </p>
    </div>
  );
}
