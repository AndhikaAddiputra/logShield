import React, { useState } from 'react';
import { MapPin, Users, Database, ChevronRight } from 'lucide-react';
import { createPosko } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function InitPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const user = useAuthStore((s) => s.user);
  const [demografi, setDemografi] = useState({ pria: 0, wanita: 0, lansia: 0, balita: 0 });
  const [poskoName, setPoskoName] = useState('');
  const [poskoAddress, setPoskoAddress] = useState('');
  const [poskoDistrict, setPoskoDistrict] = useState('');
  const [poskoProvince, setPoskoProvince] = useState('');
  const [contactName, setContactName] = useState(user?.name || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPengungsi = demografi.pria + demografi.wanita + demografi.lansia + demografi.balita;

  const handleInputChange = (field: keyof typeof demografi, value: string) => {
    const numValue = parseInt(value) || 0;
    setDemografi(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poskoName.trim()) {
      setError('Nama posko harus diisi');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createPosko({
        kib_16: new Date().getTime().toString().slice(-16),
        name: poskoName.trim(),
        address: poskoAddress.trim(),
        district: poskoDistrict.trim(),
        province: poskoProvince.trim(),
        total_pengungsi: totalPengungsi,
        count_balita: demografi.balita,
        count_lansia: demografi.lansia,
        count_perempuan: demografi.wanita,
        count_pria: demografi.pria,
        count_disabilitas: 0,
        pj_phone: contactPhone.trim(),
        pj_name: contactName.trim(),
      });
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data posko');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white px-5 py-6 border-b">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
            <MapPin className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-blue-900 tracking-tight">DATA POSKO</h1>
        </div>
        <p className="text-sm text-gray-500 font-medium">Lengkapi data posko dan demografi untuk kalibrasi model prediksi logistik lokal.</p>
      </header>

      <main className="flex-1 overflow-y-auto p-5">
        <form onSubmit={handleSubmit} className="space-y-6 pb-20">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 border-b pb-2">Informasi Posko</h3>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">NAMA POSKO</label>
              <input
                type="text"
                value={poskoName}
                onChange={(e) => setPoskoName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg font-bold outline-none focus:border-blue-500"
                placeholder="Posko Rajeg Timur"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">ALAMAT</label>
              <input
                type="text"
                value={poskoAddress}
                onChange={(e) => setPoskoAddress(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-blue-500"
                placeholder="Jl. Contoh No. 1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">KECAMATAN</label>
                <input
                  type="text"
                  value={poskoDistrict}
                  onChange={(e) => setPoskoDistrict(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-blue-500"
                  placeholder="Tangerang"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">PROVINSI</label>
                <input
                  type="text"
                  value={poskoProvince}
                  onChange={(e) => setPoskoProvince(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-blue-500"
                  placeholder="Banten"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">KONTAK PJ</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-blue-500"
                  placeholder="Nama"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">NO. TELP</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg outline-none focus:border-blue-500"
                  placeholder="081234567890"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-900 rounded-xl p-5 text-white flex items-center justify-between shadow-lg">
            <div>
              <p className="text-blue-200 text-xs font-bold tracking-wider mb-1">TOTAL PENGUNGSI AKTIF</p>
              <p className="text-4xl font-black">{totalPengungsi}</p>
            </div>
            <Users className="w-10 h-10 opacity-50" />
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-5">
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">Rincian Golongan</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">PRIA DEWASA</label>
                <input
                  type="number"
                  min="0"
                  value={demografi.pria || ''}
                  onChange={(e) => handleInputChange('pria', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg font-bold text-lg outline-none focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">WANITA DEWASA</label>
                <input
                  type="number"
                  min="0"
                  value={demografi.wanita || ''}
                  onChange={(e) => handleInputChange('wanita', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg font-bold text-lg outline-none focus:border-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-500 mb-1">LANSIA</label>
                <input
                  type="number"
                  min="0"
                  value={demografi.lansia || ''}
                  onChange={(e) => handleInputChange('lansia', e.target.value)}
                  className="w-full bg-orange-50 border border-orange-200 p-3 rounded-lg font-bold text-lg outline-none focus:border-orange-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-500 mb-1">BALITA & ANAK</label>
                <input
                  type="number"
                  min="0"
                  value={demografi.balita || ''}
                  onChange={(e) => handleInputChange('balita', e.target.value)}
                  className="w-full bg-purple-50 border border-purple-200 p-3 rounded-lg font-bold text-lg outline-none focus:border-purple-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex gap-3">
            <Database className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-800 font-medium leading-relaxed">
              Data ini akan dikirim ke server pusat. Sinkronisasi ke perangkat lain akan berjalan otomatis.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md hover:bg-blue-800 transition active:scale-95 disabled:opacity-60"
          >
            {loading ? 'MENYIMPAN...' : (
              <>
                PROSES & BUKA DASHBOARD <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
