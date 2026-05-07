import { useState, useEffect, useRef } from 'react';
import { Search, Filter, MapPin, Zap, Clock, X, Navigation, Star, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { supabase, Station } from '../lib/supabase';

type Props = {
  onStationSelect: (station: Station) => void;
  initialStation?: Station | null;
};

const CITIES = ['All Cities', 'New Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Noida', 'Hyderabad', 'Kolkata', 'Pune'];
const CHARGER_TYPES = ['All Types', 'CCS2', 'Type 2', 'CHAdeMO', 'GB/T'];

export default function MapPage({ onStationSelect, initialStation }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);

  const [stations, setStations] = useState<Station[]>([]);
  const [filtered, setFiltered] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(initialStation || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedCharger, setSelectedCharger] = useState('All Types');
  const [fastOnly, setFastOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    supabase.from('stations').select('*').then(({ data }) => {
      if (data) { setStations(data); setFiltered(data); }
    });
  }, []);

  useEffect(() => {
    let result = stations;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.address.toLowerCase().includes(q));
    }
    if (selectedCity !== 'All Cities') result = result.filter(s => s.city === selectedCity);
    if (selectedCharger !== 'All Types') result = result.filter(s => s.charger_types.includes(selectedCharger));
    if (fastOnly) result = result.filter(s => s.has_fast_charging);
    setFiltered(result);
  }, [searchQuery, selectedCity, selectedCharger, fastOnly, stations]);

  useEffect(() => {
    if (!mapRef.current || mapLoaded) return;

    async function initMap() {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!mapRef.current) return;

      const map = L.map(mapRef.current, { zoomControl: false }).setView([20.5937, 78.9629], 5);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© CartoDB',
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: 'topright' }).addTo(map);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapInstanceRef as any).current = map;
      setMapLoaded(true);
    }

    initMap();
  }, [mapRef, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    async function updateMarkers() {
      const L = (await import('leaflet')).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapInstanceRef.current as any;

      markersRef.current.forEach((m: unknown) => (m as { remove: () => void }).remove());
      markersRef.current = [];

      filtered.forEach(station => {
        const isSelected = selectedStation?.id === station.id;
        const color = station.available_slots > 0 ? (station.has_fast_charging ? '#f59e0b' : '#10b981') : '#ef4444';

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:${isSelected ? 44 : 36}px;height:${isSelected ? 44 : 36}px;
            background:${color};border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);border:3px solid white;
            box-shadow:0 4px 12px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            transition:all 0.2s;
          ">
            <span style="transform:rotate(45deg);color:white;font-size:14px;">⚡</span>
          </div>`,
          iconSize: [isSelected ? 44 : 36, isSelected ? 44 : 36],
          iconAnchor: [isSelected ? 22 : 18, isSelected ? 44 : 36],
        });

        const marker = L.marker([station.latitude, station.longitude], { icon })
          .addTo(map)
          .on('click', () => setSelectedStation(station));

        markersRef.current.push(marker);
      });

      if (selectedStation) {
        map.setView([selectedStation.latitude, selectedStation.longitude], 14, { animate: true });
      }
    }

    updateMarkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, mapLoaded, selectedStation?.id]);

  return (
    <div className="flex h-screen pt-16 bg-gray-100">
      {/* Sidebar */}
      <div className="w-full md:w-96 flex-shrink-0 bg-white shadow-lg flex flex-col z-10 max-h-screen overflow-hidden">
        {/* Search & Filters */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search stations, cities..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${showFilters ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </button>
            <button onClick={() => setFastOnly(!fastOnly)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${fastOnly ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <Zap className="w-4 h-4" /> Fast Only
            </button>
            <span className="ml-auto text-xs text-gray-400 flex items-center">{filtered.length} found</span>
          </div>

          {showFilters && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={selectedCharger} onChange={e => setSelectedCharger(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {CHARGER_TYPES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Station list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No stations found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            filtered.map(station => (
              <button
                key={station.id}
                onClick={() => setSelectedStation(station)}
                className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedStation?.id === station.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${station.available_slots > 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <Zap className={`w-5 h-5 ${station.available_slots > 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm truncate">{station.name}</span>
                      {station.has_fast_charging && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Fast</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{station.address}, {station.city}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-emerald-600 font-semibold text-xs">₹{station.price_per_unit}/unit</span>
                      <span className={`text-xs font-medium ${station.available_slots > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {station.available_slots}/{station.total_slots} slots
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative hidden md:block">
        <div ref={mapRef} className="absolute inset-0 z-0" />

        {/* Station Info Popup */}
        {selectedStation && (
          <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-white rounded-2xl shadow-2xl p-4 z-10 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-base truncate">{selectedStation.name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{selectedStation.address}</span>
                </p>
              </div>
              <button onClick={() => setSelectedStation(null)} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center ml-2 flex-shrink-0 hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <div className="text-emerald-600 font-bold text-sm">₹{selectedStation.price_per_unit}</div>
                <div className="text-gray-400 text-xs mt-0.5">per unit</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <div className={`font-bold text-sm ${selectedStation.available_slots > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {selectedStation.available_slots}/{selectedStation.total_slots}
                </div>
                <div className="text-gray-400 text-xs mt-0.5">slots</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <div className="text-amber-500 font-bold text-sm flex items-center justify-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400" /> 4.5
                </div>
                <div className="text-gray-400 text-xs mt-0.5">rating</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {selectedStation.charger_types.map(t => (
                <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
              ))}
              {selectedStation.has_fast_charging && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Fast Charging
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.open(`https://maps.google.com?q=${selectedStation.latitude},${selectedStation.longitude}`, '_blank')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Navigation className="w-4 h-4" /> Navigate
              </button>
              <button
                onClick={() => onStationSelect(selectedStation)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                Book Slot <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-white rounded-xl shadow-md p-3 z-10 text-xs space-y-1.5">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-gray-600">Available</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400" /><span className="text-gray-600">Fast Charging</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-gray-600">Full</span></div>
        </div>
      </div>

      {/* Mobile: Show selected station at bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20">
        {selectedStation && (
          <div className="bg-white rounded-t-2xl shadow-2xl p-4 border-t border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900">{selectedStation.name}</h3>
                <p className="text-sm text-gray-500">{selectedStation.city}</p>
              </div>
              <button onClick={() => setSelectedStation(null)} className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onStationSelect(selectedStation)} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold">
                Book Slot
              </button>
              <button onClick={() => window.open(`https://maps.google.com?q=${selectedStation.latitude},${selectedStation.longitude}`, '_blank')} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">
                <Navigation className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter icon for mobile */}
      <button className="md:hidden fixed bottom-24 right-4 w-12 h-12 bg-white shadow-lg rounded-2xl flex items-center justify-center z-20 border border-gray-100">
        <Filter className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
}
