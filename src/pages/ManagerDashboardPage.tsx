import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, Clock, Zap, MapPin, Search, LogOut, Building2,
  CheckCircle2, XCircle, Shield, TrendingUp, Phone,
  CreditCard, LayoutDashboard, ListOrdered, List, Filter,
  Download, RefreshCw, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Booking = {
  id: string;
  station_id: string;
  stationName: string;
  customerName: string;
  phone: string;
  vehicleNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  chargerType: string;
  status: 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  amount: number;
};

type Station = {
  id: string;
  name: string;
  address: string;
  city: string;
};

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

const PAYMENT_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  refunded: 'bg-red-100 text-red-700',
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'today', label: "Today's Schedule", icon: ListOrdered },
  { id: 'all', label: 'All Bookings', icon: List },
  { id: 'stations', label: 'Stations', icon: Building2 },
] as const;

type TabId = typeof TABS[number]['id'];

function fmtDate(dateStr: string) {
  if (!dateStr) return '--';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isToday(dateStr: string) {
  if (!dateStr) return false;
  const t = new Date(), d = new Date(dateStr + 'T00:00:00');
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

export default function ManagerDashboardPage() {
  const { profile, loading: authLoading, signOut } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, br] = await Promise.all([
        supabase.from('stations').select('id, name, address, city').order('name'),
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      ]);

      const snMap: Record<string, string> = {};
      if (sr.data) { setStations(sr.data); sr.data.forEach(s => { snMap[s.id] = s.name; }); }

      if (br.data) {
        const uids = new Set<string>();
        br.data.forEach(b => { if (b.user_id) uids.add(b.user_id); });

        const pm: Record<string, { name: string; phone: string }> = {};
        if (uids.size > 0) {
          const { data: pr } = await supabase.from('profiles').select('id, full_name, phone').in('id', Array.from(uids));
          if (pr) pr.forEach(p => { pm[p.id] = { name: p.full_name || p.id, phone: p.phone || '' }; });
        }

        setBookings(br.data.map(b => {
          const p = pm[b.user_id];
          return {
            id: b.id, station_id: b.station_id, stationName: snMap[b.station_id] || 'Unknown Station',
            customerName: p?.name || b.user_id || 'Guest', phone: p?.phone || '',
            vehicleNumber: b.vehicle_number || '', date: b.booking_date || '',
            startTime: b.start_time?.slice(0, 5) || '', endTime: b.end_time?.slice(0, 5) || '',
            chargerType: b.charger_type || '',
            status: b.status as Booking['status'], payment_status: b.payment_status as Booking['payment_status'],
            amount: Number(b.amount) || 0,
          };
        }));
      }
    } catch (err) { console.error('Error loading data:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!authLoading) loadData(); }, [authLoading, loadData]);

  const stats = useMemo(() => {
    const today = bookings.filter(b => isToday(b.date));
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const completed = bookings.filter(b => b.status === 'completed');
    const cancelled = bookings.filter(b => b.status === 'cancelled');
    const totalRev = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.amount, 0);
    return {
      today, todayActive: today.filter(b => b.status === 'confirmed').length,
      confirmed: confirmed.length, completed: completed.length, cancelled: cancelled.length,
      totalRevenue: totalRev, pendingRevenue: confirmed.reduce((s, b) => s + b.amount, 0),
      completedRevenue: completed.reduce((s, b) => s + b.amount, 0),
      avgBooking: bookings.length > 0 ? totalRev / bookings.length : 0,
      totalBookings: bookings.length,
    };
  }, [bookings]);

  const chargerMix = useMemo(() => {
    const types: Record<string, number> = {};
    bookings.forEach(b => { if (b.chargerType) types[b.chargerType] = (types[b.chargerType] || 0) + 1; });
    const total = Object.values(types).reduce((s, v) => s + v, 0);
    return Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, c]) => ({ type: t, count: c, pct: total > 0 ? (c / total) * 100 : 0 }));
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    let result = [...bookings];
    const q = searchQuery.toLowerCase();
    if (q) result = result.filter(b => b.customerName.toLowerCase().includes(q) || b.vehicleNumber.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || b.stationName.toLowerCase().includes(q));
    if (statusFilter !== 'all') result = result.filter(b => b.status === statusFilter);
    if (stationFilter !== 'all') result = result.filter(b => b.station_id === stationFilter);
    result.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime();
      if (sortBy === 'date-asc') return new Date(a.date + 'T00:00:00').getTime() - new Date(b.date + 'T00:00:00').getTime();
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      return a.amount - b.amount;
    });
    return result;
  }, [bookings, searchQuery, statusFilter, stationFilter, sortBy]);

  const todaySorted = useMemo(() => {
    return [...bookings].filter(b => isToday(b.date)).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [bookings]);

  const upcomingToday = todaySorted.filter(b => b.status === 'confirmed');

  async function updateStatus(bookingId: string, newStatus: string) {
    const orig = bookings.find(b => b.id === bookingId)?.status;
    setUpdatingId(bookingId);
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus as Booking['status'] } : b));
    const { error } = await supabase.rpc('update_booking_status', { p_booking_id: bookingId, p_new_status: newStatus });
    if (error) {
      if (orig) setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: orig } : b));
    }
    setUpdatingId(null);
  }

  async function bulkUpdateStatus(newStatus: string) {
    for (const id of selectedIds) await updateStatus(id, newStatus);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  if (authLoading) return (
    <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  if (!profile || (profile.role !== 'manager' && profile.role !== 'admin')) return (
    <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-gray-700 mb-2">Manager Access Only</h2>
        <p className="text-gray-500">You need a manager role to access this dashboard.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 h-24" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-2xl p-4 h-24 border border-gray-100" />)}
        </div>
        <div className="bg-white rounded-2xl h-64 border border-gray-100" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* === HEADER === */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white mb-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black">Manager Dashboard</h1>
                <p className="text-emerald-100 text-sm">{stations.length} stations &middot; {stats.totalBookings} bookings &middot; {stats.today.length} today</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition-colors">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button onClick={() => signOut()} className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition-colors">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* === TABS === */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${tab === t.id ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* ==================== TAB: OVERVIEW ==================== */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Stations', value: stations.length, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Today', value: stats.today.length, sub: `${stats.todayActive} active`, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Completed', value: stats.completed, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
                { label: 'Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className={`w-9 h-9 ${s.bg} ${s.color} rounded-xl flex items-center justify-center mb-2`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-black text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                  {s.sub && <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Revenue + Status Breakdown */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Revenue Breakdown */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> Revenue Overview
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Completed Revenue</span>
                      <span className="font-bold text-blue-600">₹{stats.completedRevenue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${stats.totalRevenue > 0 ? (stats.completedRevenue / stats.totalRevenue) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Pending Revenue</span>
                      <span className="font-bold text-amber-600">₹{stats.pendingRevenue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${stats.totalRevenue > 0 ? (stats.pendingRevenue / stats.totalRevenue) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="font-semibold text-gray-700">Total Revenue</span>
                    <span className="font-black text-emerald-600 text-lg">₹{stats.totalRevenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-xs text-gray-400">Avg. booking value: ₹{stats.avgBooking.toFixed(0)} &middot; {stats.totalBookings} total bookings</div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-emerald-600" /> Booking Status
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Confirmed', count: stats.confirmed, color: 'bg-emerald-500', text: 'text-emerald-600' },
                    { label: 'Completed', count: stats.completed, color: 'bg-blue-500', text: 'text-blue-600' },
                    { label: 'Cancelled', count: stats.cancelled, color: 'bg-red-400', text: 'text-red-500' },
                  ].map(s => {
                    const pct = stats.totalBookings > 0 ? (s.count / stats.totalBookings) * 100 : 0;
                    return (
                      <div key={s.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className={s.text + ' font-medium'}>{s.label}</span>
                          <span className="font-bold text-gray-900">{s.count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Charger Mix */}
                {chargerMix.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-500" /> Charger Type Mix
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {chargerMix.map(c => (
                        <div key={c.type} className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg text-xs">
                          <span className="font-semibold text-gray-700">{c.type}</span>
                          <span className="text-gray-400">{c.count} ({c.pct.toFixed(0)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Today's Upcoming Bookings (Preview) */}
            {upcomingToday.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" /> Today's Schedule
                  </h3>
                  <button onClick={() => setTab('today')} className="text-xs text-emerald-600 font-medium hover:underline">View All</button>
                </div>
                <div className="divide-y divide-gray-50">
                  {upcomingToday.slice(0, 5).map(b => (
                    <div key={b.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-14 text-center">{b.startTime}</div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{b.customerName}</div>
                          <div className="text-xs text-gray-500 truncate">{b.stationName} &middot; {b.vehicleNumber || b.chargerType}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[b.status]}`}>{b.status}</span>
                        <span className="text-xs font-bold text-gray-700">₹{b.amount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Bookings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <List className="w-4 h-4 text-emerald-600" /> Recent Bookings
                </h3>
              </div>
              {bookings.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No bookings yet</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {bookings.slice(0, 5).map(b => (
                    <div key={b.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{(b.customerName || '?')[0].toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{b.customerName}</div>
                          <div className="text-xs text-gray-500">{b.stationName} &middot; {fmtDate(b.date)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[b.status]}`}>{b.status}</span>
                        <span className="text-xs font-bold text-gray-700">₹{b.amount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB: TODAY'S SCHEDULE ==================== */}
        {tab === 'today' && (
          <div className="space-y-4">
            {/* Today Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-black text-gray-900">{todaySorted.length}</div>
                <div className="text-xs text-gray-500">Total Today</div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-black text-emerald-600">{upcomingToday.length}</div>
                <div className="text-xs text-gray-500">Upcoming</div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-black text-blue-600">{todaySorted.filter(b => b.status === 'completed').length}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="text-2xl font-black text-gray-900">
                  ₹{todaySorted.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.amount, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-gray-500">Today's Revenue</div>
              </div>
            </div>

            {/* Timeline */}
            {todaySorted.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No bookings for today</p>
                <p className="text-gray-400 text-sm mt-1">All clear! No scheduled slots.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaySorted.map(b => {
                  return (
                    <div key={b.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${b.status === 'confirmed' ? 'border-l-4 border-l-emerald-500' : b.status === 'completed' ? 'border-l-4 border-l-blue-400 opacity-75' : 'border-l-4 border-l-red-300 opacity-60'}`}>
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="text-center flex-shrink-0 w-16">
                            <div className="text-sm font-black text-emerald-600 font-mono">{b.startTime}</div>
                            <div className="text-xs text-gray-400 font-mono">{b.endTime}</div>
                          </div>
                          <div className="w-px h-10 bg-gray-200 flex-shrink-0 hidden sm:block" />
                          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">{(b.customerName || '?')[0].toUpperCase()}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 text-sm">{b.customerName}</span>
                              {b.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{b.phone}</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                              <span>{b.stationName}</span>
                              <span className="text-gray-300">|</span>
                              <span>{b.vehicleNumber || 'No vehicle'}</span>
                              <span className="text-gray-300">|</span>
                              <span>{b.chargerType}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="font-bold text-emerald-600 text-sm">₹{b.amount.toLocaleString('en-IN')}</div>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PAYMENT_BADGE[b.payment_status]}`}>{b.payment_status}</span>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {b.status === 'confirmed' && (
                              <>
                                <button onClick={() => { if (window.confirm(`Mark ${b.customerName}'s booking as completed?`)) updateStatus(b.id, 'completed'); }}
                                  disabled={updatingId === b.id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                  {updatingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Complete
                                </button>
                                <button onClick={() => { if (window.confirm(`Cancel ${b.customerName}'s booking?`)) updateStatus(b.id, 'cancelled'); }}
                                  disabled={updatingId === b.id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50 transition-colors">
                                  <XCircle className="w-3 h-3" /> Cancel
                                </button>
                              </>
                            )}
                            {b.status === 'completed' && <span className="text-xs text-blue-600 font-medium flex items-center gap-1 px-3 py-1.5"><CheckCircle2 className="w-3 h-3" /> Done</span>}
                            {b.status === 'cancelled' && <span className="text-xs text-red-500 font-medium flex items-center gap-1 px-3 py-1.5"><XCircle className="w-3 h-3" /> Cancelled</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: ALL BOOKINGS ==================== */}
        {tab === 'all' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search name, vehicle, station, or booking ID..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="all">All Status ({bookings.length})</option>
                  <option value="confirmed">Confirmed ({stats.confirmed})</option>
                  <option value="completed">Completed ({stats.completed})</option>
                  <option value="cancelled">Cancelled ({stats.cancelled})</option>
                </select>
                <select value={stationFilter} onChange={e => setStationFilter(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="all">All Stations</option>
                  {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="amount-desc">Highest Amount</option>
                  <option value="amount-asc">Lowest Amount</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-700">{selectedIds.size} selected</span>
                <div className="flex gap-2">
                  <button onClick={() => bulkUpdateStatus('completed')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">Mark Completed</button>
                  <button onClick={() => bulkUpdateStatus('cancelled')} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors">Cancel All</button>
                  <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-white transition-colors">Clear</button>
                </div>
              </div>
            )}

            {/* Export */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found</span>
              <button onClick={() => {
                const csv = [['ID','Customer','Phone','Station','Date','Start','End','Vehicle','Charger','Status','Payment','Amount']].concat(
                  filteredBookings.map(b => [b.id, b.customerName, b.phone, b.stationName, b.date, b.startTime, b.endTime, b.vehicleNumber, b.chargerType, b.status, b.payment_status, b.amount.toString()])
                ).map(r => r.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bookings.csv'; a.click();
              }} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>

            {/* Bookings List */}
            {filteredBookings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No bookings match your filters</p>
                <button onClick={() => { setSearchQuery(''); setStatusFilter('all'); setStationFilter('all'); }} className="mt-2 text-sm text-emerald-600 font-medium hover:underline">Clear filters</button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBookings.map(b => (
                  <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <label className="flex items-center mt-1 cursor-pointer" onClick={() => toggleSelect(b.id)}>
                            <input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => {}} className="w-4 h-4 text-emerald-600 rounded border-gray-300" />
                          </label>
                          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">{(b.customerName || '?')[0].toUpperCase()}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 text-sm">{b.customerName}</span>
                              {b.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{b.phone}</span>}
                              <span className="text-xs text-gray-400 font-mono">#{b.id.slice(-8).toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{b.stationName}</span>
                              <span className="text-gray-300">|</span>
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(b.date)}</span>
                              {isToday(b.date) && <span className="text-emerald-600 font-medium">Today</span>}
                              <span className="text-gray-300">|</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.startTime}-{b.endTime}</span>
                              <span className="text-gray-300">|</span>
                              <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{b.chargerType}</span>
                              <span className="text-gray-300">|</span>
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.vehicleNumber || '--'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="font-black text-emerald-600">₹{b.amount.toLocaleString('en-IN')}</div>
                            <div className="flex items-center gap-1 justify-end mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[b.status]}`}>{b.status}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PAYMENT_BADGE[b.payment_status]}`}>{b.payment_status}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            {b.status === 'confirmed' && (
                              <>
                                <button onClick={() => { if (window.confirm(`Mark completed?`)) updateStatus(b.id, 'completed'); }}
                                  disabled={updatingId === b.id}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                  {updatingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Complete
                                </button>
                                <button onClick={() => { if (window.confirm(`Cancel booking?`)) updateStatus(b.id, 'cancelled'); }}
                                  disabled={updatingId === b.id}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50 transition-colors">
                                  <XCircle className="w-3 h-3" /> Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB: STATIONS ==================== */}
        {tab === 'stations' && (
          <div className="space-y-4">
            {stations.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No stations found</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stations.map(s => {
                  const stationB = bookings.filter(b => b.station_id === s.id);
                  const active = stationB.filter(b => b.status === 'confirmed').length;
                  const rev = stationB.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.amount, 0);
                  const todayB = stationB.filter(b => isToday(b.date) && b.status === 'confirmed');
                  return (
                    <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-5 py-4 text-white">
                        <h3 className="font-bold text-base">{s.name}</h3>
                        <p className="text-emerald-100 text-xs mt-0.5">{s.address}{s.city ? `, ${s.city}` : ''}</p>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-lg font-black text-gray-900">{stationB.length}</div>
                            <div className="text-xs text-gray-500">Total</div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-emerald-600">{active}</div>
                            <div className="text-xs text-gray-500">Active</div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-blue-600">{stationB.filter(b => b.status === 'completed').length}</div>
                            <div className="text-xs text-gray-500">Done</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                          <span className="text-gray-500">Revenue</span>
                          <span className="font-bold text-emerald-600">₹{rev.toLocaleString('en-IN')}</span>
                        </div>
                        {todayB.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                            <div className="text-xs font-medium text-amber-700 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {todayB.length} booking{todayB.length !== 1 ? 's' : ''} today
                            </div>
                            {todayB.slice(0, 2).map(b => (
                              <div key={b.id} className="text-xs text-amber-600 mt-1 flex justify-between">
                                <span>{b.startTime} - {b.customerName}</span>
                                <span className="font-medium">₹{b.amount.toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
