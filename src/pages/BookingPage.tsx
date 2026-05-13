import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Zap,
  CheckCircle,
  MapPin,
  ArrowLeft,
} from 'lucide-react';

import { supabase, Station, Booking } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BookingReceiptModal from '../components/BookingReceiptModal';

type Props = {
  selectedStation: Station | null;
  onBack: () => void;
};

const TIME_SLOTS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
];

export default function BookingPage({
  selectedStation,
  onBack,
}: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [chargerType, setChargerType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [duration, setDuration] = useState(1);

  const [loading, setLoading] = useState(false);

  const [confirmedBooking, setConfirmedBooking] =
    useState<Booking | null>(null);

  const [showPopup, setShowPopup] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const maxDate = new Date(Date.now() + 7 * 86400000)
    .toISOString()
    .split('T')[0];

  useEffect(() => {
    if (selectedStation) {
      setChargerType(selectedStation.charger_types[0] || '');
    }
  }, [selectedStation]);

  function getEndTime(start: string, dur: number) {
    const [hours, minutes] = start.split(':').map(Number);

    const endHour = hours + dur;

    return `${String(endHour).padStart(2, '0')}:${String(
      minutes
    ).padStart(2, '0')}`;
  }

  const totalAmount = selectedStation
    ? selectedStation.price_per_unit * 7.4 * duration
    : 0;

  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  async function confirmBooking() {
    if (!selectedStation) return;

    setLoading(true);
    setShowPopup(false);

    const endTime = getEndTime(startTime, duration);

    const { data: inserted, error } = await supabase.from('bookings').insert({
      user_id: user?.id || 'guest',
      station_id: selectedStation.id,
      booking_date: bookingDate,
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      charger_type: chargerType,
      vehicle_number: vehicleNumber,
      amount: totalAmount,
      status: 'confirmed',
      payment_status: 'pending',
    }).select().single();

    if (error) {
      console.error('Booking failed:', error);
      setLoading(false);
      return;
    }

    const localBooking: Booking = inserted || {
      id: generateId(),
      user_id: user?.id || 'guest',
      station_id: selectedStation.id,
      booking_date: bookingDate,
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      charger_type: chargerType,
      vehicle_number: vehicleNumber,
      amount: totalAmount,
      status: 'confirmed',
      payment_status: 'pending',
      created_at: new Date().toISOString(),
    };

    setConfirmedBooking(localBooking);
    setShowPopup(true);

    setTimeout(() => {
      setShowPopup(false);
      setLoading(false);
      setStep(4);
    }, 2000);
  }

  if (!selectedStation) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-10 h-10 text-emerald-600" />
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Select a Station First
          </h2>

          <p className="text-gray-500 mb-6">
            Browse our map to find and select a charging station
            before booking.
          </p>

          <button
            onClick={onBack}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            Find Stations
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* BACK BUTTON */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to stations
          </button>

          {/* STATION CARD */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-start gap-4">

              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-7 h-7 text-emerald-600" />
              </div>

              <div>
                <h2 className="text-lg font-black text-gray-900">
                  {selectedStation.name}
                </h2>

                <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {selectedStation.address},{' '}
                    {selectedStation.city}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <span className="text-emerald-600 font-semibold text-sm">
                    ₹{selectedStation.price_per_unit}/unit
                  </span>

                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      selectedStation.available_slots > 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {selectedStation.available_slots} slots free
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP INDICATOR */}
          {step < 4 && (
            <div className="flex items-center mb-8">
              {[1, 2, 3].map((s, i) => (
                <div
                  key={s}
                  className="flex items-center flex-1 last:flex-none"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      step >= s
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {step > s ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      s
                    )}
                  </div>

                  <div className="ml-2 mr-2 flex-1">
                    <p
                      className={`text-xs font-medium ${
                        step >= s
                          ? 'text-emerald-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {['Date & Time', 'Charger', 'Confirm'][i]}
                    </p>
                  </div>

                  {i < 2 && (
                    <div
                      className={`h-px flex-1 mx-2 ${
                        step > s
                          ? 'bg-emerald-300'
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Select Date
              </h3>

              <input
                type="date"
                min={today}
                max={maxDate}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {bookingDate && (
                <>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    Select Time Slot
                  </h3>

                  <div className="grid grid-cols-4 gap-2">
                    {TIME_SLOTS.map((time) => {
                      const selected = startTime === time;

                      return (
                        <button
                          key={time}
                          onClick={() => setStartTime(time)}
                          className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                            selected
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'border-gray-200 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>

                  {startTime && (
                    <>
                      <h3 className="text-base font-bold text-gray-900">
                        Duration
                      </h3>

                      <div className="flex items-center gap-4">
                        {[1, 2, 3, 4].map((d) => (
                          <button
                            key={d}
                            onClick={() => setDuration(d)}
                            className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
                              duration === d
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'border-gray-200 text-gray-700 hover:border-emerald-400'
                            }`}
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
                className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

              <h3 className="text-lg font-bold text-gray-900">
                Charger Type
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {selectedStation.charger_types.map((type) => (
                  <button
                    key={type}
                    onClick={() => setChargerType(type)}
                    className={`p-3 rounded-xl border ${
                      chargerType === type
                        ? 'bg-emerald-50 border-emerald-500'
                        : 'border-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Vehicle Number"
                value={vehicleNumber}
                onChange={(e) =>
                  setVehicleNumber(e.target.value)
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl"
                >
                  Back
                </button>

                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl"
                >
                  Review
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

              <h2 className="text-2xl font-black">
                Booking Summary
              </h2>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">

                <div className="flex justify-between">
                  <span>Station</span>
                  <span>{selectedStation.name}</span>
                </div>

                <div className="flex justify-between">
                  <span>Date</span>
                  <span>{bookingDate}</span>
                </div>

                <div className="flex justify-between">
                  <span>Time</span>
                  <span>
                    {startTime} -{' '}
                    {getEndTime(startTime, duration)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Amount</span>
                  <span className="font-bold text-emerald-600">
                    ₹{totalAmount.toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">

                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl"
                >
                  Back
                </button>

                <button
                  onClick={confirmBooking}
                  disabled={loading}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold"
                >
                  {loading
                    ? 'Confirming...'
                    : 'Confirm Booking'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SKELETON LOADING OVERLAY */}
      {loading && !showPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-pulse">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/30 rounded-lg" />
                  <div className="h-5 w-24 bg-white/30 rounded" />
                </div>
                <div className="w-8 h-8 bg-white/30 rounded-lg" />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-6 h-6 bg-white/30 rounded-full" />
                <div className="space-y-2">
                  <div className="h-5 w-44 bg-white/30 rounded" />
                  <div className="h-3 w-28 bg-white/30 rounded" />
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                ))}
                <div className="h-px bg-gray-200" />
                <div className="flex justify-between">
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-5 w-16 bg-gray-200 rounded-full" />
                </div>
              </div>
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                <div className="h-4 w-24 bg-emerald-200 rounded" />
                <div className="h-7 w-20 bg-emerald-200 rounded" />
              </div>
              <div className="mt-6 space-y-3">
                <div className="h-12 w-full bg-gray-200 rounded-xl" />
                <div className="h-12 w-full bg-gray-100 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS POPUP */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">

          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-scaleIn shadow-2xl">

            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>

            <h2 className="text-2xl font-black text-gray-900 mb-2">
              Booking Confirmed
            </h2>

            <p className="text-gray-500 mb-5">
              Your EV charging slot has been booked
              successfully.
            </p>

            <div className="bg-emerald-50 rounded-2xl p-4 text-left space-y-2 mb-5">

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Station</span>
                <span className="font-semibold">
                  {selectedStation.name}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Time</span>
                <span className="font-semibold">
                  {startTime} -{' '}
                  {getEndTime(startTime, duration)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-emerald-600">
                  ₹{totalAmount.toFixed(0)}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowPopup(false);
                setStep(4);
              }}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition"
            >
              View Receipt
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {step === 4 && confirmedBooking && (
        <BookingReceiptModal
          booking={confirmedBooking}
          station={selectedStation}
          duration={duration}
          onClose={() => setStep(3)}
          onBackToHome={onBack}
        />
      )}
    </>
  );
}