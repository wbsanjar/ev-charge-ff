export const CO2_PER_KWH = 0.7;
export const CHARGER_RATE_KW = 7.4;
export const REWARD_PERCENT = 50;
export const BOOKING_BONUS_PERCENT = 5;

export type MissionType =
  | 'unique_stations'
  | 'total_bookings'
  | 'co2_saved'
  | 'off_peak'
  | 'weekend_bookings'
  | 'fast_charging';

export type MissionDef = {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  requirement: number;
  rewardPoints: number;
  icon: string;
  isActive: boolean;
};

export const DEFAULT_MISSIONS: MissionDef[] = [
  { id: 'm_station_explorer', title: 'Station Explorer', description: 'Book at 5 different charging stations', type: 'unique_stations', requirement: 5, rewardPoints: 200, icon: 'map-pin', isActive: true },
  { id: 'm_ev_enthusiast', title: 'EV Enthusiast', description: 'Complete 10 total bookings', type: 'total_bookings', requirement: 10, rewardPoints: 300, icon: 'zap', isActive: true },
  { id: 'm_carbon_warrior', title: 'Carbon Warrior', description: 'Save 100 kg of CO₂ emissions', type: 'co2_saved', requirement: 100, rewardPoints: 500, icon: 'leaf', isActive: true },
  { id: 'm_offpeak_master', title: 'Off-Peak Master', description: 'Book 3 off-peak slots (10:00 - 15:00)', type: 'off_peak', requirement: 3, rewardPoints: 150, icon: 'clock', isActive: true },
  { id: 'm_weekend_charger', title: 'Weekend Charger', description: 'Make 2 bookings on weekends', type: 'weekend_bookings', requirement: 2, rewardPoints: 100, icon: 'calendar', isActive: true },
  { id: 'm_fast_lane', title: 'Fast Lane', description: 'Use fast charging 3 times', type: 'fast_charging', requirement: 3, rewardPoints: 100, icon: 'zap-off', isActive: true },
];

export const MISSION_TYPES: { value: MissionType; label: string; desc: string }[] = [
  { value: 'unique_stations', label: 'Unique Stations Visited', desc: 'Book at X different stations' },
  { value: 'total_bookings', label: 'Total Bookings', desc: 'Complete X bookings' },
  { value: 'co2_saved', label: 'CO₂ Saved (kg)', desc: 'Save X kg of CO₂ emissions' },
  { value: 'off_peak', label: 'Off-Peak Bookings', desc: 'Book X times between 10:00-15:00' },
  { value: 'weekend_bookings', label: 'Weekend Bookings', desc: 'Book X times on weekends' },
  { value: 'fast_charging', label: 'Fast Charging Sessions', desc: 'Use fast charging X times' },
];

export type BadgeDef = {
  id: string;
  name: string;
  co2Required: number;
  icon: string;
  desc: string;
};

export const BADGE_DEFINITIONS: BadgeDef[] = [
  { id: 'eco_starter', name: 'Eco Starter', co2Required: 5, icon: '🌱', desc: 'Saved your first 5 kg CO₂' },
  { id: 'bronze_saver', name: 'Bronze Saver', co2Required: 25, icon: '🥉', desc: 'Saved 25 kg CO₂' },
  { id: 'silver_guardian', name: 'Silver Guardian', co2Required: 100, icon: '🥈', desc: 'Saved 100 kg CO₂' },
  { id: 'gold_champion', name: 'Gold Champion', co2Required: 250, icon: '🥇', desc: 'Saved 250 kg CO₂' },
  { id: 'platinum_hero', name: 'Platinum Hero', co2Required: 500, icon: '💎', desc: 'Saved 500 kg CO₂' },
  { id: 'diamond_legend', name: 'Diamond Legend', co2Required: 1000, icon: '👑', desc: 'Saved 1000 kg CO₂' },
];

export function calculateCO2(durationHours: number): number {
  return Math.round(CHARGER_RATE_KW * durationHours * CO2_PER_KWH * 100) / 100;
}

export function calculateRewardPoints(amount: number): number {
  return Math.floor(amount * (REWARD_PERCENT / 100));
}

export function calculateBookingBonus(amount: number): number {
  return Math.floor(amount * (BOOKING_BONUS_PERCENT / 100));
}

export function getEarnedBadges(totalCO2: number): string[] {
  return BADGE_DEFINITIONS
    .filter(b => totalCO2 >= b.co2Required)
    .map(b => b.id);
}

export function getBadgeDef(id: string): BadgeDef | undefined {
  return BADGE_DEFINITIONS.find(b => b.id === id);
}

export function co2ToTrees(kg: number): number {
  return Math.round(kg / 21.7 * 10) / 10;
}

export function co2ToKmDriven(kg: number): number {
  return Math.round(kg / 0.12);
}

export function pointsToRupees(points: number): number {
  return Math.round((points / 100) * 5 * 100) / 100;
}

export type RewardTier = {
  id: string;
  label: string;
  pointsCost: number;
  valueRupees: number;
  icon: string;
};

export const REWARD_TIERS: RewardTier[] = [
  { id: 'r_10', label: '₹10 Off', pointsCost: 200, valueRupees: 10, icon: 'zap' },
  { id: 'r_25', label: '₹25 Off', pointsCost: 500, valueRupees: 25, icon: 'zap' },
  { id: 'r_50', label: '₹50 Off', pointsCost: 1000, valueRupees: 50, icon: 'zap' },
  { id: 'r_100', label: '₹100 Off', pointsCost: 2000, valueRupees: 100, icon: 'zap' },
  { id: 'r_250', label: '₹250 Off', pointsCost: 5000, valueRupees: 250, icon: 'zap' },
];

export function redeemCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CHEV-';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function computeMissionProgress(type: MissionType, bookings: { station_id: string; start_time: string; booking_date: string; charger_type: string; status: string }[], totalCO2: number): number {
  switch (type) {
    case 'unique_stations': {
      const unique = new Set(bookings.filter(b => b.status !== 'cancelled').map(b => b.station_id));
      return unique.size;
    }
    case 'total_bookings': {
      return bookings.filter(b => b.status !== 'cancelled').length;
    }
    case 'co2_saved': {
      return Math.floor(totalCO2);
    }
    case 'off_peak': {
      return bookings.filter(b => {
        if (b.status === 'cancelled') return false;
        const h = parseInt(b.start_time.split(':')[0]);
        return h >= 10 && h <= 14;
      }).length;
    }
    case 'weekend_bookings': {
      return bookings.filter(b => {
        if (b.status === 'cancelled') return false;
        const d = new Date(b.booking_date);
        return d.getDay() === 0 || d.getDay() === 6;
      }).length;
    }
    case 'fast_charging': {
      return bookings.filter(b => {
        if (b.status === 'cancelled') return false;
        return b.charger_type?.toLowerCase().includes('fast') || b.charger_type === 'CCS2' || b.charger_type === 'CHAdeMO';
      }).length;
    }
    default:
      return 0;
  }
}
