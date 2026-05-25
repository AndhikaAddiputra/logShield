import { useEffect, useState } from 'react';
import { User, Hash, MapPin, Shield, Loader2, AlertCircle, LogOut } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../lib/api';

export default function ProfilePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [user, setUser] = useState<any>(null);
  const [posko, setPosko] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = localStorage.getItem('logshield_user');
        const userData = stored ? JSON.parse(stored) : null;
        if (!userData) throw new Error('Sesi tidak ditemukan. Silakan login ulang.');

        const res = await fetch(`${API_BASE_URL}/api/settings`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Gagal memuat profil');
        const settingsData = await res.json();

        const profile = settingsData.profile || settingsData.user || userData;
        setUser(profile);

        if (profile.posko_id) {
          const poskoRes = await fetch(`${API_BASE_URL}/api/poskos`, {
            headers: getAuthHeaders(),
          });
          if (poskoRes.ok) {
            const poskoData = await poskoRes.json();
            const rows = poskoData.rows || [];
            const found = rows.find((r: any) => {
              const doc = r.doc || r;
              return doc._id === profile.posko_id || doc._id === `posko::${profile.posko_id}`;
            });
            if (found) setPosko(found.doc || found);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data profil');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('logshield_token');
    localStorage.removeItem('logshield_user');
    onNavigate('login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-5 flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-red-600 font-medium text-center">{error || 'Data tidak tersedia'}</p>
        <button onClick={handleLogout} className="bg-blue-700 text-white font-bold py-2 px-6 rounded-lg text-sm">
          Login Ulang
        </button>
      </div>
    );
  }

  const roleLabel: Record<string, string> = {
    admin: 'Administrator',
    manager: 'Manajer Logistik',
    field_officer: 'Petugas Lapangan',
  };

  return (
    <div className="p-5 flex flex-col h-full">
      <h2 className="text-3xl font-black text-blue-900 tracking-tight mb-8">PROFIL</h2>

      <div className="flex items-center gap-4 mb-10">
        <div className="bg-blue-800 rounded-full p-4 text-white">
          <User className="w-12 h-12" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black text-blue-900 uppercase truncate">{user.name || 'Petugas'}</h3>
          <p className="text-blue-700 font-medium">{roleLabel[user.role] || user.role || '-'}</p>
          <p className="text-blue-600 text-sm truncate">{user.email || ''}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2 uppercase">Situs Bencana Aktif</label>
          <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm flex items-center gap-4">
            <Hash className="w-5 h-5 text-gray-400 shrink-0" />
            <span className="font-black text-gray-800 text-lg tracking-wider truncate">
              {user.kib_bencana_id || 'Belum ditentukan'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2 uppercase">Posko</label>
          <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-gray-800 text-lg block truncate">
                {posko?.name || user.posko_name || 'Belum ditugaskan'}
              </span>
              {posko?.address && (
                <span className="text-xs text-gray-500 block truncate">{posko.address}</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-blue-900 tracking-wider mb-2 uppercase">Role</label>
          <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm flex items-center gap-3">
            <Shield className="w-5 h-5 text-gray-400 shrink-0" />
            <span className="font-bold text-gray-800 text-lg">{roleLabel[user.role] || user.role || '-'}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-10">
        <button
          onClick={handleLogout}
          className="w-full bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md hover:bg-blue-800 transition active:scale-95"
        >
          <LogOut className="w-5 h-5" /> Log Out
        </button>
      </div>
    </div>
  );
}