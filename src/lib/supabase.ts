import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  role: 'user' | 'admin' | 'manager';
  avatar_url: string;
  created_at: string;
};

export type Station = {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  charger_types: string[];
  has_fast_charging: boolean;
  price_per_unit: number;
  total_slots: number;
  available_slots: number;
  amenities: string[];
  image_url: string;
  is_active: boolean;
  created_at: string;
};

export type Review = {
  id: string;
  station_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: Profile;
};

export type Booking = {
  id: string;
  user_id: string;
  station_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  charger_type: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'paid' | 'refunded';
  amount: number;
  vehicle_number: string;
  created_at: string;
  stations?: Station;
};

export type StationManager = {
  id: string;
  manager_id: string;
  station_id: string;
  created_at: string;
};

export type EmergencyRequest = {
  id: string;
  user_id: string | null;
  contact_name: string;
  contact_phone: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  request_type: 'charging' | 'mechanic' | 'towing';
  vehicle_type: string;
  description: string;
  status: 'pending' | 'dispatched' | 'resolved';
  created_at: string;
};
