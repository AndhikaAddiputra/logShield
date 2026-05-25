import { Menu, Cloud, CloudOff, LayoutDashboard, Package, RefreshCw, User } from 'lucide-react';
import DashboardPage from './DashboardPage';
import LogisticsPage from './LogisticsPage';
import ProfilePage from './ProfilePage';
import RequestPage from './RequestPage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { retryFailedOutbox } from '../lib/offlineOutbox';
import { useSyncStore } from '../store/syncStore';

interface AppLayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function AppLayout({ currentPage, onNavigate }: AppLayoutProps) {
  const online = useOnlineStatus();
  const { pendingOutbox, failedOutbox } = useSyncStore();
  const syncLabel = failedOutbox > 0
    ? `${failedOutbox} GAGAL`
    : pendingOutbox > 0
      ? `${pendingOutbox} MENUNGGU`
      : online
        ? 'ONLINE'
        : 'OFFLINE';

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 font-sans">
      {/* Header Utama */}
      <header className="flex justify-between items-center px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-3">
          <Menu className="w-6 h-6 text-blue-900" />
          <h1 className="text-xl font-bold text-blue-900 tracking-wider">LOG-SHIELD</h1>
        </div>
        <button
          type="button"
          onClick={() => { if (failedOutbox > 0) void retryFailedOutbox(); }}
          className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-semibold ${
            failedOutbox > 0 ? 'bg-red-100 text-red-700' : pendingOutbox > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {failedOutbox > 0 ? <RefreshCw className="w-4 h-4" /> : online ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
          <span>{syncLabel}</span>
        </button>
      </header>

      {/* Area Konten Dinamis */}
      <main className="flex-1 overflow-y-auto pb-20">
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'logistik' && <LogisticsPage onNavigate={onNavigate} />}
        {currentPage === 'profil' && <ProfilePage onNavigate={onNavigate} />}
        {currentPage === 'req' && <RequestPage onNavigate={onNavigate} />}
      </main>

      {/* Navigasi Bawah */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t flex justify-around p-2">
        <button 
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center p-2 rounded-lg w-20 ${currentPage === 'dashboard' ? 'bg-blue-900 text-white' : 'text-blue-900'}`}
        >
          <LayoutDashboard className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">DASHBOARD</span>
        </button>
        <button 
          onClick={() => onNavigate('logistik')}
          className={`flex flex-col items-center p-2 rounded-lg w-20 ${currentPage === 'logistik' ? 'bg-blue-900 text-white' : 'text-blue-900'}`}
        >
          <Package className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">LOGISTIK</span>
        </button>
        <button 
          onClick={() => onNavigate('profil')}
          className={`flex flex-col items-center p-2 rounded-lg w-20 ${currentPage === 'profil' ? 'bg-blue-900 text-white' : 'text-blue-900'}`}
        >
          <User className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">PROFIL</span>
        </button>
      </nav>
    </div>
  );
}
