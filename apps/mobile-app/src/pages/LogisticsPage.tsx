import { useState } from 'react';
import { ChevronDown, Minus, Plus, ArrowRight, Lock } from 'lucide-react';

export default function LogisticsPage() {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="p-5 flex flex-col h-full w-full">
      <h2 className="text-3xl font-black text-blue-900 tracking-tight mb-2">DATA ENTRY</h2>
      <p className="text-gray-600 text-sm mb-8">Ajukan permintaan tambahan logistik ke kantor pusat.</p>

      <form className="flex-1 flex flex-col">
        {/* Dropdown Kategori */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2">SUB-KATEGORI SUMBER DAYA</label>
          <div className="relative">
            <select className="w-full bg-white border border-gray-200 text-gray-900 font-bold p-4 rounded-lg appearance-none outline-none focus:border-blue-500">
              <option>Medical Supplies</option>
              <option>Water & Sanitation</option>
              <option>Food Rations</option>
            </select>
            <ChevronDown className="absolute right-4 top-4 text-gray-500 pointer-events-none" />
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
          <textarea 
            rows={4}
            className="w-full bg-white border border-gray-200 p-3 rounded-lg outline-none focus:border-blue-500 resize-none"
            placeholder="Tambahkan detail spesifik..."
          ></textarea>
          <p className="text-[10px] text-gray-400 font-bold mt-2">150 words max.</p>
        </div>

        <div className="mt-auto">
          <button type="button" className="w-full bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md hover:bg-blue-800 transition">
            LANJUT <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex justify-center items-center gap-1 mt-3 text-[10px] text-gray-400 font-bold tracking-widest">
            <Lock className="w-3 h-3" /> END-TO-END ENCRYPTED TUNNEL
          </div>
        </div>
      </form>
    </div>
  );
}