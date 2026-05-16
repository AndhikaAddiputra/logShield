import { useState } from 'react';
import { ChevronDown, Minus, Plus, ArrowRight, Lock, AlertCircle, Check } from 'lucide-react';
import { createRequest } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function RequestPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const user = useAuthStore((s) => s.user);
  const [category, setCategory] = useState('Medical Supplies');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [unit, setUnit] = useState('kit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createRequest({
        posko_id: user?.posko_id || `posko::${user?._id || 'unknown'}`,
        items: [{ commodity: category, quantity, unit, note: notes || undefined }],
        priority: 'normal',
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-5 flex flex-col items-center justify-center h-full">
        <div className="bg-green-100 p-4 rounded-full mb-4">
          <Check className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-black text-blue-900 mb-2">TERKIRIM</h2>
        <p className="text-gray-600 text-sm text-center mb-8">
          Permintaan logistik Anda telah dikirim ke pusat.
        </p>
        <button
          onClick={() => onNavigate('logistik')}
          className="w-full bg-blue-700 text-white font-bold py-4 rounded-lg shadow-md hover:bg-blue-800 transition active:scale-95"
        >
          KEMBALI
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col h-full w-full">
      <h2 className="text-3xl font-black text-blue-900 tracking-tight mb-2">DATA ENTRY</h2>
      <p className="text-gray-600 text-sm mb-6">Ajukan permintaan tambahan logistik ke kantor pusat.</p>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-xs font-medium text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="mb-6">
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2">SUB-KATEGORI SUMBER DAYA</label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-900 font-bold p-4 rounded-lg appearance-none outline-none focus:border-blue-500"
            >
              <option value="Medical Supplies">Medical Supplies</option>
              <option value="Water & Sanitation">Water & Sanitation</option>
              <option value="Food Rations">Food Rations</option>
              <option value="Pakaian">Pakaian</option>
              <option value="Selimut">Selimut</option>
              <option value="Obat-obatan">Obat-obatan</option>
            </select>
            <ChevronDown className="absolute right-4 top-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2">SATUAN</label>
          <div className="relative">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-900 font-bold p-4 rounded-lg appearance-none outline-none focus:border-blue-500"
            >
              <option value="kit">Kit</option>
              <option value="karton">Karton</option>
              <option value="kg">Kg</option>
              <option value="liter">Liter</option>
              <option value="pcs">Pcs</option>
              <option value="unit">Unit</option>
            </select>
            <ChevronDown className="absolute right-4 top-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

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
              min={1}
            />
            <button type="button" onClick={() => setQuantity(quantity + 1)} className="bg-gray-200 text-gray-600 p-4 rounded-r-lg hover:bg-gray-300 transition">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2">CATATAN</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-white border border-gray-200 p-3 rounded-lg outline-none focus:border-blue-500 resize-none"
            placeholder="Tambahkan detail spesifik..."
          />
        </div>

        <div className="mt-auto">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md hover:bg-blue-800 transition active:scale-95 disabled:opacity-60"
          >
            {loading ? 'MENGIRIM...' : (
              <>
                LANJUT <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          <div className="flex justify-center items-center gap-1 mt-3 text-[10px] text-gray-400 font-bold tracking-widest">
            <Lock className="w-3 h-3" /> END-TO-END ENCRYPTED TUNNEL
          </div>
        </div>
      </form>
    </div>
  );
}
