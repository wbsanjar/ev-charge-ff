import { useState, useEffect } from 'react';
import { Calendar, Clock, Car, Zap, ChevronRight, CheckCircle, MapPin, ArrowLeft } from 'lucide-react';
import { supabase, Station, Booking } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Props = {
  selectedStation: Station | null;
  onAuthClick: () => void;
  onBack: () => void;
};

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
];

export default function BookingPage({ selectedStation, onAuthClick, onBack }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [chargerType, setChargerType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [duration, setDuration] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<Booking[]>([]);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  useEffect(() => {
    if (selectedStation) setChargerType(selectedStation.charger_types[0] || '');
  }, [selectedStation]);

  useEffect(() => {
    if (selectedStation && bookingDate) fetchBookedSlots();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStation, bookingDate]);

  async function fetchBookedSlots() {
    if (!selectedStation || !bookingDate) return;
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('station_id', selectedStation.id)
      .eq('booking_date', bookingDate)
      .eq('status', 'confirmed');
    if (data) setBookedSlots(data);
  }

  function isSlotBooked(time: string) {
    return bookedSlots.some(b => b.start_time === `${time}:00`);
  }

  function getEndTime(start: string, dur: number) {
    const [h, m] = start.split(':').map(Number);
    const endH = h + dur;
    return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const totalAmount = selectedStation ? selectedStation.price_per_unit * 7.4 * duration : 0;

  async function confirmBooking() {
    if (!user || !selectedStation) { onAuthClick(); return; }
    setLoading(true);
    const endTime = getEndTime(startTime, duration);
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        station_id: selectedStation.id,
        booking_date: bookingDate,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
        charger_type: chargerType,
        vehicle_number: vehicleNumber,
        amount: totalAmount,
        status: 'confirmed',
        payment_status: 'pending',
      })
      .select()
      .single();
    if (!error && data) {
      setConfirmedBooking(data);
      setStep(4);
    }
    setLoading(false);
  }

  if (!selectedStation) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Select a Station First</h2>
          <p className="text-gray-500 mb-6">Browse our map to find and select a charging station before booking.</p>
          <button onClick={onBack} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
            Find Stations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back button */}
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to stations
        </button>

        {/* Station header */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">{selectedStation.name}</h2>
              <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{selectedStation.address}, {selectedStation.city}</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-emerald-600 font-semibold text-sm">₹{selectedStation.price_per_unit}/unit</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedStation.available_slots > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {selectedStation.available_slots} slots free
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Steps indicator */}
        {step < 4 && (
          <div className="flex items-center mb-8">
            {[1, 2, 3].map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                <div className="ml-2 mr-2 flex-1">
                  <p className={`text-xs font-medium ${step >= s ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {['Date & Time', 'Charger', 'Confirm'][i]}
                  </p>
                </div>
                {i < 2 && <div className={`h-px flex-1 mx-2 ${step > s ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Date & Time */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" /> Select Date
            </h3>
            <input
              type="date"
              min={today}
              max={maxDate}
              value={bookingDate}
              onChange={e => setBookingDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {bookingDate && (
              <>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" /> Select Time Slot
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(time => {
                    const booked = isSlotBooked(time);
                    const selected = startTime === time;
                    return (
                      <button
                        key={time}
                        disabled={booked}
                        onClick={() => setStartTime(time)}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                          selected ? 'bg-emerald-600 text-white border-emerald-600' :
                          booked ? 'bg-red-50 text-red-400 border-red-100 cursor-not-allowed' :
                          'border-gray-200 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>

                {startTime && (
                  <>
                    <h3 className="text-base font-bold text-gray-900">Duration</h3>
                    <div className="flex items-center gap-4">
                      {[1, 2, 3, 4].map(d => (
                        <button
                          key={d}
                          onClick={() => setDuration(d)}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${duration === d ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-700 hover:border-emerald-400'}`}
                        >
                          {d}h
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!bookingDate || !startTime}
              className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: Charger & Vehicle */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" /> Charger Type
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {selectedStation.charger_types.map(type => (
                <button
                  key={type}
                  onClick={() => setChargerType(type)}
                  className={`flex items-center gap-2 p-3.5 rounded-xl border-2 text-sm font-semibold transition-all ${chargerType === type ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-emerald-300'}`}
                >
                  <Zap className="w-4 h-4" /> {type}
                </button>
              ))}
            </div>

            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Car className="w-5 h-5 text-emerald-600" /> Vehicle Number (optional)
            </h3>
            <input
              type="text"
              placeholder="e.g. MH 01 AB 1234"
              value={vehicleNumber}
              onChange={e => setVehicleNumber(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
            />

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!chargerType}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                Review <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Booking Summary</h3>

            <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
              {[
                { label: 'Station', value: selectedStation.name },
                { label: 'Date', value: new Date(bookingDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                { label: 'Time', value: `${startTime} - ${getEndTime(startTime, duration)} (${duration}h)` },
                { label: 'Charger', value: chargerType },
                { label: 'Vehicle', value: vehicleNumber || 'Not specified' },
                { label: 'Est. Energy', value: `~${(7.4 * duration).toFixed(1)} kWh` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-900 text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4 flex items-center justify-between">
              <div>
                <span className="text-emerald-700 text-sm font-medium">Estimated Cost</span>
                <p className="text-xs text-emerald-500">₹{selectedStation.price_per_unit}/unit × {(7.4 * duration).toFixed(1)} kWh</p>
              </div>
              <span className="text-2xl font-black text-emerald-700">₹{totalAmount.toFixed(0)}</span>
            </div>

            {!user && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
                Please sign in to confirm your booking.
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Back
              </button>
              <button
                onClick={user ? confirmBooking : onAuthClick}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? 'Confirming...' : user ? 'Confirm Booking' : 'Sign In to Book'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && confirmedBooking && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-500 mb-6">Your slot is reserved. Arrive 5 minutes early to get started.</p>

            <div className="bg-gray-50 rounded-xl p-5 mb-6 text-left space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Booking ID</span>
                <span className="font-mono font-bold text-emerald-600">#{confirmedBooking.id.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Station</span>
                <span className="font-semibold">{selectedStation.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date & Time</span>
                <span className="font-semibold">{bookingDate} at {startTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-black text-emerald-600">₹{totalAmount.toFixed(0)}</span>
              </div>
            </div>

            <button onClick={onBack} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-700 transition-all">
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
