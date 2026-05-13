import { useState, useEffect } from 'react';
import { Search, MapPin, Zap, Clock, Shield, Star, ChevronRight, Battery, Navigation, AlertTriangle } from 'lucide-react';
import { supabase, Station } from '../lib/supabase';

type Page = 'home' | 'map' | 'booking' | 'dashboard' | 'admin';

type Props = {
  onNavigate: (page: Page) => void;
  onEmergency: () => void;
  onAuthClick: () => void;
  onStationSelect: (station: Station) => void;
};

const STATS = [
  { value: '500+', label: 'Charging Stations' },
  { value: '50K+', label: 'Happy EV Drivers' },
  { value: '99.2%', label: 'Uptime Guaranteed' },
  { value: '24/7', label: 'Support Available' },
];

const FEATURES = [
  {
    icon: MapPin,
    title: 'Find Nearby Stations',
    description: 'Discover EV charging stations near you with real-time availability and navigation.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: Clock,
    title: 'Book in Advance',
    description: 'Reserve your charging slot ahead of time and skip the wait entirely.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Battery,
    title: 'Smart AI Route',
    description: 'AI-powered routing based on your battery level to reach the best nearby station.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    description: 'Safe and seamless payments via UPI, cards, and digital wallets.',
    color: 'bg-rose-50 text-rose-600',
  },
];

export default function HomePage({ onNavigate, onEmergency, onStationSelect }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [stationsLoading, setStationsLoading] = useState(true);

  useEffect(() => {
    supabase.from('stations').select('*').order('name').then(({ data }) => {
      if (data) setStations(data);
      setStationsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const q = searchQuery.toLowerCase();
      setFilteredStations(stations.filter(s => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, stations]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    onNavigate('map');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/110844/pexels-photo-110844.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt="EV Charging"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-emerald-900/70" />
        </div>

        {/* Floating animated dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-emerald-400/30 rounded-full animate-pulse"
              style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 20}%`, animationDelay: `${i * 0.5}s` }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-4 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              India's Fastest Growing EV Network
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
              Charge Your EV
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                Anytime, Anywhere
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-10 leading-relaxed max-w-2xl">
              Find, book, and charge at 500+ stations across India. Real-time availability, instant booking, and 24/7 emergency support.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="relative max-w-2xl mb-8">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search city, station or address..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full pl-12 pr-4 py-4 bg-white/95 backdrop-blur rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-base shadow-2xl"
                  />
                  {showSuggestions && filteredStations.length > 0 && (
                    <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                      {filteredStations.slice(0, 5).map(station => (
                        <button
                          key={station.id}
                          type="button"
                          onClick={() => { onStationSelect(station); }}
                          className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                        >
                          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Zap className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{station.name}</p>
                            <p className="text-xs text-gray-500">{station.address}, {station.city}</p>
                          </div>
                          {station.has_fast_charging && (
                            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Fast</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="submit" className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-xl flex items-center gap-2 whitespace-nowrap">
                  <Navigation className="w-5 h-5" />
                  Find Stations
                </button>
              </div>
            </form>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <button onClick={() => onNavigate('map')} className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-lg">
                <MapPin className="w-5 h-5 text-emerald-600" />
                View Live Map
              </button>
              <button onClick={() => onNavigate('booking')} className="flex items-center gap-2 px-6 py-3 bg-emerald-500/20 border border-emerald-400/40 text-white rounded-xl font-semibold hover:bg-emerald-500/30 transition-all backdrop-blur-sm">
                <Clock className="w-5 h-5" />
                Book a Slot
              </button>
              <button onClick={onEmergency} className="flex items-center gap-2 px-6 py-3 bg-red-500/20 border border-red-400/40 text-white rounded-xl font-semibold hover:bg-red-500/30 transition-all backdrop-blur-sm">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Emergency Help
              </button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 animate-bounce">
          <span className="text-xs">Scroll</span>
          <div className="w-px h-8 bg-white/30" />
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-4xl font-black text-emerald-600 mb-1">{value}</div>
                <div className="text-gray-500 text-sm font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Everything you need to charge smarter</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">From finding stations to emergency support - we've got you covered every mile of the way.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, description, color }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nearby Stations Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-black text-gray-900">Popular Stations</h2>
              <p className="text-gray-500 mt-1">Highly-rated charging stations across major cities</p>
            </div>
            <button onClick={() => onNavigate('map')} className="flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stationsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                  <div className="h-40 bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-3/4 bg-gray-200 rounded" />
                    <div className="h-3 w-1/2 bg-gray-200 rounded" />
                    <div className="flex justify-between">
                      <div className="h-4 w-20 bg-gray-200 rounded" />
                      <div className="h-5 w-16 bg-gray-200 rounded-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : stations.slice(0, 6).map(station => (
              <StationCard key={station.id} station={station} onClick={() => onStationSelect(station)} />
            ))}
          </div>
        </div>
      </section>

      {/* Emergency CTA */}
      <section className="py-16 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 border border-red-400/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">Stranded? We're here 24/7</h2>
          <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
            Battery died in the middle of nowhere? Our emergency response team will reach you within 30 minutes anywhere in the city.
          </p>
          <button onClick={onEmergency} className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-lg transition-all shadow-xl hover:shadow-red-900/30 flex items-center gap-3 mx-auto">
            <AlertTriangle className="w-6 h-6" />
            Request Emergency Help Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">ChargeEV</span>
            </div>
            <p className="text-sm text-center">Powering India's Electric Future &mdash; Charge smarter, drive greener.</p>
            <div className="flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-white font-semibold">4.8</span>
              <span>from 12,000+ reviews</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StationCard({ station, onClick }: { station: Station; onClick: () => void }) {
  return (
    <div onClick={onClick} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100 group">
      <div className="relative h-40 overflow-hidden">
        <img src={station.image_url || 'https://images.pexels.com/photos/110844/pexels-photo-110844.jpeg?auto=compress&cs=tinysrgb&w=800'} alt={station.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {station.has_fast_charging && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-amber-400 text-amber-900 px-2 py-1 rounded-full text-xs font-bold">
            <Zap className="w-3 h-3" /> Fast
          </div>
        )}
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${station.available_slots > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {station.available_slots > 0 ? `${station.available_slots} available` : 'Full'}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">{station.name}</h3>
        <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="line-clamp-1">{station.address}, {station.city}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-emerald-600 font-bold text-base">₹{station.price_per_unit}/unit</span>
          <div className="flex flex-wrap gap-1">
            {station.charger_types.slice(0, 2).map(t => (
              <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
