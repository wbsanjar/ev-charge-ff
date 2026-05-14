CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY,
  full_name text DEFAULT '',
  phone text DEFAULT '',
  role text DEFAULT 'user',
  avatar_url text DEFAULT '',
  total_co2_saved numeric DEFAULT 0,
  reward_points integer DEFAULT 0,
  badges text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles public read"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  charger_types text[] DEFAULT '{}',
  has_fast_charging boolean DEFAULT false,
  price_per_unit numeric(10,2) DEFAULT 0,
  total_slots integer DEFAULT 4,
  available_slots integer DEFAULT 4,
  amenities text[] DEFAULT '{}',
  image_url text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active stations"
  ON stations FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert stations"
  ON stations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update stations"
  ON stations FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS station_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE station_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON station_reviews FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert reviews"
  ON station_reviews FOR INSERT
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  charger_type text NOT NULL,
  status text DEFAULT 'confirmed',
  payment_status text DEFAULT 'pending',
  amount numeric(10,2) DEFAULT 0,
  vehicle_number text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bookings"
  ON bookings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update bookings"
  ON bookings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES profiles(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  latitude double precision,
  longitude double precision,
  address text DEFAULT '',
  request_type text DEFAULT 'charging',
  vehicle_type text DEFAULT '',
  description text DEFAULT '',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view emergency requests"
  ON emergency_requests FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert emergency requests"
  ON emergency_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update emergency requests"
  ON emergency_requests FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS station_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, station_id)
);

ALTER TABLE station_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view station managers"
  ON station_managers FOR SELECT
  USING (true);

CREATE POLICY "Anyone can manage station managers"
  ON station_managers FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS reward_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points integer NOT NULL,
  type text NOT NULL DEFAULT 'earned',
  reference_id text DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reward transactions"
  ON reward_transactions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert reward transactions"
  ON reward_transactions FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id uuid,
  p_new_status text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bookings SET status = p_new_status WHERE id = p_booking_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_booking_status TO anon;
GRANT EXECUTE ON FUNCTION public.update_booking_status TO authenticated;

CREATE INDEX IF NOT EXISTS idx_stations_city ON stations(city);
CREATE INDEX IF NOT EXISTS idx_stations_lat_lng ON stations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_station_id ON bookings(station_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_reviews_station_id ON station_reviews(station_id);
CREATE INDEX IF NOT EXISTS idx_reward_tx_user_id ON reward_transactions(user_id);
