import { useState, useEffect } from 'react';
import { Zap, Target, CheckCircle, Clock, Medal, Coins, Sparkles, MapPin, Calendar, Leaf, ZapOff, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_MISSIONS, computeMissionProgress } from '../lib/gamification';

const MISSION_ICONS: Record<string, typeof MapPin> = {
  'map-pin': MapPin, 'zap': Zap, 'leaf': Leaf, 'clock': Clock, 'calendar': Calendar, 'zap-off': ZapOff,
};

type ClaimedIds = Set<string>;

export default function MissionsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [claimedIds, setClaimedIds] = useState<ClaimedIds>(new Set());
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [bookings, setBookings] = useState<{ station_id: string; start_time: string; booking_date: string; charger_type: string; status: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();

    function onVisible() {
      if (document.visibilityState === 'visible') loadData();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user]);

  async function loadData() {
    setLoading(true);
    const [txRes, bkRes] = await Promise.all([
      supabase.from('reward_transactions').select('reference_id').eq('user_id', user!.id).eq('type', 'bonus'),
      supabase.from('bookings').select('station_id, start_time, booking_date, charger_type, status').eq('user_id', user!.id),
    ]);
    const claimed = new Set<string>();
    (txRes.data || []).forEach(tx => { if (tx.reference_id) claimed.add(tx.reference_id); });
    setClaimedIds(claimed);
    if (bkRes.data) setBookings(bkRes.data);
    setLoading(false);
  }

  async function claimReward(missionId: string) {
    if (!user) return;
    setClaiming(missionId);
    const mission = DEFAULT_MISSIONS.find(m => m.id === missionId);
    if (!mission) { setClaiming(null); return; }

    const { error } = await supabase.from('reward_transactions').insert({
      user_id: user.id,
      points: mission.rewardPoints,
      type: 'bonus',
      reference_id: missionId,
      description: `Mission completed: ${mission.title}`,
    });

    if (error) {
      console.error('Claim error:', error);
      setClaiming(null);
      return;
    }

    const newPts = (profile?.reward_points || 0) + mission.rewardPoints;
    await supabase.from('profiles').update({ reward_points: newPts }).eq('id', user.id);
    await refreshProfile();
    setClaimedIds(prev => new Set([...prev, missionId]));
    setClaiming(null);
  }

  const totalCO2 = profile?.total_co2_saved || 0;
  const activeMissions = DEFAULT_MISSIONS.filter(m => m.isActive);
  const completedIds = claimedIds;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-purple-600 to-violet-700 rounded-2xl p-6 text-white mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Target className="w-7 h-7" />
              <h1 className="text-2xl font-black">Missions</h1>
            </div>
            <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-medium transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
          <p className="text-purple-200 text-sm">Complete challenges, earn rewards, and level up your EV journey</p>
          <div className="flex items-center gap-2 mt-3 bg-white/10 rounded-xl px-4 py-2.5 w-fit">
            <Coins className="w-4 h-4 text-amber-300" />
            <span className="text-sm font-semibold">{profile?.reward_points || 0} pts</span>
            <span className="text-purple-200 text-xs ml-1">available</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-44 bg-gray-200 rounded" />
                    <div className="h-3 w-60 bg-gray-200 rounded" />
                    <div className="h-2 w-full bg-gray-200 rounded-full mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeMissions.filter(m => !completedIds.has(m.id)).length > 0 && (
              <div className="mb-8">
                <h3 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Active Missions
                </h3>
                <div className="space-y-3">
                  {activeMissions.filter(m => !completedIds.has(m.id)).map(m => {
                    const Icon = MISSION_ICONS[m.icon] || Target;
                    const progress = computeMissionProgress(m.type, bookings, totalCO2);
                    const pct = Math.min(100, Math.round((progress / m.requirement) * 100));
                    const canClaim = progress >= m.requirement;
                    return (
                      <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${canClaim ? 'bg-amber-100' : 'bg-purple-100'}`}>
                            <Icon className={`w-6 h-6 ${canClaim ? 'text-amber-600' : 'text-purple-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-gray-900 text-sm">{m.title}</h4>
                                <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                              </div>
                              <div className="flex items-center gap-1 text-amber-600 font-bold text-sm flex-shrink-0">
                                <Coins className="w-3.5 h-3.5" />+{m.rewardPoints}
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                                <span>Progress</span>
                                <span>{Math.min(progress, m.requirement)}/{m.requirement}</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className={`h-2 rounded-full transition-all ${canClaim ? 'bg-amber-500' : 'bg-purple-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            {canClaim && (
                              <button onClick={() => claimReward(m.id)} disabled={claiming === m.id} className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-colors">
                                {claiming === m.id ? 'Claiming...' : <><Sparkles className="w-3.5 h-3.5" /> Claim Reward</>}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {completedIds.size > 0 && (
              <div>
                <h3 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Medal className="w-4 h-4 text-emerald-500" /> Completed ({completedIds.size})
                </h3>
                <div className="space-y-2">
                  {activeMissions.filter(m => completedIds.has(m.id)).map(m => {
                    return (
                      <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 opacity-75">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-sm">{m.title}</h4>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                            <Coins className="w-3.5 h-3.5" />+{m.rewardPoints}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeMissions.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No missions available</h3>
                <p className="text-gray-500">Check back soon for new challenges!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
