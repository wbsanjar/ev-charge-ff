import { useState, useEffect } from 'react';
import { Calendar, Clock, Zap, MapPin, CheckCircle, XCircle, ChevronRight, User, Phone, Save, Receipt, Award, Wallet, History, Leaf, TreePine, Gift, Sparkles, Coins, BadgeCheck, Percent, Copy, Check, Tag } from 'lucide-react';
import { supabase, Booking, Station, RewardTransaction } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BookingReceiptModal from '../components/BookingReceiptModal';
import { calculateCO2, calculateRewardPoints, getEarnedBadges, co2ToTrees, co2ToKmDriven, pointsToRupees, BADGE_DEFINITIONS, REWARD_TIERS, RewardTier, redeemCode } from '../lib/gamification';
import { getCancelInfo } from '../lib/penalty';

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
  const [activeTab, setActiveTab] = useState<'bookings' | 'impact' | 'profile'>('bookings');
  const [editName, setEditName] = useState(profile?.full_name || '');
  const [editPhone, setEditPhone] = useState(profile?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState<BookingWithStation | null>(null);
  const [receiptStation, setReceiptStation] = useState<Station | null>(null);
  const [rewardTxs, setRewardTxs] = useState<RewardTransaction[]>([]);
  const [retroSyncing, setRetroSyncing] = useState(false);
  const [redeemingTier, setRedeemingTier] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<{ code: string; label: string; value: number } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

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
    const confirmText = cancelCount >= 1
      ? `You have ${cancelCount} cancellation${cancelCount > 1 ? 's' : ''} on your record. ${cancelCount + 1 >= 4 ? 'This will BLOCK you from booking.' : cancelCount + 1 === 3 ? 'This is your FINAL warning.' : cancelCount + 1 === 2 ? 'This will trigger your first warning.' : ''} Are you sure?`
      : 'Are you sure you want to cancel this booking?';
    if (!window.confirm(confirmText)) return;
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    await fetchBookings();
  }

  async function viewReceipt(booking: BookingWithStation) {
    const { data } = await supabase.from('stations').select('*').eq('id', booking.station_id).single();
    if (data) {
      setReceiptStation(data);
      setReceiptBooking(booking);
    }
  }

  async function retroSyncRewards() {
    if (!user || retroSyncing) return;
    setRetroSyncing(true);
    const { data: txCheck } = await supabase
      .from('reward_transactions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    if (txCheck && txCheck.length > 0) { setRetroSyncing(false); return; }

    const { data: pastBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'completed']);

    if (!pastBookings || pastBookings.length === 0) { setRetroSyncing(false); return; }

    let totalCO2 = 0;
    let totalPoints = 0;
    const txns: { user_id: string; points: number; type: string; reference_id: string; description: string }[] = [];

    for (const b of pastBookings) {
      const sh = parseInt(b.start_time.split(':')[0]);
      const eh = parseInt(b.end_time.split(':')[0]);
      const dur = eh - sh;
      if (dur <= 0) continue;
      const c = calculateCO2(dur);
      const p = calculateRewardPoints(b.amount);
      totalCO2 += c;
      totalPoints += p;
      txns.push({
        user_id: user.id,
        points: p,
        type: 'earned',
        reference_id: b.id,
        description: `Retroactive: Booking on ${b.booking_date}`,
      });
    }

    const earnedBadges = getEarnedBadges(totalCO2);
    const { data: curProfile } = await supabase.from('profiles').select('badges').eq('id', user.id).single();
    const existingBadges = (curProfile as { badges?: string[] } | null)?.badges || [];

    await supabase.from('profiles').update({
      total_co2_saved: totalCO2,
      reward_points: totalPoints,
      badges: [...new Set([...existingBadges, ...earnedBadges])],
    }).eq('id', user.id);

    if (txns.length > 0) {
      await supabase.from('reward_transactions').insert(txns);
    }

    await refreshProfile();
    setRetroSyncing(false);
  }

  async function redeemReward(tier: RewardTier) {
    if (!user || !profile) return;
    if ((profile.reward_points || 0) < tier.pointsCost) return;
    setRedeemingTier(tier.id);
    const code = redeemCode();
    const { error } = await supabase.from('reward_transactions').insert({
      user_id: user.id,
      points: -tier.pointsCost,
      type: 'redeemed' as const,
      reference_id: code,
      description: `Redeemed: ${tier.label}`,
    });
    if (error) { setRedeemingTier(null); return; }
    const newPts = (profile.reward_points || 0) - tier.pointsCost;
    await supabase.from('profiles').update({ reward_points: newPts }).eq('id', user.id);
    await refreshProfile();
    await fetchRewardTxs();
    setRedeemingTier(null);
    setRedeemSuccess({ code, label: tier.label, value: tier.valueRupees });
    setTimeout(() => setRedeemSuccess(null), 10000);
  }

  useEffect(() => {
    if (!user) return;
    fetchRewardTxs();
    retroSyncRewards();
  }, [user]);

  async function fetchRewardTxs() {
    if (!user) return;
    const { data } = await supabase
      .from('reward_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setRewardTxs(data as RewardTransaction[]);
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
  const cancelCount = bookings.filter(b => b.status === 'cancelled').length;
  const cancelInfo = getCancelInfo(cancelCount);

  return (
    <>
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Cancellation Warning Banner */}
        {cancelInfo.warningLevel !== 'none' && (
          <div className={`mb-4 rounded-2xl p-4 border ${cancelInfo.warningLevel === 'blocked' ? 'bg-red-50 border-red-200' : cancelInfo.warningLevel === 'final' ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cancelInfo.warningLevel === 'blocked' ? 'bg-red-100' : cancelInfo.warningLevel === 'final' ? 'bg-orange-100' : 'bg-amber-100'}`}>
                <XCircle className={`w-5 h-5 ${cancelInfo.warningLevel === 'blocked' ? 'text-red-600' : cancelInfo.warningLevel === 'final' ? 'text-orange-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <p className={`text-sm font-bold ${cancelInfo.warningLevel === 'blocked' ? 'text-red-700' : cancelInfo.warningLevel === 'final' ? 'text-orange-700' : 'text-amber-700'}`}>
                  {cancelInfo.warningLevel === 'blocked' ? 'Account Blocked' : cancelInfo.warningLevel === 'final' ? 'Final Warning' : 'First Warning'}
                </p>
                <p className={`text-xs mt-0.5 ${cancelInfo.warningLevel === 'blocked' ? 'text-red-600' : cancelInfo.warningLevel === 'final' ? 'text-orange-600' : 'text-amber-600'}`}>
                  {cancelInfo.message}
                </p>
              </div>
            </div>
          </div>
        )}

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
          <button onClick={() => setActiveTab('impact')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'impact' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}>
            Impact & Rewards
          </button>
          <button onClick={() => setActiveTab('profile')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'profile' ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}>
            Profile Settings
          </button>
        </div>

        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-36 bg-gray-200 rounded" />
                          <div className="h-3 w-20 bg-gray-200 rounded" />
                        </div>
                      </div>
                      <div className="h-5 w-20 bg-gray-200 rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                      <div className="h-3 w-16 bg-gray-200 rounded" />
                      <div className="h-3 w-20 bg-gray-200 rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-16 bg-gray-200 rounded" />
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
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
                      {upcomingBookings.map(b => <BookingCard key={b.id} booking={b} onCancel={cancelBooking} onViewReceipt={viewReceipt} />)}
                    </div>
                  </div>
                )}
                {pastBookings.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold text-gray-700 mb-3 mt-6">Past Bookings</h3>
                    <div className="space-y-3">
                      {pastBookings.map(b => <BookingCard key={b.id} booking={b} onCancel={cancelBooking} onViewReceipt={viewReceipt} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'impact' && (
          <>
          <div className="space-y-4">
            {retroSyncing && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                <p className="text-sm text-amber-700 font-medium">Syncing your past bookings with rewards...</p>
              </div>
            )}

            {/* Green Impact */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-lg text-white">
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="w-5 h-5" />
                <h3 className="text-lg font-bold">Your Green Impact</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <div className="text-3xl font-black">{profile?.total_co2_saved?.toFixed(1) || '0'}</div>
                  <div className="text-emerald-100 text-xs mt-1">kg CO₂ Saved</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <div className="text-3xl font-black flex items-center justify-center gap-1">
                    <TreePine className="w-6 h-6" />
                    {co2ToTrees(profile?.total_co2_saved || 0)}
                  </div>
                  <div className="text-emerald-100 text-xs mt-1">Trees Equivalent</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <div className="text-3xl font-black flex items-center justify-center gap-1">
                    <MapPin className="w-6 h-6" />
                    {co2ToKmDriven(profile?.total_co2_saved || 0)}km
                  </div>
                  <div className="text-emerald-100 text-xs mt-1">Petrol Car Saved</div>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-gray-900">Badges</h3>
                </div>
                <span className="text-sm text-gray-400">
                  {BADGE_DEFINITIONS.filter(b => (profile?.badges || []).includes(b.id)).length}/{BADGE_DEFINITIONS.length}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {BADGE_DEFINITIONS.map(b => {
                  const earned = (profile?.badges || []).includes(b.id);
                  return (
                    <div key={b.id} className={`rounded-xl p-3 text-center border transition-all ${earned ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                      <div className="text-2xl mb-1">{b.icon}</div>
                      <div className="text-xs font-semibold text-gray-700">{b.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{earned ? 'Earned' : `${b.co2Required} kg`}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Wallet */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-5 h-5" />
                  <h3 className="text-lg font-bold">Reward Wallet</h3>
                </div>
                <div className="text-4xl font-black mt-2">{profile?.reward_points?.toLocaleString() || '0'}</div>
                <div className="text-amber-100 text-sm mt-1">
                  ≈ ₹{pointsToRupees(profile?.reward_points || 0).toFixed(2)} in booking rewards
                </div>
              </div>

              {/* Transaction History */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-gray-400" />
                  <h4 className="text-sm font-bold text-gray-700">Transaction History</h4>
                </div>
                {rewardTxs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No transactions yet. Book a slot to earn rewards!</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {rewardTxs.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          {tx.type === 'earned' ? (
                            <Coins className="w-4 h-4 text-emerald-500" />
                          ) : tx.type === 'bonus' ? (
                            <Gift className="w-4 h-4 text-amber-500" />
                          ) : tx.type === 'redeemed' ? (
                            <Tag className="w-4 h-4 text-red-500" />
                          ) : (
                            <BadgeCheck className="w-4 h-4 text-blue-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-700">{tx.description || tx.type}</p>
                            <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-IN')}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${tx.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {tx.points > 0 ? '+' : ''}{tx.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

            {/* Redeem Rewards */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-5 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="w-5 h-5" />
                  <h3 className="text-lg font-bold">Redeem Rewards</h3>
                </div>
                <p className="text-emerald-100 text-sm">Convert your points into booking discounts</p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {REWARD_TIERS.map(tier => {
                    const canAfford = (profile?.reward_points || 0) >= tier.pointsCost;
                    return (
                      <div key={tier.id} className={`rounded-xl border p-4 transition-all ${canAfford ? 'border-gray-200 hover:border-emerald-400 hover:shadow-sm' : 'border-gray-100 opacity-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-black text-gray-900">{tier.label}</span>
                          <span className="text-xs text-gray-400">{tier.pointsCost.toLocaleString()} pts</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Value: ₹{tier.valueRupees}</span>
                          <button
                            onClick={() => redeemReward(tier)}
                            disabled={!canAfford || redeemingTier === tier.id}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${canAfford ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-400'} disabled:opacity-60`}
                          >
                            {redeemingTier === tier.id ? 'Redeeming...' : 'Redeem'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(profile?.reward_points || 0) < Math.min(...REWARD_TIERS.map(t => t.pointsCost)) && (
                  <p className="text-xs text-gray-400 text-center mt-4">Earn more points to unlock rewards. Book a charging slot to get started!</p>
                )}
              </div>
            </div>

            {/* Redeem Success Modal */}
            {redeemSuccess && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setRedeemSuccess(null)}>
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Gift className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 mb-2">Reward Redeemed!</h2>
                  <p className="text-gray-500 mb-5">Your {redeemSuccess.label} reward is ready.</p>
                  <div className="bg-gray-50 rounded-2xl p-5 mb-5">
                    <p className="text-xs text-gray-500 mb-2">Your voucher code</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-xl font-black tracking-wider text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                        {redeemSuccess.code}
                      </code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(redeemSuccess.code); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }}
                        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">Show this code at the station to avail ₹{redeemSuccess.value} discount</p>
                  </div>
                  <button
                    onClick={() => setRedeemSuccess(null)}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </>
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

      {receiptBooking && receiptStation && (
        <BookingReceiptModal
          booking={receiptBooking}
          station={receiptStation}
          duration={(() => {
            const sh = parseInt(receiptBooking.start_time.split(':')[0]);
            const eh = parseInt(receiptBooking.end_time.split(':')[0]);
            return eh - sh;
          })()}
          onClose={() => { setReceiptBooking(null); setReceiptStation(null); }}
          onBackToHome={() => { setReceiptBooking(null); setReceiptStation(null); setActiveTab('bookings'); }}
        />
      )}
    </>
  );
}

function BookingCard({ booking, onCancel, onViewReceipt }: { booking: BookingWithStation; onCancel: (id: string) => void; onViewReceipt: (b: BookingWithStation) => void }) {
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewReceipt(booking)}
            className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <Receipt className="w-3.5 h-3.5" /> Receipt
          </button>
          {isUpcoming && (
            <button
              onClick={() => onCancel(booking.id)}
              className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
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

