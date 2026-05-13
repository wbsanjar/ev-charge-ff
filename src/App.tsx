import { useState } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import EmergencyModal from './components/EmergencyModal';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import StationDetailPage from './pages/StationDetailPage';
import BookingPage from './pages/BookingPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import { Station } from './lib/supabase';
import { AlertTriangle } from 'lucide-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

type Page = 'home' | 'map' | 'booking' | 'dashboard' | 'admin' | 'manager';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [showAuth, setShowAuth] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stationDetailMode, setStationDetailMode] = useState(false);

  function handleStationSelect(station: Station) {
    setSelectedStation(station);
    setStationDetailMode(true);
    setCurrentPage('map');
  }

  function handleBookStation(station: Station) {
    setSelectedStation(station);
    setStationDetailMode(false);
    setCurrentPage('booking');
  }

  function handleNavigate(page: Page) {
    setStationDetailMode(false);
    setCurrentPage(page);
  }

  return (
    <div className="font-sans antialiased">
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onAuthClick={() => setShowAuth(true)}
      />

      {currentPage !== 'home' && (
        <button
          onClick={() => setShowEmergency(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold shadow-2xl hover:shadow-red-900/30 transition-all"
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">SOS</span>
        </button>
      )}

      {currentPage === 'home' && (
        <HomePage
          onNavigate={handleNavigate}
          onEmergency={() => setShowEmergency(true)}
          onAuthClick={() => setShowAuth(true)}
          onStationSelect={handleStationSelect}
        />
      )}

      {currentPage === 'map' && !stationDetailMode && (
        <MapPage
          onStationSelect={handleStationSelect}
          initialStation={selectedStation}
        />
      )}

      {currentPage === 'map' && stationDetailMode && selectedStation && (
        <StationDetailPage
          station={selectedStation}
          onBack={() => setStationDetailMode(false)}
          onBook={handleBookStation}
          onNavigate={handleNavigate}
          onAuthClick={() => setShowAuth(true)}
        />
      )}

      {currentPage === 'booking' && (
        <BookingPage
          selectedStation={selectedStation}
          onBack={() => handleNavigate('map')}
        />
      )}

      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'admin' && <AdminPage />}
      {currentPage === 'manager' && <ManagerDashboardPage />}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showEmergency && <EmergencyModal onClose={() => setShowEmergency(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ClerkProvider>
  );
}
