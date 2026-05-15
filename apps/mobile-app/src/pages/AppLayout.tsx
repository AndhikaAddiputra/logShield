import { useState } from 'react';
import { Menu, CloudOff, LayoutDashboard, Package, User } from 'lucide-react';
import DashboardPage from './DashboardPage';
import LogisticsPage from './LogisticsPage';
import ProfilePage from './ProfilePage';

export default function AppLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 font-sans">
      {/* Header Utama */}
      <header className="flex justify-between items-center px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-3">
          <Menu className="w-6 h-6 text-blue-900" />
          <h1 className="text-xl font-bold text-blue-900 tracking-wider">LOG-SHIELD</h1>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-md text-xs font-semibold text-gray-600">
          <CloudOff className="w-4 h-4" />
          <span>OFFLINE</span>
        </div>
      </header>

      {/* Area Konten Dinamis */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'logistik' && <LogisticsPage />}
        {activeTab === 'profil' && <ProfilePage />}
      </main>

      {/* Navigasi Bawah */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t flex justify-around p-2">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center p-2 rounded-lg w-20 ${activeTab === 'dashboard' ? 'bg-blue-900 text-white' : 'text-blue-900'}`}
        >
          <LayoutDashboard className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">DASHBOARD</span>
        </button>
        <button 
          onClick={() => setActiveTab('logistik')}
          className={`flex flex-col items-center p-2 rounded-lg w-20 ${activeTab === 'logistik' ? 'bg-blue-900 text-white' : 'text-blue-900'}`}
        >
          <Package className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">LOGISTIK</span>
        </button>
        <button 
          onClick={() => setActiveTab('profil')}
          className={`flex flex-col items-center p-2 rounded-lg w-20 ${activeTab === 'profil' ? 'bg-blue-900 text-white' : 'text-blue-900'}`}
        >
          <User className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">PROFIL</span>
        </button>
      </nav>
    </div>
  );
}