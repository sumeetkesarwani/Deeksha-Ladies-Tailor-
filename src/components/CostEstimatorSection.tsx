import { useMemo, useState } from 'react';
import {
  ADDON_OPTIONS,
  GARMENT_OPTIONS,
  TURNAROUND_OPTIONS,
  calculateStitchingEstimate,
  formatCurrencyINR,
} from '../utils/tailoring.ts';
import type { ShopDetails } from '../types.ts';

interface CostEstimatorSectionProps {
  shopDetails: ShopDetails;
}

export function CostEstimatorSection({ shopDetails }: CostEstimatorSectionProps) {
  const [garmentId, setGarmentId] = useState<string>(GARMENT_OPTIONS[0].id);
  const [turnaroundId, setTurnaroundId] = useState<string>(TURNAROUND_OPTIONS[0].id);
  const [addonIds, setAddonIds] = useState<string[]>([]);

  const estimate = useMemo(
    () =>
      calculateStitchingEstimate({
        garmentId,
        turnaroundId,
        addonIds,
        whatsappDigits: shopDetails.whatsappDigits,
      }),
    [garmentId, turnaroundId, addonIds, shopDetails.whatsappDigits],
  );

  const toggleAddon = (id: string) => {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <section id="estimator" className="py-16 sm:py-20 border-b border-stone-200 bg-white">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 space-y-8">
        <div className="space-y-2 text-center max-w-xl mx-auto">
          <p className="text-xs font-semibold tracking-wide text-rose-800">Transparent Pricing</p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-stone-950 tracking-tight [text-wrap:balance]">
            Instant Stitching Cost Estimator
          </h2>
          <p className="text-sm sm:text-base text-stone-600">
            Select your garment cut, turnaround speed, and design add-ons to estimate stitching charges before visiting the counter.
          </p>
        </div>

        <div className="bg-[#FAF8F6] rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="est-garment" className="block text-xs font-semibold text-stone-700">
                1. Garment Type
              </label>
              <select
                id="est-garment"
                value={garmentId}
                onChange={(e) => setGarmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-rose-800 rounded-lg text-sm font-medium text-stone-900 outline-none"
              >
                {GARMENT_OPTIONS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {formatCurrencyINR(g.basePrice)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="est-speed" className="block text-xs font-semibold text-stone-700">
                2. Turnaround Speed
              </label>
              <select
                id="est-speed"
                value={turnaroundId}
                onChange={(e) => setTurnaroundId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 focus:border-rose-800 rounded-lg text-sm font-medium text-stone-900 outline-none"
              >
                {TURNAROUND_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.fee > 0 ? `(+${formatCurrencyINR(t.fee)})` : '· Regular'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-stone-200">
            <span className="block text-xs font-semibold text-stone-700">3. Design Add-Ons &amp; Linings</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {ADDON_OPTIONS.map((addon) => {
                const checked = addonIds.includes(addon.id);
                return (
                  <label
                    key={addon.id}
                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm cursor-pointer transition-colors ${
                      checked
                        ? 'bg-rose-50 border-rose-300 text-stone-950 font-semibold'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAddon(addon.id)}
                        className="w-4 h-4 accent-rose-800 rounded"
                      />
                      <span>{addon.label}</span>
                    </span>
                    <span className="font-mono-tabular text-xs text-stone-500">+{formatCurrencyINR(addon.price)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-5 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-rose-800">Estimated Stitching Total</p>
              <p className="text-sm text-stone-700">{estimate.summary}</p>
              <p className="text-xs text-stone-500">Excluding fabric or matching center material cost</p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
              <div className="text-left sm:text-right">
                <span data-testid="estimator-total" className="font-mono-tabular text-3xl font-semibold text-stone-950">
                  {formatCurrencyINR(estimate.total)}
                </span>
              </div>
              <a
                href={estimate.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-rose-800 hover:bg-rose-900 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Book on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
