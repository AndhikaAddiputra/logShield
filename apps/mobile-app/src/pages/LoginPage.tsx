import React, { useState } from 'react';
import { Shield, User, Lock, ArrowRight } from 'lucide-react';

// Tambahkan penangkapan props
export default function LoginPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('inisialisasi-posko');
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

      <form onSubmit={handleLogin} className="bg-white p-6 rounded-2xl shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Otorisasi Petugas</h2>
        
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
          className="w-full mt-8 bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md transition active:scale-95"
        >
          MASUK <ArrowRight className="w-5 h-5" />
        </button>
      </form>

      <p className="text-center text-blue-300 text-xs mt-8 font-medium">
        Mendukung otentikasi luring (Offline Mode)
      </p>
    </div>
  );
}