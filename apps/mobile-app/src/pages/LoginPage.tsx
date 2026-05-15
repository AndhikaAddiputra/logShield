import { useState } from 'react';
import { Shield, User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

export default function LoginPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Login gagal');

      // Simpan JWT ke lokal perangkat
      localStorage.setItem('logshield_token', data.token);
      
      // Jika berhasil, lanjut ke inisialisasi posko
      onNavigate('inisialisasi-posko');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-blue-900 p-6 justify-center">
      <div className="flex flex-col items-center mb-12">
        <div className="bg-white p-4 rounded-2xl mb-4 shadow-lg">
          <Shield className="w-12 h-12 text-blue-900" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-widest uppercase">Log-Shield</h1>
        <p className="text-blue-200 text-sm mt-2 text-center">Sistem Manajemen Logistik Kemanusiaan</p>
      </div>

      <form onSubmit={handleLogin} className="bg-white p-6 rounded-2xl shadow-xl mt-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Otorisasi Petugas</h2>
        
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-bold text-center">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 tracking-wider mb-2">EMAIL / NIK</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-medium"
                placeholder="admin@logshield.com"
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
          disabled={isLoading}
          className="w-full mt-8 bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md disabled:bg-blue-400"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ArrowRight className="w-5 h-5" /> MASUK</>}
        </button>
      </form>

      <p className="text-center text-blue-300 text-xs mt-8 font-medium">
        Mendukung otentikasi luring (Offline Mode)
      </p>
    </div>
  );
}