import { useState } from 'react';
import { MATCHING_CENTER_RATES } from '../utils/tailoring.ts';
import type { ShopDetails } from '../types.ts';

interface MatchingCenterSectionProps {
  shopDetails: ShopDetails;
}

export function MatchingCenterSection({ shopDetails }: MatchingCenterSectionProps) {
  const [imageError, setImageError] = useState(false);
  const waMatchUrl = `https://api.whatsapp.com/send?phone=${shopDetails.whatsappDigits}&text=${encodeURIComponent(
    'Hi Deeksha Tailors, I have a saree and want to check if matching lining/fall is available.',
  )}`;

  return (
    <section id="matching-center" className="py-16 sm:py-20 border-b border-stone-200 bg-[#FAF8F6]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-rose-800">Matching Center Spotlight</p>
            <h2 className="font-display text-3xl font-semibold text-stone-950 tracking-tight [text-wrap:balance]">
              Linings, astars, falls, and bridal trims under one roof.
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Skip extra market trips across Rajarhat. We stock 100+ colorfast shades of pure rubia cotton astar, butter crepe linings, saree falls, gota patti borders, and handmade latkans right at the counter.
            </p>
          </div>

          <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden border border-stone-200 bg-stone-200">
            {!imageError ? (
              <img
                src="/src/assets/images/matching_center_fabrics_1794727217954.jpg"
                alt="Shelves of folded cotton astar linings, silk brocades, and golden gota patti borders at Deeksha Matching Center"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-amber-50 text-stone-700 font-display text-xl">
                100+ Matching Astar Shades
              </div>
            )}
          </div>

          <div>
            <a
              href={waMatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Send Saree Photo to Match Fabric
            </a>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-900">Matching Fabric &amp; Accessory Rate Guide</h3>
            <span className="text-xs text-stone-500">Counter Prices</span>
          </div>

          <div className="divide-y divide-stone-200">
            {MATCHING_CENTER_RATES.map((item) => (
              <div key={item.name} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-stone-50/70 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{item.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{item.spec}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono-tabular text-sm font-semibold text-stone-950">{item.rateRange}</p>
                  <p className="text-xs text-stone-500">{item.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
