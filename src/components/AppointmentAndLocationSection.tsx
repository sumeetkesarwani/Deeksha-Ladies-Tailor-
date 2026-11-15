import { useState, type FormEvent } from 'react';
import { ArrowUpRight, CheckCircle2, Clock, MapPin, Phone } from 'lucide-react';
import type { FittingAppointment, ShopDetails } from '../types.ts';
import { buildAppointmentWhatsAppUrl, validateAppointmentInput } from '../utils/tailoring.ts';

interface AppointmentAndLocationSectionProps {
  shopDetails: ShopDetails;
}

const TIME_SLOTS = [
  'Morning (11:00 AM - 1:00 PM)',
  'Afternoon (1:00 PM - 4:00 PM)',
  'Evening (5:00 PM - 8:30 PM)',
];

export function AppointmentAndLocationSection({ shopDetails }: AppointmentAndLocationSectionProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[2]);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState<{
    appointment: FittingAppointment;
    whatsappUrl: string;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const check = validateAppointmentInput({ name, phone, preferredDate, timeSlot });
    if (!check.valid || !check.normalizedPhone) {
      setError(check.error || 'Please provide a valid name and 10-digit mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: check.normalizedPhone,
          preferredDate: preferredDate || 'Earliest Available',
          timeSlot,
          notes: notes.trim() || 'Stitching consultation',
        }),
      });
      const data = (await res.json()) as { appointment?: FittingAppointment; error?: string };
      if (!res.ok || !data.appointment) {
        setError(data.error || 'Could not save your appointment.');
        return;
      }

      const whatsappUrl = buildAppointmentWhatsAppUrl(shopDetails.whatsappDigits, {
        name: data.appointment.name,
        phone: data.appointment.phone,
        date: data.appointment.preferredDate,
        timeSlot: data.appointment.timeSlot,
        notes: data.appointment.notes,
      });

      setConfirmed({ appointment: data.appointment, whatsappUrl });
      setName('');
      setPhone('');
      setPreferredDate('');
      setNotes('');
    } catch {
      setError('Network error while booking your slot.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="appointment" className="py-16 sm:py-20 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Appointment Booking Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-rose-800">Measurement &amp; Fitting Visit</p>
            <h2 className="font-display text-3xl font-semibold text-stone-950 tracking-tight [text-wrap:balance]">
              Reserve a counter fitting slot.
            </h2>
            <p className="text-sm text-stone-600">
              Your booking goes directly to our boutique register and includes an optional WhatsApp confirmation message.
            </p>
          </div>

          {confirmed && (
            <div role="status" className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Slot reserved for {confirmed.appointment.name} ({confirmed.appointment.preferredDate} ·{' '}
                  {confirmed.appointment.timeSlot})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={confirmed.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <span>Send WhatsApp Confirmation</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setConfirmed(null)}
                  className="text-xs font-semibold text-emerald-900 hover:underline"
                >
                  Book another slot
                </button>
              </div>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="bg-[#FAF8F6] rounded-2xl border border-stone-200 p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="appt-name" className="block text-xs font-semibold text-stone-700 mb-1">
                  Full Name *
                </label>
                <input
                  id="appt-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-rose-800 rounded-lg text-sm outline-none"
                />
              </div>

              <div>
                <label htmlFor="appt-phone" className="block text-xs font-semibold text-stone-700 mb-1">
                  10-Digit Mobile Number *
                </label>
                <input
                  id="appt-phone"
                  type="tel"
                  required
                  maxLength={14}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9831200001"
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-rose-800 rounded-lg text-sm font-mono-tabular outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="appt-date" className="block text-xs font-semibold text-stone-700 mb-1">
                  Preferred Date
                </label>
                <input
                  id="appt-date"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-rose-800 rounded-lg text-sm outline-none"
                />
              </div>

              <div>
                <label htmlFor="appt-time" className="block text-xs font-semibold text-stone-700 mb-1">
                  Preferred Time Slot
                </label>
                <select
                  id="appt-time"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-rose-800 rounded-lg text-sm outline-none"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="appt-notes" className="block text-xs font-semibold text-stone-700 mb-1">
                Garment &amp; Requirements
              </label>
              <input
                id="appt-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 2 Blouses (1 Prince Cut, 1 Alite Cut), need cotton astar"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-rose-800 rounded-lg text-sm outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-rose-700 font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-rose-800 hover:bg-rose-900 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {submitting ? 'Booking Slot...' : 'Confirm Fitting Appointment'}
            </button>
          </form>
        </div>

        {/* Verified Shop Details */}
        <div id="visit-us" className="lg:col-span-6 bg-[#FAF8F6] rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-wide text-rose-800">Counter &amp; Workshop</p>
            <h2 className="font-display text-3xl font-semibold text-stone-950 tracking-tight">
              {shopDetails.businessName}
            </h2>
          </div>

          <dl className="space-y-5 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-rose-800 shrink-0 mt-1" />
              <div>
                <dt className="font-semibold text-stone-900">Boutique Address</dt>
                <dd className="text-stone-600 mt-0.5 leading-relaxed">
                  {shopDetails.address}, {shopDetails.city} – {shopDetails.pincode}, West Bengal
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-rose-800 shrink-0 mt-1" />
              <div>
                <dt className="font-semibold text-stone-900">Opening Hours</dt>
                <dd className="text-stone-600 mt-0.5">{shopDetails.hours}</dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-rose-800 shrink-0 mt-1" />
              <div>
                <dt className="font-semibold text-stone-900">Direct Counter &amp; WhatsApp</dt>
                <dd className="mt-0.5">
                  <a href={`tel:${shopDetails.whatsappDigits}`} className="font-mono-tabular font-semibold text-rose-800 hover:underline">
                    {shopDetails.phone}
                  </a>
                </dd>
              </div>
            </div>
          </dl>

          <div className="pt-4 border-t border-stone-200 flex flex-wrap gap-3">
            <a
              href={shopDetails.googleBusinessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors"
            >
              <span>Google Business Profile</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <a
              href={shopDetails.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-900 text-xs sm:text-sm font-semibold rounded-lg transition-colors"
            >
              <span>Directions on Google Maps</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
