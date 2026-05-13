import { useState, useEffect } from 'react';
import { Plus, Zap, Users, MapPin, Calendar, Shield, Edit2, ToggleLeft, ToggleRight, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase, Station, Booking, EmergencyRequest } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type BookingWithProfile = Booking & { profiles: { full_name: string; phone: string } };
type EmergencyWithProfile = EmergencyRequest;

export default function AdminPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'overview' | 'stations' | 'bookings' | 'emergency'>('overview');
  const [stations, setStations] = useState<Station[]>([]);
  const [bookings, setBookings] = useState<BookingWithProfile[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStation, setShowAddStation] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [s, b, e] = await Promise.all([
      supabase.from('stations').select('*').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*, profiles(full_name, phone)').order('created_at', { ascending: false }).limit(50),
      supabase.from('emergency_requests').select('*').order('created_at', { ascending: false }),
    ]);
    if (s.data) setStations(s.data);
    if (b.data) setBookings(b.data as BookingWithProfile[]);
    if (e.data) setEmergencies(e.data);
    setLoading(false);
  }

  async function toggleStation(id: string, current: boolean) {
    await supabase.from('stations').update({ is_active: !current }).eq('id', id);
    setStations(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s));
  }

  async function updateEmergencyStatus(id: string, status: string) {
    await supabase.from('emergency_requests').update({ status }).eq('id', id);
    setEmergencies(prev => prev.map(e => e.id === id ? { ...e, status: status as EmergencyRequest['status'] } : e));
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-700">Admin Access Only</h2>
          <p className="text-gray-500 mt-2">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  const totalRevenue = bookings.reduce((s, b) => s + (b.status !== 'cancelled' ? b.amount : 0), 0);

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'stations', label: `Stations (${stations.length})` },
    { id: 'bookings', label: `Bookings (${bookings.length})` },
    { id: 'emergency', label: `Emergency (${emergencies.filter(e => e.status === 'pending').length})` },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-white mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Admin Panel</h1>
              <p className="text-gray-400">Manage stations, bookings & operations</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${tab === t.id ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="animate-pulse">
            {tab === 'overview' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="w-11 h-11 bg-gray-200 rounded-xl mb-3" />
                    <div className="h-8 w-20 bg-gray-200 rounded mb-1" />
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            )}
            {tab === 'stations' && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 bg-gray-200 rounded" />
                      <div className="h-3 w-56 bg-gray-200 rounded" />
                      <div className="flex gap-2">
                        <div className="h-5 w-20 bg-gray-200 rounded-full" />
                        <div className="h-5 w-16 bg-gray-200 rounded-full" />
                      </div>
                    </div>
                    <div className="h-8 w-8 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            )}
            {tab === 'bookings' && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                      <div className="h-3 w-48 bg-gray-200 rounded" />
                    </div>
                    <div className="text-right space-y-1">
                      <div className="h-4 w-16 bg-gray-200 rounded" />
                      <div className="h-3 w-14 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab === 'emergency' && (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-36 bg-gray-200 rounded" />
                          <div className="h-3 w-28 bg-gray-200 rounded" />
                        </div>
                      </div>
                      <div className="h-6 w-16 bg-gray-200 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Overview */}
            {tab === 'overview' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Stations', value: stations.length, icon: MapPin, color: 'text-emerald-600 bg-emerald-100' },
                  { label: 'Total Bookings', value: bookings.length, icon: Calendar, color: 'text-blue-600 bg-blue-100' },
                  { label: 'Active Users', value: new Set(bookings.map(b => b.user_id)).size, icon: Users, color: 'text-purple-600 bg-purple-100' },
                  { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(0)}`, icon: Zap, color: 'text-amber-600 bg-amber-100' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} mb-3`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-black text-gray-900">{value}</div>
                    <div className="text-gray-500 text-sm mt-0.5">{label}</div>
                  </div>
                ))}

                {/* Recent Emergencies */}
                {emergencies.filter(e => e.status === 'pending').length > 0 && (
                  <div className="sm:col-span-2 lg:col-span-4 bg-red-50 border border-red-200 rounded-2xl p-5">
                    <h3 className="font-bold text-red-700 flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5" />
                      Pending Emergency Requests ({emergencies.filter(e => e.status === 'pending').length})
                    </h3>
                    <div className="space-y-2">
                      {emergencies.filter(e => e.status === 'pending').slice(0, 3).map(e => (
                        <div key={e.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm">
                          <div>
                            <span className="font-semibold text-gray-900 text-sm">{e.contact_name}</span>
                            <span className="text-gray-500 text-xs ml-2">— {e.request_type}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => updateEmergencyStatus(e.id, 'dispatched')} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                              Dispatch
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stations */}
            {tab === 'stations' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">All Stations</h3>
                  <button onClick={() => setShowAddStation(!showAddStation)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
                    <Plus className="w-4 h-4" /> Add Station
                  </button>
                </div>

                {showAddStation && <AddStationForm onAdd={() => { fetchAll(); setShowAddStation(false); }} onCancel={() => setShowAddStation(false)} />}

                <div className="space-y-3">
                  {stations.map(station => (
                    <div key={station.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Zap className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm">{station.name}</h4>
                        <p className="text-gray-500 text-xs">{station.address}, {station.city}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{station.available_slots}/{station.total_slots} slots</span>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">₹{station.price_per_unit}/unit</span>
                          {station.has_fast_charging && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Fast</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-xs font-medium ${station.is_active ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {station.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button onClick={() => toggleStation(station.id, station.is_active)}>
                          {station.is_active ? <ToggleRight className="w-8 h-8 text-emerald-600" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                        </button>
                        <button className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bookings */}
            {tab === 'bookings' && (
              <div className="space-y-3">
                {bookings.map(b => (
                  <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${b.status === 'confirmed' ? 'bg-emerald-100' : b.status === 'cancelled' ? 'bg-red-100' : 'bg-blue-100'}`}>
                      {b.status === 'confirmed' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{b.profiles?.full_name || 'User'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{b.status}</span>
                      </div>
                      <p className="text-gray-500 text-xs">{b.booking_date} at {b.start_time?.slice(0, 5)} &bull; {b.charger_type}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-emerald-600">₹{b.amount.toFixed(0)}</div>
                      <div className="text-xs text-gray-400 font-mono">#{b.id.slice(-6).toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Emergency */}
            {tab === 'emergency' && (
              <div className="space-y-3">
                {emergencies.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                    <p className="text-gray-500">No emergency requests</p>
                  </div>
                ) : emergencies.map(e => (
                  <div key={e.id} className={`bg-white rounded-2xl shadow-sm border p-4 ${e.status === 'pending' ? 'border-red-200' : 'border-gray-100'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${e.status === 'pending' ? 'bg-red-100' : e.status === 'dispatched' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                          <AlertTriangle className={`w-5 h-5 ${e.status === 'pending' ? 'text-red-600' : e.status === 'dispatched' ? 'text-amber-600' : 'text-emerald-600'}`} />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{e.contact_name} &mdash; {e.request_type}</div>
                          <div className="text-gray-500 text-xs">{e.contact_phone}</div>
                          {e.address && <div className="text-gray-400 text-xs mt-0.5">{e.address}</div>}
                          {e.vehicle_type && <div className="text-gray-400 text-xs">Vehicle: {e.vehicle_type}</div>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${e.status === 'pending' ? 'bg-red-100 text-red-700' : e.status === 'dispatched' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {e.status}
                        </span>
                        {e.status === 'pending' && (
                          <button onClick={() => updateEmergencyStatus(e.id, 'dispatched')} className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-lg font-medium hover:bg-emerald-700 transition-colors">Dispatch</button>
                        )}
                        {e.status === 'dispatched' && (
                          <button onClick={() => updateEmergencyStatus(e.id, 'resolved')} className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg font-medium hover:bg-blue-700 transition-colors">Resolve</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AddStationForm({ onAdd, onCancel }: { onAdd: () => void; onCancel: () => void }) {
  const [data, setData] = useState({
    name: '', address: '', city: '', latitude: '', longitude: '',
    price_per_unit: '', total_slots: '4', available_slots: '4',
    charger_types: 'CCS2,Type 2', amenities: 'WiFi,Parking',
    has_fast_charging: false, image_url: ''
  });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('stations').insert({
      name: data.name,
      address: data.address,
      city: data.city,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      price_per_unit: parseFloat(data.price_per_unit),
      total_slots: parseInt(data.total_slots),
      available_slots: parseInt(data.available_slots),
      charger_types: data.charger_types.split(',').map(s => s.trim()),
      amenities: data.amenities.split(',').map(s => s.trim()),
      has_fast_charging: data.has_fast_charging,
      image_url: data.image_url,
    });
    setSaving(false);
    if (!error) onAdd();
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl mb-4 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-5 py-4 font-bold text-emerald-800">
        Add New Station
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 grid grid-cols-2 gap-3">
          {[
            { key: 'name', label: 'Station Name', placeholder: 'e.g. ChargeHub - Sector 5', col: '2' },
            { key: 'address', label: 'Address', placeholder: 'Street address', col: '2' },
            { key: 'city', label: 'City', placeholder: 'e.g. Bangalore', col: '1' },
            { key: 'price_per_unit', label: 'Price/unit (₹)', placeholder: '12.50', col: '1' },
            { key: 'latitude', label: 'Latitude', placeholder: '28.6315', col: '1' },
            { key: 'longitude', label: 'Longitude', placeholder: '77.2167', col: '1' },
            { key: 'total_slots', label: 'Total Slots', placeholder: '4', col: '1' },
            { key: 'available_slots', label: 'Available Slots', placeholder: '4', col: '1' },
            { key: 'charger_types', label: 'Charger Types (comma-separated)', placeholder: 'CCS2,Type 2', col: '2' },
            { key: 'amenities', label: 'Amenities (comma-separated)', placeholder: 'WiFi,Parking,Cafe', col: '2' },
            { key: 'image_url', label: 'Image URL', placeholder: 'https://...', col: '2' },
          ].map(({ key, label, placeholder, col }) => (
            <div key={key} className={col === '2' ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-emerald-700 mb-1">{label}</label>
              <input
                value={data[key as keyof typeof data] as string}
                onChange={e => setData(d => ({ ...d, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              />
            </div>
          ))}
          <div className="col-span-2 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={data.has_fast_charging} onChange={e => setData(d => ({ ...d, has_fast_charging: e.target.checked }))} className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Fast Charging Available</span>
            </label>
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              {saving ? 'Saving...' : 'Add Station'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
