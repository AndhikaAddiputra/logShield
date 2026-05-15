import { useState } from 'react';
import AppLayout from './pages/AppLayout';
import LoginPage from './pages/LoginPage';
import PoskoInitPage from './pages/InitPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('login');

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
      {renderScreen()}
    </div>
  );
}
