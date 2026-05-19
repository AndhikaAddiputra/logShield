import React, { useState } from 'react';
import { User, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { login } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import logoWhite from "../../assets/logo-white.svg";

export default function LoginPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(identifier, password);
      setAuth(res);
      onNavigate(res.user.posko_id || res.user.role === 'admin' ? 'dashboard' : 'inisialisasi-posko');
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa NIK/email dan kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-blue-900 p-6 justify-center">
      <div className="flex flex-col items-center mb-12">
        <div className="p-4 rounded-2xl mb-4 shadow-lg">
          <img src={logoWhite} alt="LogShield" className="size-14 object-contain" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-widest uppercase">Log-Shield</h1>
        <p className="text-blue-200 text-sm mt-2 text-center">Sistem Manajemen Logistik Kemanusiaan</p>
      </div>

      <form onSubmit={handleLogin} className="bg-white p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Otorisasi Petugas</h2>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-xs font-medium text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 tracking-wider mb-2">NIK ATAU EMAIL</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-medium"
                placeholder="Masukkan NIK / Email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 tracking-wider mb-2">KATA SANDI</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-medium"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-8 bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md transition active:scale-95 disabled:opacity-60"
        >
          {loading ? (
            <span>MEMPROSES...</span>
          ) : (
            <>
              MASUK <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-blue-300 text-xs mt-8 font-medium">
        Mendukung otentikasi luring (Offline Mode)
      </p>
    </div>
  );
}
