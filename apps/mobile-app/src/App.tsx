import { useEffect, useState } from 'react';
import AppLayout from './pages/AppLayout';
import LoginPage from './pages/LoginPage';
import PoskoInitPage from './pages/InitPage';
import { createLocalDb, startCouchReplication } from './lib/pouch';
import { useAuthStore } from './store/authStore';
import { SplashScreen } from './components/SplashScreen';

export default function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [showSplash, setShowSplash] = useState(true);
  const { token, couchdb } = useAuthStore();

  const isLoggedIn = !!token;

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (isLoggedIn && couchdb?.url) {
      const local = createLocalDb();
      const handle = startCouchReplication(local, couchdb.url);
      return () => handle.cancel();
    }
  }, [isLoggedIn, couchdb?.url]);

  const navigate = (page: string) => {
    if (page === 'login') {
      if (!isLoggedIn) {
        setCurrentPage('login');
      }
    } else {
      setCurrentPage(page);
    }
  };

  const renderScreen = () => {
    if (!isLoggedIn && currentPage !== 'login') {
      return <LoginPage onNavigate={navigate} />;
    }

    switch (currentPage) {
      case 'login':
        return isLoggedIn ? <AppLayout currentPage="dashboard" onNavigate={navigate} /> : <LoginPage onNavigate={navigate} />;
      case 'inisialisasi-posko':
        return <PoskoInitPage onNavigate={navigate} />;
      case 'req':
      case 'dashboard':
      case 'logistik':
      case 'profil':
      default:
        return <AppLayout currentPage={currentPage} onNavigate={navigate} />;
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
