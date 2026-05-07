import { useState } from 'react';
import { X, AlertTriangle, Phone, MapPin, Zap, Wrench, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Props = { onClose: () => void };

const REQUEST_TYPES = [
  { value: 'charging', label: 'Emergency Charging', icon: Zap, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'mechanic', label: 'Roadside Mechanic', icon: Wrench, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'towing', label: 'Towing Service', icon: Truck, color: 'text-orange-600 bg-orange-50 border-orange-200' },
];

export default function EmergencyModal({ onClose }: Props) {
  const { user, profile } = useAuth();
  const [requestType, setRequestType] = useState('charging');
  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  function detectLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAddress(`Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setAddress('Location detection failed - please enter manually');
      }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone) return;
    setLoading(true);
    const { error } = await supabase.from('emergency_requests').insert({
      user_id: user?.id || null,
      contact_name: name,
      contact_phone: phone,
      latitude: coords?.lat || null,
      longitude: coords?.lng || null,
      address,
      request_type: requestType,
      vehicle_type: vehicleType,
      description,
    });
    setLoading(false);
    if (!error) setSuccess(true);
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Help is on the way!</h3>
          <p className="text-gray-500 mb-6">Your emergency request has been submitted. Our team will contact you at <strong>{phone}</strong> shortly.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-amber-800 text-sm font-medium">While you wait:</p>
            <ul className="mt-2 space-y-1 text-amber-700 text-sm list-disc list-inside">
              <li>Stay with your vehicle</li>
              <li>Turn on hazard lights</li>
              <li>Keep your phone charged</li>
            </ul>
          </div>
          <button onClick={onClose} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-br from-red-500 to-rose-600 p-5 text-white sticky top-0 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Emergency Help</h2>
                <p className="text-red-100 text-sm">We'll dispatch help immediately</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Request Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">What do you need?</label>
            <div className="grid grid-cols-3 gap-2">
              {REQUEST_TYPES.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRequestType(value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-xs font-medium ${requestType === value ? color : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Your Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="Full name"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+91 XXXXX XXXXX"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Location</label>
            <div className="flex gap-2">
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter your location"
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              <button type="button" onClick={detectLocation} disabled={locating}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-xl text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap disabled:opacity-60">
                <MapPin className="w-3.5 h-3.5" />
                {locating ? 'Locating...' : 'Auto Detect'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle Type</label>
              <input value={vehicleType} onChange={e => setVehicleType(e.target.value)} placeholder="e.g. Tata Nexon EV"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-3.5 rounded-xl font-bold hover:from-red-600 hover:to-rose-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {loading ? 'Sending Request...' : 'Send Emergency Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
