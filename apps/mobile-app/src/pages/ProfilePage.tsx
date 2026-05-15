import { User, Hash } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="p-5 flex flex-col h-full">
      <h2 className="text-3xl font-black text-blue-900 tracking-tight mb-8">PROFIL</h2>

      {/* Info User */}
      <div className="flex items-center gap-4 mb-10">
        <div className="bg-blue-800 rounded-full p-4 text-white">
          <User className="w-12 h-12" />
        </div>
        <div>
          <h3 className="text-lg font-black text-blue-900 uppercase">Untung Sutedjo</h3>
          <p className="text-blue-700 font-medium">Manajer Logistik</p>
          <p className="text-blue-700 font-medium">Jawa Tengah IV</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Situs Bencana */}
        <div>
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2 uppercase">Situs Bencana Aktif</label>
          <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm flex items-center gap-4">
            <Hash className="w-5 h-5 text-gray-400" />
            <span className="font-black text-gray-800 text-lg tracking-wider">BNC-2025-JB-1234</span>
          </div>
        </div>

        {/* Posko */}
        <div>
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2 uppercase">Posko</label>
          <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm">
            <span className="font-bold text-gray-800 text-lg">Posko Jepara II</span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-10">
        <button className="w-full bg-blue-700 text-white font-bold py-4 rounded-lg shadow-md hover:bg-blue-800 transition tracking-widest uppercase">
          Log Out
        </button>
      </div>
    </div>
  );
}