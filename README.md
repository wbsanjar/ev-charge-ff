# ChargeEV - EV Charging Station & Slot Booking Platform

A React + TypeScript web application for finding, booking, and managing EV charging stations across India.

## Tech Stack

- **React 18** — UI library
- **TypeScript** — Language
- **Vite 5** — Build tool / dev server
- **Tailwind CSS 3** — Styling
- **Supabase** — Backend (auth, database)
- **jsPDF** — PDF receipt generation
- **Leaflet** — Interactive maps
- **Lucide React** — Icons

## Pages

| Route | Page | Description |
|---|---|---|
| `home` | HomePage | Landing page with hero, search, popular stations |
| `map` | MapPage | Interactive map with station markers + sidebar list |
| — | StationDetailPage | Station details, amenities, reviews |
| `booking` | BookingPage | Multi-step booking (date/time, charger, confirm) |
| `dashboard` | DashboardPage | User bookings, profile settings |
| `admin` | AdminPage | Manage stations, bookings, emergencies |
| `manager` | ManagerDashboardPage | Station managers view bookings at their stations |

## Recent Changes & Activities

### 1. Booking Receipt — Frontend Only
- Removed Supabase database dependency from `BookingPage.tsx`
- `confirmBooking()` now generates a local booking object with `crypto.randomUUID()` → replaced with `generateId()` using `Math.random()` for cross-device compatibility
- Removed `useAuth` and `supabase` imports from booking flow
- Removed `onAuthClick` prop — no auth required to book
- Removed `fetchBookedSlots()` / `isSlotBooked()` — all time slots always available
- **Files affected:** `src/pages/BookingPage.tsx`, `src/App.tsx`

### 2. Skeleton Loading — Full Website
Added dynamic skeleton loaders (`animate-pulse`) across all pages to show during data fetching:

| Page | What skeletons show | Trigger |
|---|---|---|
| **HomePage** | 6 station cards (image + text placeholders) | `stationsLoading` — stations fetch |
| **MapPage** | 6 sidebar list items (icon + text lines) | `stationsLoading` — stations fetch |
| **StationDetailPage** | 3 review cards (avatar + comment lines) | `reviewsLoading` — reviews fetch |
| **DashboardPage** | 3 booking cards (header + rows + price) | `loading` — bookings fetch |
| **AdminPage** | Tab-specific: stat cards, station rows, booking rows, emergency cards | `loading` — 3 parallel fetches |
| **Navbar** | Avatar circle + name placeholder (right side) | `authLoading` from AuthContext |
| **BookingPage** | Full receipt-shaped skeleton (2s simulated delay) | `loading` on confirm booking |

- **Files affected:** `src/pages/HomePage.tsx`, `src/pages/MapPage.tsx`, `src/pages/StationDetailPage.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/AdminPage.tsx`, `src/components/Navbar.tsx`

### 3. Station Manager Role System — Frontend Only
Added a hardcoded manager authentication and dashboard:

- **Hardcoded credentials** (in `App.tsx`):
  - Email: `123456@gmail.com`
  - Password: `123456`
- **Manager login button** in navbar (visible to all users)
- **Manager Dashboard** (`ManagerDashboardPage.tsx`):
  - Shows 3 managed stations with mock booking data
  - Displays: customer name, phone, vehicle number, date, time, charger type, amount, status
  - Search by customer name / vehicle / booking ID
  - Status filter (All / Confirmed / Completed / Cancelled)
  - Collapsible station accordion sections
  - Stats cards: managed stations, total bookings, active, revenue
  - Sign Out button in header
- **Navbar** shows "Manager Dashboard" link in user menu when manager is logged in
- **Role type** `'manager'` added to `Profile` type

- **Files created:** `src/pages/
DashboardPage.tsx`
- **Files affected:** `src/App.tsx`, `src/components/Navbar.tsx`, `src/lib/supabase.ts`
- **SQL migration updated:** `supabase/migrations/20260507155637_ev_charging_schema.sql` — added `station_managers` table, fixed RLS recursion on admin profile policy

### 4. RLS Policy Fix
- Fixed infinite recursion in `"Admins can view all profiles"` policy by using a security definer function pattern
- **File affected:** `supabase/migrations/20260507155637_ev_charging_schema.sql`

## Getting Started

```bash
npm install
npm run dev
```

To access from other devices on the same network:
```bash
npm run dev -- --host
```

### Environment Variables

Create a `.env` file:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
