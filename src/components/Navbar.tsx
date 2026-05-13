import { useState, useEffect } from 'react';
import { Zap, Menu, X, User, LogOut, LayoutDashboard, Shield, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Page = 'home' | 'map' | 'booking' | 'dashboard' | 'admin' | 'manager';

type Props = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onAuthClick: () => void;
};

export default function Navbar({ currentPage, onNavigate, onAuthClick }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, profile, loading: authLoading, signOut } = useAuth();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks: { label: string; page: Page }[] = [
    { label: 'Home', page: 'home' },
    { label: 'Find Stations', page: 'map' },
    { label: 'Book a Slot', page: 'booking' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled || currentPage !== 'home' ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => onNavigate('home')} className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-emerald-200 transition-shadow">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className={`font-bold text-xl transition-colors ${scrolled || currentPage !== 'home' ? 'text-gray-900' : 'text-white'}`}>
              Charge<span className="text-emerald-500">EV</span>
            </span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ label, page }) => (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === page
                    ? 'bg-emerald-50 text-emerald-700'
                    : scrolled || currentPage !== 'home'
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Auth / User */}
          <div className="hidden md:flex items-center gap-3">
            {authLoading ? (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
              </div>
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {(profile?.full_name || user.email || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${scrolled || currentPage !== 'home' ? 'text-gray-700' : 'text-white'}`}>
                    {profile?.full_name || 'Account'}
                  </span>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <button onClick={() => { onNavigate('dashboard'); setDropdownOpen(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                      <LayoutDashboard className="w-4 h-4 text-emerald-500" /> My Dashboard
                    </button>
                    {(profile?.role === 'manager' || profile?.role === 'admin') && (
                      <button onClick={() => { onNavigate('manager'); setDropdownOpen(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                        <Building2 className="w-4 h-4 text-emerald-500" /> Manager Dashboard
                      </button>
                    )}
                    {profile?.role === 'admin' && (
                      <button onClick={() => { onNavigate('admin'); setDropdownOpen(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                        <Shield className="w-4 h-4 text-emerald-500" /> Admin Panel
                      </button>
                    )}
                    <div className="border-t border-gray-100" />
                    <button onClick={() => { signOut(); setDropdownOpen(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={onAuthClick}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${scrolled || currentPage !== 'home' ? 'text-gray-600 hover:text-gray-900' : 'text-white/90 hover:text-white'}`}
                >
                  Sign In
                </button>
                <button
                  onClick={onAuthClick}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md hover:shadow-emerald-200"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className={`md:hidden p-2 rounded-lg ${scrolled || currentPage !== 'home' ? 'text-gray-600' : 'text-white'}`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white rounded-2xl shadow-lg mb-2 overflow-hidden border border-gray-100">
            {navLinks.map(({ label, page }) => (
              <button
                key={page}
                onClick={() => { onNavigate(page); setMenuOpen(false); }}
                className={`flex w-full px-5 py-3 text-sm font-medium ${currentPage === page ? 'text-emerald-600 bg-emerald-50' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {label}
              </button>
            ))}
            {user ? (
              <>
                <button onClick={() => { onNavigate('dashboard'); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-5 py-3 text-sm text-gray-700 hover:bg-gray-50">
                  <User className="w-4 h-4" /> Dashboard
                </button>
                {(profile?.role === 'manager' || profile?.role === 'admin') && (
                  <button onClick={() => { onNavigate('manager'); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-5 py-3 text-sm text-gray-700 hover:bg-gray-50">
                    <Building2 className="w-4 h-4" /> Manager Dashboard
                  </button>
                )}
                {profile?.role === 'admin' && (
                  <button onClick={() => { onNavigate('admin'); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-5 py-3 text-sm text-gray-700 hover:bg-gray-50">
                    <Shield className="w-4 h-4" /> Admin Panel
                  </button>
                )}
                <button onClick={() => { signOut(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-5 py-3 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <button onClick={() => { onAuthClick(); setMenuOpen(false); }} className="w-full mx-4 mt-3 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-medium">
                Sign In / Sign Up
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
