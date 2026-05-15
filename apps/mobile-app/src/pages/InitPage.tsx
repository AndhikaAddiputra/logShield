import React, { useState } from 'react';
import { MapPin, Users, Database, ChevronRight, Loader2 } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../lib/api';

export default function InitPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [demografi, setDemografi] = useState({ pria: 0, wanita: 0, lansia: 0, balita: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const totalPengungsi = demografi.pria + demografi.wanita + demografi.lansia + demografi.balita;

  const handleInputChange = (field: keyof typeof demografi, value: string) => {
    setDemografi(prev => ({ ...prev, [field]: parseInt(value) || 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Pada sistem offline-first asli, di sinilah Anda menyimpan ke PouchDB
      // Berikut adalah implementasi direct API fallback
      const payload = {
        kib_16: "1234567890123456", // Mock KIB
        name: "Posko Lapangan",
        address: "Lokasi Bencana",
        district: "Tangerang",
        province: "Banten",
        total_pengungsi: totalPengungsi,
        count_balita: demografi.balita,
        count_lansia: demografi.lansia,
        count_perempuan: demografi.wanita,
        count_pria: demografi.pria,
        count_disabilitas: 0,
        pj_phone: "080000000",
        pj_name: "Petugas"
      };

      const response = await fetch(`${API_BASE_URL}/api/poskos`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Gagal menyimpan data posko");
      
      const data = await response.json();
      localStorage.setItem('active_posko_id', data.posko._id); // Simpan ID untuk request logistik
      
      onNavigate('dashboard');
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setIsLoading(false);
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
        <p className="text-sm text-gray-500 font-medium">Lengkapi demografi untuk kalibrasi model prediksi logistik lokal.</p>
      </header>

      <main className="flex-1 overflow-y-auto p-5">
        <form onSubmit={handleSubmit} className="space-y-6 pb-20">
          
          {/* Banner Total Kalkulasi */}
          <div className="bg-blue-900 rounded-xl p-5 text-white flex items-center justify-between shadow-lg">
            <div>
              <p className="text-blue-200 text-xs font-bold tracking-wider mb-1">TOTAL PENGUNGSI AKTIF</p>
              <p className="text-4xl font-black">{totalPengungsi}</p>
            </div>
            <Users className="w-10 h-10 opacity-50" />
          </div>

          {/* Form Demografi */}
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
              Data ini akan diproses oleh model prediktif lokal perangkat. Sinkronisasi ke server pusat akan berjalan otomatis saat koneksi tersedia.
            </p>
          </div>

          {/* Tombol diletakkan di bawah form */}
          <button 
            type="submit"
            disabled={isLoading || totalPengungsi === 0}
            className="w-full bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md disabled:bg-gray-400"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "PROSES & BUKA DASHBOARD"}
          </button>

        </form>
      </main>
    </div>
  );
}