import { jsPDF } from 'jspdf';
import { X, Zap, Download, CheckCircle } from 'lucide-react';
import { Booking, Station } from '../lib/supabase';

type Props = {
  booking: Booking;
  station: Station;
  duration: number;
  onClose: () => void;
  onBackToHome: () => void;
};

function formatTime(timeStr: string) {
  return timeStr.slice(0, 5);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function generateReceiptPDF(booking: Booking, station: Station, duration: number) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129);
  doc.text('CHARGE EV', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('EV Charging Station Booking Receipt', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setDrawColor(200);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(60);

  function row(label: string, value: string) {
    doc.text(label, 20, y);
    doc.text(value, pageWidth - 20, y, { align: 'right' });
    y += 7;
  }

  row('Booking ID', `#${booking.id.slice(-8).toUpperCase()}`);
  row('Booking Date', formatDate(booking.booking_date));
  row('Station', station.name);
  row('Address', `${station.address}, ${station.city}`);
  row('Date', booking.booking_date);
  row('Time', `${formatTime(booking.start_time)} - ${formatTime(booking.end_time)} (${duration}h)`);
  row('Charger Type', booking.charger_type);
  row('Status', booking.status.charAt(0).toUpperCase() + booking.status.slice(1));
  row('Payment', booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1));
  if (booking.vehicle_number) {
    row('Vehicle', booking.vehicle_number);
  }

  y += 5;
  doc.setDrawColor(200);
  doc.line(20, y, pageWidth - 20, y);
  y += 8;

  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Amount: Rs. ${booking.amount.toFixed(0)}`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for choosing Charge EV!', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text('Please arrive 5 minutes early for your charging session.', pageWidth / 2, y, { align: 'center' });

  doc.save(`receipt_${booking.id.slice(-8).toUpperCase()}.pdf`);
}

export default function BookingReceiptModal({ booking, station, duration, onClose, onBackToHome }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">ChargeEV</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-100" />
            <div>
              <h2 className="text-xl font-bold">Booking Confirmed!</h2>
              <p className="text-emerald-100 text-sm">Your slot is reserved</p>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Booking ID</span>
              <span className="font-mono font-bold text-emerald-600">#{booking.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Station</span>
              <span className="font-semibold text-right max-w-[55%]">{station.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Address</span>
              <span className="font-semibold text-right max-w-[55%]">{station.address}, {station.city}</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date</span>
              <span className="font-semibold">{booking.booking_date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Time</span>
              <span className="font-semibold">{formatTime(booking.start_time)} - {formatTime(booking.end_time)} ({duration}h)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Charger</span>
              <span className="font-semibold">{booking.charger_type}</span>
            </div>
            {booking.vehicle_number && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Vehicle</span>
                <span className="font-semibold uppercase">{booking.vehicle_number}</span>
              </div>
            )}
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">{booking.status}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">{booking.payment_status}</span>
            </div>
          </div>

          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4 flex items-center justify-between">
            <span className="text-emerald-700 font-medium text-sm">Total Amount</span>
            <span className="text-2xl font-black text-emerald-700">Rs. {booking.amount.toFixed(0)}</span>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => generateReceiptPDF(booking, station, duration)}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Receipt (PDF)
            </button>
            <button
              onClick={onBackToHome}
              className="w-full py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
