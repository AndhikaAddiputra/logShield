import React, { useState } from 'react';
import { ChevronDown, Minus, Plus, ArrowRight, Lock, Loader2 } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../lib/api';

export default function RequestPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [quantity, setQuantity] = useState(1);
  const [commodity, setCommodity] = useState('Medical Supplies');
  const [unit, setUnit] = useState('kit');
  const [note, setNote] = useState('');
  const [priority] = useState('normal');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let poskoId = '';
    try {
      const stored = localStorage.getItem('logshield_user');
      if (stored) {
        const user = JSON.parse(stored);
        poskoId = user.posko_id || '';
      }
    } catch {}
    if (!poskoId) {
      alert('Error: Data posko tidak ditemukan. Silakan login ulang.');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        posko_id: poskoId,
        status: "menunggu",
        priority: priority,
        items: [
          { 
            commodity: commodity, 
            quantity: quantity, 
            unit: unit, 
            note: note 
          }
        ]
      };

      const response = await fetch(`${API_BASE_URL}/api/requests`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Gagal mengirim permintaan");
      }
      
      alert("Permintaan berhasil dikirim!");
      
      // Mengembalikan pengguna ke halaman daftar logistik setelah sukses
      onNavigate('logistik');
      
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-5 flex flex-col h-full w-full">
      <h2 className="text-3xl font-black text-blue-900 tracking-tight mb-2">DATA ENTRY</h2>
      <p className="text-gray-600 text-sm mb-8">Ajukan permintaan tambahan logistik ke kantor pusat.</p>

      {/* 2. Pastikan form menggunakan onSubmit */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        
        {/* Dropdown Kategori & Satuan */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2">SUB-KATEGORI SUMBER DAYA</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              {/* Binding value & onChange ke state commodity */}
              <select 
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 font-bold p-4 rounded-lg appearance-none outline-none focus:border-blue-500"
              >
                <option value="Medical Supplies">Medical Supplies</option>
                <option value="Beras">Beras</option>
                <option value="Air Bersih">Air Bersih</option>
                <option value="Selimut">Selimut</option>
              </select>
              <ChevronDown className="absolute right-4 top-4 text-gray-500 pointer-events-none" />
            </div>

            {/* Dropdown untuk Unit yang diwajibkan API LogShield */}
            <div className="relative w-1/3">
              <select 
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 font-bold p-4 rounded-lg appearance-none outline-none focus:border-blue-500"
              >
                <option value="kit">Kit</option>
                <option value="kg">KG</option>
                <option value="liter">Liter</option>
                <option value="pcs">Pcs</option>
              </select>
              <ChevronDown className="absolute right-3 top-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Input Kuantitas */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2">KUANTITAS</label>
          <div className="flex items-center">
            <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="bg-gray-200 text-gray-600 p-4 rounded-l-lg hover:bg-gray-300 transition">
              <Minus className="w-5 h-5" />
            </button>
            <input 
              type="number" 
              value={quantity} 
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="flex-1 bg-white border-y border-gray-200 text-center font-black text-xl p-3 outline-none"
            />
            <button type="button" onClick={() => setQuantity(quantity + 1)} className="bg-gray-200 text-gray-600 p-4 rounded-r-lg hover:bg-gray-300 transition">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Input Catatan */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2">CATATAN</label>
          {/* Binding value & onChange ke state note */}
          <textarea 
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-white border border-gray-200 p-3 rounded-lg outline-none focus:border-blue-500 resize-none"
            placeholder="Tambahkan detail spesifik..."
          ></textarea>
          <p className="text-[10px] text-gray-400 font-bold mt-2">150 words max.</p>
        </div>

        <div className="mt-auto">
          {/* 3. Ubah tombol menjadi type="submit" dan tambahkan status loading */}
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md hover:bg-blue-800 transition active:scale-95 disabled:bg-blue-400"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>LANJUT <ArrowRight className="w-5 h-5" /></>}
          </button>
          <div className="flex justify-center items-center gap-1 mt-3 text-[10px] text-gray-400 font-bold tracking-widest">
            <Lock className="w-3 h-3" /> END-TO-END ENCRYPTED TUNNEL
          </div>
        </div>
      </form>
    </div>
  );
}