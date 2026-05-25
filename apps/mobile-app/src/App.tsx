import { useEffect, useState } from 'react';
import AppLayout from './pages/AppLayout';
import LoginPage from './pages/LoginPage';
import PoskoInitPage from './pages/InitPage';
import { createLocalDb, startCouchReplication } from './lib/pouch';
import { startOutboxReplay } from './lib/offlineOutbox';
import { useSyncStore } from './store/syncStore';
import { SplashScreen } from './components/SplashScreen';

export default function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('logshield_token') && localStorage.getItem('logshield_user')
      ? 'dashboard'
      : 'login';
  });
  const remoteUrl = import.meta.env.VITE_COUCHDB_URL;
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Database initialization
    const local = createLocalDb();
    let handle: any;
    const outboxHandle = startOutboxReplay();

    if (!remoteUrl) {
      useSyncStore.getState().setFromReplication({
        status: "paused",
        detail:
          "Variabel VITE_COUCHDB_URL belum diatur - hanya mode lokal tanpa replikasi.",
      });
    } else {
      handle = startCouchReplication(local, remoteUrl);
    }

    // Splash screen timer
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => {
      if (handle) handle.cancel();
      outboxHandle.cancel();
      clearTimeout(splashTimer);
    };
  }, [remoteUrl]);

  const renderScreen = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage onNavigate={setCurrentPage} />;
      case 'inisialisasi-posko':
        return <PoskoInitPage onNavigate={setCurrentPage} />;
      case 'req':
      case 'dashboard':
      case 'logistik':
      case 'profil':
      default:
        return <AppLayout currentPage={currentPage} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="w-full h-full">
      {showSplash && <SplashScreen />}
      <div className={showSplash ? "hidden" : "block animate-fade-in"}>
        {renderScreen()}
      </div>
    </div>
  );
}
