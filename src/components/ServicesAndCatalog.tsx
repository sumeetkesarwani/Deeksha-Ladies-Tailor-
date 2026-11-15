import { useState } from 'react';
import type { DesignPattern, ServiceOffering } from '../types.ts';
import { formatCurrencyINR } from '../utils/tailoring.ts';
import designerBlouseImg from '../assets/images/designer_blouse_craft_1794727219299.jpg';

interface ServicesAndCatalogProps {
  services: ServiceOffering[];
  designPatterns: DesignPattern[];
}

export function ServicesAndCatalog({ services, designPatterns }: ServicesAndCatalogProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <section id="services" className="py-16 sm:py-20 border-b border-stone-200 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-rose-800">Master Craftsmanship</p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-stone-950 tracking-tight [text-wrap:balance]">
                Tailoring shaped for poise, balance, and daily comfort.
              </h2>
              <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
                Every garment is cut to 16-point body measurements by experienced master tailors, eliminating shoulder slips and neckline puckering.
              </p>
            </div>

            <div className="relative h-64 sm:h-72 lg:h-full min-h-[260px] rounded-2xl overflow-hidden border border-stone-200 bg-stone-100">
              {!imageError ? (
                <img
                  src={designerBlouseImg}
                  alt="Handcrafted crimson raw silk bridal blouse with gold zardozi embroidery and pearl latkan tassels"
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-rose-50 text-stone-700 font-display text-xl">
                  Bridal &amp; Designer Blouses
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 divide-y divide-stone-200 border-y border-stone-200">
            {services.map((service, idx) => (
              <div key={`${service.number}-${idx}`} className="py-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono-tabular text-xs font-semibold text-rose-800">{service.number}.</span>
                    <h3 className="text-lg font-semibold text-stone-950">{service.title}</h3>
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed">{service.description}</p>
                  {service.highlights.length > 0 && (
                    <p className="text-xs text-stone-500">
                      {service.highlights.join(' · ')}
                    </p>
                  )}
                </div>
                <div className="sm:text-right shrink-0">
                  <span className="text-xs text-stone-500 block">Starting from</span>
                  <span className="font-mono-tabular text-lg font-semibold text-stone-950">
                    {formatCurrencyINR(service.startingPrice)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Design Catalog */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h3 className="font-display text-2xl font-semibold text-stone-950">Trending Cuts &amp; Neck Patterns</h3>
              <p className="text-sm text-stone-600 mt-1">
                Select a house signature pattern or bring your own reference photograph during measurement.
              </p>
            </div>
            <a href="#estimator" className="text-sm font-semibold text-rose-800 hover:underline whitespace-nowrap">
              Calculate Stitching Cost →
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {designPatterns.map((pattern, idx) => (
              <div key={`${pattern.name}-${idx}`} className="p-5 rounded-xl border border-stone-200 bg-[#FAF8F6] space-y-1.5">
                <p className="text-xs text-stone-500">{pattern.category}</p>
                <h4 className="text-base font-semibold text-stone-950">{pattern.name}</h4>
                <p className="text-sm text-stone-600 leading-relaxed">{pattern.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
