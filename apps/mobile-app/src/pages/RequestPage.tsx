import React, { useState } from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../lib/api';

export default function RequestPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [commodity, setCommodity] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('kg');
  const [priority, setPriority] = useState('normal');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const poskoId = localStorage.getItem('active_posko_id') || 'posko::default-uuid';

    try {
      const payload = {
        posko_id: poskoId,
        status: "menunggu",
        priority: priority,
        items: [{ commodity, quantity, unit, note }]
      };

      const response = await fetch(`${API_BASE_URL}/api/requests`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Gagal mengirim permintaan");
      
      alert("Permintaan berhasil dikirim!");
      onNavigate('logistik');
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 p-5">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => onNavigate('logistik')} className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft className="w-6 h-6 text-blue-900" />
        </button>
        <h2 className="text-2xl font-black text-blue-900">FORM REQUEST</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <label className="block text-xs font-bold text-gray-500 mb-2">KOMODITAS</label>
          <input 
            required type="text" value={commodity} onChange={(e) => setCommodity(e.target.value)}
            className="w-full border-b-2 border-gray-200 py-2 outline-none focus:border-blue-500 font-bold" 
            placeholder="Misal: Beras, Selimut, Obat"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-xs font-bold text-gray-500 mb-2">KUANTITAS</label>
            <input 
              required type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-full border-b-2 border-gray-200 py-2 outline-none focus:border-blue-500 font-bold text-lg" 
            />
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-xs font-bold text-gray-500 mb-2">SATUAN</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full border-b-2 border-gray-200 py-2 outline-none focus:border-blue-500 font-bold">
              <option value="kg">KG</option>
              <option value="liter">Liter</option>
              <option value="pcs">Pcs</option>
              <option value="karton">Karton</option>
              <option value="kit">Kit</option>
            </select>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <label className="block text-xs font-bold text-gray-500 mb-2">PRIORITAS</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full border-b-2 border-gray-200 py-2 outline-none focus:border-blue-500 font-bold">
            <option value="normal">Normal</option>
            <option value="high">Tinggi</option>
            <option value="critical">Kritis (Mendesak)</option>
          </select>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <label className="block text-xs font-bold text-gray-500 mb-2">CATATAN (OPSIONAL)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full border-2 border-gray-200 p-2 rounded-lg outline-none focus:border-blue-500"></textarea>
        </div>

        <button type="submit" disabled={isLoading} className="mt-auto w-full bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> AJUKAN REQUEST</>}
        </button>
      </form>
    </div>
  );
}