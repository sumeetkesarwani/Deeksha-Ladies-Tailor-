import { useState, type FormEvent } from 'react';
import { ArrowUpRight, CheckCircle2, Clock, Search } from 'lucide-react';
import type { ReviewSummary, ShopDetails, TailoringOrder } from '../types.ts';
import { buildOrderInquiryWhatsAppUrl, formatCurrencyINR } from '../utils/tailoring.ts';

interface TrackedOrderResult {
  id: string;
  orderNo: string;
  customerName: string;
  phoneMasked: string;
  items: TailoringOrder['items'];
  totalAmount: number;
  advancePaid: number;
  balance: number;
  deliveryDate: string;
  status: TailoringOrder['status'];
  notes?: string;
}

interface HeroSectionProps {
  shopDetails: ShopDetails;
  reviewSummary: ReviewSummary;
}

export function HeroSection({ shopDetails, reviewSummary }: HeroSectionProps) {
  const [imageError, setImageError] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<TrackedOrderResult[]>([]);

  const handleTrackSubmit = async (e?: FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = (presetQuery ?? query).trim();
    if (!activeQuery) {
      setSearchError('Enter a 10-digit mobile number, Bill No., or customer name.');
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/orders/track?q=${encodeURIComponent(activeQuery)}`);
      const data = (await res.json()) as { orders?: TrackedOrderResult[]; error?: string };
      if (!res.ok) {
        setSearchError(data.error || 'Could not look up order.');
        setResults([]);
      } else {
        setResults(data.orders ?? []);
        setHasSearched(true);
      }
    } catch {
      setSearchError('Unable to reach order registry. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleQuickFill = (sampleQuery: string) => {
    setQuery(sampleQuery);
    void handleTrackSubmit(undefined, sampleQuery);
  };

  return (
    <section id="top" className="border-b border-stone-200 bg-[#FAF8F6]">
      {shopDetails.announcement && (
        <div className="bg-stone-900 text-stone-100 text-xs py-2 px-4 text-center">
          <span>{shopDetails.announcement}</span>
          <span className="mx-2 text-stone-500" aria-hidden="true">·</span>
          <a href={`tel:${shopDetails.whatsappDigits}`} className="font-semibold underline underline-offset-2 hover:text-white">
            Call {shopDetails.phone}
          </a>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6 py-2">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-600 font-medium">
                <span className="whitespace-nowrap">{shopDetails.city} · {shopDetails.landmark}</span>
                <span className="font-semibold text-stone-900 tabular-nums whitespace-nowrap">
                  · {reviewSummary.averageRating.toFixed(1)} / 5 ({reviewSummary.totalReviewsCount} reviews)
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl font-semibold text-stone-950 tracking-tight leading-[1.12] [text-wrap:balance]">
                Bespoke fitting and <span className="italic text-rose-800">atelier precision</span> in every stitch.
              </h1>

              <p className="text-base text-stone-600 leading-relaxed max-w-xl">
                {shopDetails.tagline}. From signature Alite Cut, Prince Cut, and Sabyasachi bridal blouses to custom Salwar Suits and 100+ matching cotton astar shades.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="#appointment"
                  className="px-6 py-3 bg-rose-800 hover:bg-rose-900 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Book Fitting Visit
                </a>
                <a
                  href={shopDetails.googleBusinessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-stone-800 hover:text-rose-800 border border-stone-300 hover:border-rose-300 bg-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Google Business Reviews</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>

              <dl className="grid grid-cols-3 gap-3 sm:gap-6 pt-5 border-t border-stone-200 max-w-lg">
                <div>
                  <dt className="text-[11px] sm:text-xs text-stone-500">Fitting Guarantee</dt>
                  <dd className="text-sm sm:text-lg font-semibold text-stone-900 tabular-nums whitespace-nowrap mt-0.5">16-Point Fit</dd>
                </div>
                <div>
                  <dt className="text-[11px] sm:text-xs text-stone-500">Express Delivery</dt>
                  <dd className="text-sm sm:text-lg font-semibold text-stone-900 tabular-nums whitespace-nowrap mt-0.5">24–48 Hrs</dd>
                </div>
                <div>
                  <dt className="text-[11px] sm:text-xs text-stone-500">Matching Center</dt>
                  <dd className="text-sm sm:text-lg font-semibold text-stone-900 tabular-nums whitespace-nowrap mt-0.5">100+ Shades</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] rounded-2xl overflow-hidden border border-stone-200 bg-stone-200">
              {!imageError ? (
                <img
                  src="/src/assets/images/hero_tailoring_atelier_1794727216987.jpg"
                  alt="Deeksha Ladies Tailor worktable with silk saree fabric, brass shears, measuring tape, and zari trim"
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-rose-100 via-stone-100 to-amber-50 flex flex-col items-center justify-center p-6 text-center">
                  <p className="font-display text-2xl text-stone-800">Deeksha Ladies Tailor</p>
                  <p className="text-sm text-stone-600 mt-1">Rajarhat, Kolkata Atelier</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white">
                <p className="text-xs text-stone-200">
                  {shopDetails.address} · {shopDetails.hours}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width Live Order Tracker row */}
        <div id="track-order" className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-semibold text-stone-950">Track Your Tailoring Order</h2>
              <p className="text-sm text-stone-600">
                Enter your 10-digit phone number or Bill No. to check garment readiness, scheduled pickup date, and balance due.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span>Sample bills:</span>
              <button
                type="button"
                onClick={() => handleQuickFill('101')}
                className="font-mono-tabular font-semibold text-rose-800 hover:underline"
              >
                #101
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => handleQuickFill('102')}
                className="font-mono-tabular font-semibold text-rose-800 hover:underline"
              >
                #102
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => handleQuickFill('103')}
                className="font-mono-tabular font-semibold text-rose-800 hover:underline"
              >
                #103
              </button>
            </div>
          </div>

          <form onSubmit={(e) => void handleTrackSubmit(e)} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <label htmlFor="order-tracker-input" className="sr-only">
                10-digit mobile number, Bill No., or customer name
              </label>
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="order-tracker-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter 10-digit mobile number or Bill No. (e.g. 101 or 9831200001)"
                className="w-full pl-10 pr-4 py-2.5 border border-stone-300 focus:border-rose-800 rounded-lg text-sm text-stone-900 outline-none focus-visible:ring-2 focus-visible:ring-rose-800/20"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {searching ? 'Checking...' : 'Check Status'}
            </button>
          </form>

          {searchError && (
            <p role="alert" className="text-sm text-rose-700 font-medium">
              {searchError}
            </p>
          )}

          {hasSearched && results.length === 0 && !searchError && (
            <div className="pt-4 border-t border-stone-200 text-sm text-stone-600">
              No active bill matched <strong className="text-stone-900">{query}</strong>. Double-check your Bill No. or call our counter at{' '}
              <a href={`tel:${shopDetails.whatsappDigits}`} className="font-semibold text-rose-800 hover:underline">
                {shopDetails.phone}
              </a>
              .
            </div>
          )}

          {results.length > 0 && (
            <div className="pt-4 border-t border-stone-200 divide-y divide-stone-200">
              {results.map((order) => {
                const isCleared = order.balance <= 0;
                return (
                  <div key={order.id} className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-mono-tabular font-semibold text-stone-950">Bill #{order.orderNo}</span>
                        <span aria-hidden="true" className="text-stone-400">·</span>
                        <span className="font-medium text-stone-800">{order.customerName}</span>
                        <span aria-hidden="true" className="text-stone-400">·</span>
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            order.status === 'Ready'
                              ? 'text-emerald-700'
                              : order.status === 'Delivered'
                                ? 'text-stone-600'
                                : 'text-amber-700'
                          }`}
                        >
                          {order.status === 'Ready' || order.status === 'Delivered' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          {order.status}
                        </span>
                      </div>

                      <ul className="text-xs text-stone-600 space-y-1">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-2">
                            <span>
                              {item.desc} (Qty: {item.qty})
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className={item.isDelivered ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                              {item.isDelivered ? 'Ready' : 'In Stitching'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-xs">
                      <div>
                        <span className="text-stone-500 block">Pickup Date</span>
                        <span className="font-mono-tabular font-semibold text-stone-900">{order.deliveryDate}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block">Balance Due</span>
                        <span className={`font-mono-tabular font-semibold ${isCleared ? 'text-emerald-700' : 'text-rose-800'}`}>
                          {isCleared ? '₹0 (Cleared)' : formatCurrencyINR(order.balance)}
                        </span>
                      </div>
                      <a
                        href={buildOrderInquiryWhatsAppUrl(shopDetails.whatsappDigits, order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 border border-stone-300 hover:border-stone-400 rounded-lg font-semibold text-stone-800 hover:bg-stone-50 transition-colors whitespace-nowrap"
                      >
                        WhatsApp Inquiry
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
