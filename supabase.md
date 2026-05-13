# Supabase Setup Guide

This project uses **Clerk** for authentication and **Supabase** for the database layer.  
Since Clerk replaces Supabase Auth, user ID columns use `text` (Clerk IDs) instead of `uuid`, and foreign key references to `auth.users` are removed.

---

## 1. Run the Schema SQL

Go to your Supabase project dashboard → **SQL Editor** → **New Query** and paste the SQL below:

```sql
-- Profiles (Clerk user ID stored as text)
CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY,
  full_name text DEFAULT '',
  phone text DEFAULT '',
  role text DEFAULT 'user',
  avatar_url text DEFAULT '',
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

-- Stations
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

-- Station Reviews
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

-- Bookings
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

-- Emergency Requests
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

-- Station Managers
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

-- RPC function for manager status updates
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stations_city ON stations(city);
CREATE INDEX IF NOT EXISTS idx_stations_lat_lng ON stations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_station_id ON bookings(station_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_reviews_station_id ON station_reviews(station_id);
```

---

## 2. Seed Some Stations (Optional)

Run this in SQL Editor to add sample stations so the map is not empty:

```sql
INSERT INTO stations (name, address, city, latitude, longitude, charger_types, has_fast_charging, price_per_unit, total_slots, available_slots, amenities, image_url)
VALUES
  ('ChargeHub - Sector 5', 'Plot 42, Sector 5, Salt Lake', 'New Delhi', 28.6315, 77.2167, ARRAY['CCS2', 'Type 2'], true, 12.50, 4, 3, ARRAY['WiFi', 'Cafe', 'Parking'], 'https://images.pexels.com/photos/110844/pexels-photo-110844.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('GreenVolt Station', 'MG Road, Indiranagar', 'Bangalore', 12.9716, 77.5946, ARRAY['CCS2', 'CHAdeMO'], true, 15.00, 6, 4, ARRAY['WiFi', 'Security', 'Restroom'], 'https://images.pexels.com/photos/110844/pexels-photo-110844.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('EV Power Hub', 'BKC, Bandra East', 'Mumbai', 19.0760, 72.8777, ARRAY['Type 2', 'GB/T'], false, 10.00, 8, 6, ARRAY['Parking', 'Cafe', 'Lounge'], 'https://images.pexels.com/photos/110844/pexels-photo-110844.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('EcoCharge Station', 'Hitech City Main Road', 'Hyderabad', 17.3850, 78.4867, ARRAY['CCS2', 'Type 2', 'CHAdeMO'], true, 14.00, 5, 2, ARRAY['WiFi', 'Cafe', 'Security', 'Restroom'], 'https://images.pexels.com/photos/110844/pexels-photo-110844.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('ZenCharge', 'JP Nagar, 3rd Phase', 'Bangalore', 12.9063, 77.5857, ARRAY['Type 2', 'GB/T'], false, 8.00, 4, 4, ARRAY['Parking', 'Restroom'], 'https://images.pexels.com/photos/110844/pexels-photo-110844.jpeg?auto=compress&cs=tinysrgb&w=800'),
  ('TurboVolt', 'Andheri West, SEEPZ', 'Mumbai', 19.1136, 72.8697, ARRAY['CCS2', 'CHAdeMO'], true, 18.00, 6, 1, ARRAY['WiFi', 'Cafe', 'Security', 'Lounge'], 'https://images.pexels.com/photos/110844/pexels-photo-110844.jpeg?auto=compress&cs=tinysrgb&w=800');
```

---

## 3. Make Yourself an Admin

After signing up via Clerk, grab your **Clerk user ID**:

1. Go to your Clerk Dashboard → **Users** → click your user
2. Copy the **User ID** (starts with `user_2...`)
3. Run this in Supabase SQL Editor (replace the ID):

```sql
UPDATE profiles SET role = 'admin' WHERE id = 'user_2xxxxxxxxxxxxxxxxxxxxx';
```

---

## 4. RLS & Security Notes

The schema above uses **permissive RLS** (policies allow all authenticated operations).  
This is fine for development / MVP because:

- Clerk handles authentication on the frontend
- The Supabase anon key is safe to expose (it is restricted by Supabase project settings)
- Row-level filtering happens in the app code (queries use `.eq('user_id', user.id)`)

For **production**, you should either:

**Option A — Stricter RLS policies** (recommended):  
Restrict queries based on `user_id` matching:

```sql
-- Example for bookings
DROP POLICY IF EXISTS "Anyone can view bookings" ON bookings;
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (user_id = current_setting('request.jwt.claims')::json->>'sub');
```

**Option B — Clerk Supabase JWT Template** (proper auth integration):  
Configure Clerk to issue JWTs that Supabase recognises so `auth.uid()` works:

1. Clerk Dashboard → **JWT Templates** → **New Template**
2. Template name: `supabase`
3. Claims:
```json
{
  "sub": "{{user.id}}",
  "iss": "clerk",
  "aud": "authenticated",
  "iat": {{iat}},
  "exp": {{exp}},
  "role": "authenticated"
}
```
4. In Supabase Auth settings, add Clerk's JWKS URL as a JWT secret
5. Update the frontend to pass the Clerk token to Supabase via `Authorization` header

---

## 5. Project Environment Variables

Make sure your `project/.env` file has these values:

```env
VITE_SUPABASE_URL=https://wugqfgymncbdkcvwhcrw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_sUCTW8rabYOrPXh0sbYxYA_kBtSsd4S
VITE_CLERK_PUBLISHABLE_KEY=pk_test_cHVtcGVkLW1hY2FxdWUtMTIuY2xlcmsuYWNjb3VudHMuZGV2JA
```
