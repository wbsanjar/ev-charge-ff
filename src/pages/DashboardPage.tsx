import { useState, useEffect } from 'react';
import { Calendar, Clock, Zap, MapPin, CheckCircle, XCircle, ChevronRight, User, Phone, Save } from 'lucide-react';
import { supabase, Booking } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type BookingWithStation = Booking & { stations: { name: string; address: string; city: string; has_fast_charging: boolean } };

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
};

export default function DashboardPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [bookings, setBookings] = useState<BookingWithStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bookings' | 'profile'>('bookings');
  const [editName, setEditName] = useState(profile?.full_name || '');
  const [editPhone, setEditPhone] = useState(profile?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (profile) { setEditName(profile.full_name); setEditPhone(profile.phone); }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    fetchBookings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchBookings() {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*, stations(name, address, city, has_fast_charging)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) setBookings(data as BookingWithStation[]);
    setLoading(false);
  }

  async function cancelBooking(id: string) {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    await fetchBookings();
  }

  async function saveProfile() {
    if (!user) return;
    setSavingProfile(true);
    await supabase.from('profiles').update({ full_name: editName, phone: editPhone }).eq('id', user.id);
    await refreshProfile();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
    setSavingProfile(false);
  }

  const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && new Date(b.booking_date) >= new Date());
  const pastBookings = bookings.filter(b => b.status !== 'confirmed' || new Date(b.booking_date) < new Date());

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white mb-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black">
              {(profile?.full_name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black">{profile?.full_name || 'Welcome!'}</h1>
              <p className="text-emerald-100">{user?.email}</p>
            </div>
            <div className="ml-auto grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-black">{bookings.length}</div>
                <div className="text-emerald-100 text-xs">Total Bookings</div>
              </div>
              <div>
                <div className="text-2xl font-black">{upcomingBookings.length}</div>
                <div className="text-emerald-100 text-xs">Upcoming</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100 mb-6 w-fit">
          <button onClick={() => setActiveTab('bookings')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'bookings' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}>
            My Bookings
          </button>
          <button onClick={() => setActiveTab('profile')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'profile' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}>
            Profile Settings
          </button>
        </div>

        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No bookings yet</h3>
                <p className="text-gray-500">Start by finding a charging station and booking a slot.</p>
              </div>
            ) : (
              <>
                {upcomingBookings.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold text-gray-700 mb-3">Upcoming</h3>
                    <div className="space-y-3">
                      {upcomingBookings.map(b => <BookingCard key={b.id} booking={b} onCancel={cancelBooking} />)}
                    </div>
                  </div>
                )}
                {pastBookings.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold text-gray-700 mb-3 mt-6">Past Bookings</h3>
                    <div className="space-y-3">
                      {pastBookings.map(b => <BookingCard key={b.id} booking={b} onCancel={cancelBooking} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" /> Profile Settings
            </h3>
            <div className="space-y-5 max-w-sm">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400"
                />
              </div>
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {profileSaved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : savingProfile ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ booking, onCancel }: { booking: BookingWithStation; onCancel: (id: string) => void }) {
  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.confirmed;
  const StatusIcon = status.icon;
  const isUpcoming = booking.status === 'confirmed' && new Date(booking.booking_date) >= new Date();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isUpcoming ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            <Zap className={`w-5 h-5 ${isUpcoming ? 'text-emerald-600' : 'text-gray-500'}`} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">{booking.stations?.name}</h4>
            <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
              <MapPin className="w-3 h-3" />
              <span>{booking.stations?.city}</span>
            </div>
          </div>
        </div>
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
          <StatusIcon className="w-3 h-3" /> {status.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          {new Date(booking.booking_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          {booking.start_time.slice(0, 5)}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Zap className="w-3.5 h-3.5 text-gray-400" />
          {booking.charger_type}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-emerald-600 font-black">₹{booking.amount.toFixed(0)}</span>
        {isUpcoming && (
          <button
            onClick={() => onCancel(booking.id)}
            className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium"
          >
            <XCircle className="w-3.5 h-3.5" /> Cancel
          </button>
        )}
        <span className="text-xs text-gray-400 font-mono">#{booking.id.slice(-8).toUpperCase()}</span>
      </div>

      {isUpcoming && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <a
            href={`https://maps.google.com?q=${booking.stations?.name}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium hover:text-emerald-700"
          >
            <MapPin className="w-3.5 h-3.5" /> Get Directions <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}

