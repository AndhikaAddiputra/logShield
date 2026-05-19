import { User, Hash, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function ProfilePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleLogout = () => {
    clearAuth();
    onNavigate('login');
  };

  return (
    <div className="p-5 flex flex-col h-full">
      <h2 className="text-3xl font-black text-blue-900 tracking-tight mb-8">PROFIL</h2>

      <div className="flex items-center gap-4 mb-10">
        <div className="bg-blue-800 rounded-full p-4 text-white">
          <User className="w-12 h-12" />
        </div>
        <div>
          <h3 className="text-lg font-black text-blue-900 uppercase">{user?.name || 'Petugas'}</h3>
          <p className="text-blue-700 font-medium">
            {user?.role === 'admin' ? 'Administrator' :
             user?.role === 'koordinator' ? 'Koordinator' :
             user?.role === 'lapangan' ? 'Petugas Lapangan' : 'Pengguna'}
          </p>
          <p className="text-blue-700 font-medium text-sm">{user?.email || ''}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2 uppercase">ID Pengguna</label>
          <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm flex items-center gap-3">
            <Shield className="w-5 h-5 text-gray-400 shrink-0" />
            <span className="font-mono text-sm text-gray-800 break-all">{user?._id || '-'}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2 uppercase">Situs Bencana Aktif</label>
          <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm flex items-center gap-4">
            <Hash className="w-5 h-5 text-gray-400" />
            <span className="font-black text-gray-800 text-lg tracking-wider">{user?.kib_bencana_id || '-'}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2 uppercase">Posko</label>
          <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm">
            <span className="font-bold text-gray-800 text-lg">{user?.posko_id || '-'}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2 uppercase">Kontak</label>
          <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm">
            <span className="font-bold text-gray-800">{user?.phone || '-'}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-10">
        <button
          onClick={handleLogout}
          className="w-full bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md hover:bg-blue-800 transition active:scale-95"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
