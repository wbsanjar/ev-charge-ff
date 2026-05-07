import { useState, useEffect } from 'react';
import { MapPin, Zap, Star, Clock, ChevronLeft, Navigation, Wifi, Coffee, Car, Shield, Users, Send, ChevronRight } from 'lucide-react';
import { supabase, Station, Review, Profile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Page = 'home' | 'map' | 'booking' | 'dashboard' | 'admin';

type Props = {
  station: Station;
  onBack: () => void;
  onBook: (station: Station) => void;
  onNavigate: (page: Page) => void;
  onAuthClick: () => void;
};

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi: <Wifi className="w-4 h-4" />,
  Cafe: <Coffee className="w-4 h-4" />,
  Parking: <Car className="w-4 h-4" />,
  Security: <Shield className="w-4 h-4" />,
  Restroom: <Users className="w-4 h-4" />,
  Lounge: <Clock className="w-4 h-4" />,
};

type ReviewWithProfile = Review & { profiles: Profile };

export default function StationDetailPage({ station, onBack, onBook, onAuthClick }: Props) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station.id]);

  async function fetchReviews() {
    const { data } = await supabase
      .from('station_reviews')
      .select('*, profiles(full_name, avatar_url)')
      .eq('station_id', station.id)
      .order('created_at', { ascending: false });
    if (data) {
      setReviews(data as ReviewWithProfile[]);
      if (data.length > 0) {
        setAvgRating(data.reduce((s, r) => s + r.rating, 0) / data.length);
      }
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { onAuthClick(); return; }
    setSubmitting(true);
    await supabase.from('station_reviews').insert({
      station_id: station.id,
      user_id: user.id,
      rating: newRating,
      comment: newComment,
    });
    setNewComment('');
    setNewRating(5);
    await fetchReviews();
    setSubmitting(false);
  }

  const availabilityPct = (station.available_slots / station.total_slots) * 100;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Image */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <img
          src={station.image_url || 'https://images.pexels.com/photos/110844/pexels-photo-110844.jpeg?auto=compress&cs=tinysrgb&w=1600'}
          alt={station.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <button onClick={onBack} className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur rounded-xl flex items-center justify-center shadow-md hover:bg-white transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-1">{station.name}</h1>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{station.address}, {station.city}</span>
              </div>
            </div>
            {station.has_fast_charging && (
              <div className="flex items-center gap-1.5 bg-amber-400 text-amber-900 px-3 py-1.5 rounded-full font-bold text-sm shadow">
                <Zap className="w-4 h-4" /> Fast
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                <div className="text-2xl font-black text-emerald-600">₹{station.price_per_unit}</div>
                <div className="text-xs text-gray-500 mt-1">per kWh</div>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                <div className={`text-2xl font-black ${station.available_slots > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {station.available_slots}
                </div>
                <div className="text-xs text-gray-500 mt-1">slots free</div>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                <div className="text-2xl font-black text-amber-500 flex items-center justify-center gap-1">
                  <Star className="w-5 h-5 fill-amber-400" />
                  {avgRating > 0 ? avgRating.toFixed(1) : 'New'}
                </div>
                <div className="text-xs text-gray-500 mt-1">{reviews.length} reviews</div>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                <div className="text-2xl font-black text-blue-600">{station.total_slots}</div>
                <div className="text-xs text-gray-500 mt-1">total slots</div>
              </div>
            </div>

            {/* Availability Bar */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">Live Availability</h3>
                <span className={`text-sm font-semibold ${station.available_slots > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {station.available_slots > 0 ? 'Available Now' : 'All Full'}
                </span>
              </div>
              <div className="flex gap-2">
                {Array.from({ length: station.total_slots }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-8 rounded-lg transition-colors ${i < station.available_slots ? 'bg-emerald-100 border-2 border-emerald-300' : 'bg-red-100 border-2 border-red-300'}`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-300 inline-block" /> Free</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-300 inline-block" /> Occupied</span>
                <span>{Math.round(availabilityPct)}% available</span>
              </div>
            </div>

            {/* Charger Types */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Charger Types</h3>
              <div className="flex flex-wrap gap-3">
                {station.charger_types.map(type => (
                  <div key={type} className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">{type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            {station.amenities.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {station.amenities.map(a => (
                    <div key={a} className="flex items-center gap-2 text-gray-700 text-sm bg-gray-50 px-3 py-2.5 rounded-xl">
                      <span className="text-gray-500">{AMENITY_ICONS[a] || <Shield className="w-4 h-4" />}</span>
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Reviews & Ratings</h3>

              {/* Add review */}
              <form onSubmit={submitReview} className="mb-6 bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Leave a review</p>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" onClick={() => setNewRating(s)}>
                      <Star className={`w-6 h-6 transition-colors ${s <= newRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder={user ? "Share your experience..." : "Sign in to leave a review"}
                    disabled={!user}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                  />
                  <button type="submit" disabled={submitting || !user} className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {reviews.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No reviews yet. Be the first!</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r.id} className="flex gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                          {(r.profiles?.full_name || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">{r.profiles?.full_name || 'User'}</span>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                        <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white">
                <div className="text-3xl font-black mb-1">₹{station.price_per_unit}<span className="text-lg font-normal">/kWh</span></div>
                <p className="text-emerald-100 text-sm">Secure slot now</p>
              </div>
              <div className="p-5">
                <div className="space-y-3 mb-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Available</span>
                    <span className={`font-semibold ${station.available_slots > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {station.available_slots} of {station.total_slots} slots
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Fast Charging</span>
                    <span className={`font-semibold ${station.has_fast_charging ? 'text-amber-600' : 'text-gray-400'}`}>
                      {station.has_fast_charging ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">City</span>
                    <span className="font-semibold text-gray-700">{station.city}</span>
                  </div>
                </div>

                <button
                  onClick={() => onBook(station)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md hover:shadow-emerald-200 mb-3"
                >
                  Book a Slot <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => window.open(`https://maps.google.com?q=${station.latitude},${station.longitude}`, '_blank')}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Navigation className="w-4 h-4" /> Get Directions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
