import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import type {
  AddonOption,
  CatalogConfig,
  DesignPattern,
  GarmentOption,
  MatchingRateItem,
  ServiceOffering,
  TurnaroundOption,
} from '../types.ts';

interface CatalogEditorTabProps {
  catalog: CatalogConfig;
  saving: boolean;
  onSaveCatalog: (nextCatalog: CatalogConfig) => Promise<void>;
}

type CatalogSection = 'services' | 'estimator' | 'matching' | 'patterns';

export function CatalogEditorTab({ catalog, saving, onSaveCatalog }: CatalogEditorTabProps) {
  const [draft, setDraft] = useState<CatalogConfig>(catalog);
  const [section, setSection] = useState<CatalogSection>('services');

  useEffect(() => {
    setDraft(catalog);
  }, [catalog]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSaveCatalog(draft);
  };

  // --- Services helpers ---
  const updateService = (idx: number, patch: Partial<ServiceOffering>) => {
    setDraft((prev) => ({
      ...prev,
      services: prev.services.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  const addService = () => {
    setDraft((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        {
          number: String(prev.services.length + 1).padStart(2, '0'),
          title: 'New Tailoring Service',
          description: 'Describe stitching cut, lining, and finish details.',
          startingPrice: 350,
          highlights: ['Custom measurements', 'Clean seam finish'],
        },
      ],
    }));
  };

  const removeService = (idx: number) => {
    setDraft((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== idx),
    }));
  };

  // --- Estimator Garments helpers ---
  const updateGarment = (idx: number, patch: Partial<GarmentOption>) => {
    setDraft((prev) => ({
      ...prev,
      estimatorGarments: prev.estimatorGarments.map((g, i) => (i === idx ? { ...g, ...patch } : g)),
    }));
  };

  const addGarment = () => {
    setDraft((prev) => ({
      ...prev,
      estimatorGarments: [
        ...prev.estimatorGarments,
        {
          id: `garment-${Date.now()}`,
          name: 'New Garment Item',
          basePrice: 400,
          category: 'Blouse',
        },
      ],
    }));
  };

  const removeGarment = (idx: number) => {
    if (draft.estimatorGarments.length <= 1) return;
    setDraft((prev) => ({
      ...prev,
      estimatorGarments: prev.estimatorGarments.filter((_, i) => i !== idx),
    }));
  };

  // --- Estimator Turnarounds helpers ---
  const updateTurnaround = (idx: number, patch: Partial<TurnaroundOption>) => {
    setDraft((prev) => ({
      ...prev,
      estimatorTurnarounds: prev.estimatorTurnarounds.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }));
  };

  const addTurnaround = () => {
    setDraft((prev) => ({
      ...prev,
      estimatorTurnarounds: [
        ...prev.estimatorTurnarounds,
        {
          id: `speed-${Date.now()}`,
          name: 'Priority Delivery (48 Hours)',
          fee: 100,
          windowLabel: '48 Hours',
        },
      ],
    }));
  };

  const removeTurnaround = (idx: number) => {
    if (draft.estimatorTurnarounds.length <= 1) return;
    setDraft((prev) => ({
      ...prev,
      estimatorTurnarounds: prev.estimatorTurnarounds.filter((_, i) => i !== idx),
    }));
  };

  // --- Estimator Addons helpers ---
  const updateAddon = (idx: number, patch: Partial<AddonOption>) => {
    setDraft((prev) => ({
      ...prev,
      estimatorAddons: prev.estimatorAddons.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
    }));
  };

  const addAddon = () => {
    setDraft((prev) => ({
      ...prev,
      estimatorAddons: [
        ...prev.estimatorAddons,
        {
          id: `addon-${Date.now()}`,
          label: 'New Stitching Add-On',
          shortLabel: 'Add-On',
          price: 80,
        },
      ],
    }));
  };

  const removeAddon = (idx: number) => {
    setDraft((prev) => ({
      ...prev,
      estimatorAddons: prev.estimatorAddons.filter((_, i) => i !== idx),
    }));
  };

  // --- Matching Center Rates helpers ---
  const updateMatchingRate = (idx: number, patch: Partial<MatchingRateItem>) => {
    setDraft((prev) => ({
      ...prev,
      matchingRates: prev.matchingRates.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    }));
  };

  const addMatchingRate = () => {
    setDraft((prev) => ({
      ...prev,
      matchingRates: [
        ...prev.matchingRates,
        {
          name: 'New Matching Fabric / Accessory',
          spec: 'Describe material quality and shade range',
          rateRange: '₹50 – ₹90',
          unit: 'per meter',
        },
      ],
    }));
  };

  const removeMatchingRate = (idx: number) => {
    setDraft((prev) => ({
      ...prev,
      matchingRates: prev.matchingRates.filter((_, i) => i !== idx),
    }));
  };

  // --- Design Patterns helpers ---
  const updatePattern = (idx: number, patch: Partial<DesignPattern>) => {
    setDraft((prev) => ({
      ...prev,
      designPatterns: prev.designPatterns.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));
  };

  const addPattern = () => {
    setDraft((prev) => ({
      ...prev,
      designPatterns: [
        ...prev.designPatterns,
        {
          name: 'New Cut / Neck Pattern',
          category: 'Blouse Cut',
          note: 'Short style description for customers.',
        },
      ],
    }));
  };

  const removePattern = (idx: number) => {
    setDraft((prev) => ({
      ...prev,
      designPatterns: prev.designPatterns.filter((_, i) => i !== idx),
    }));
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {/* Sub-navigation & global save bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
          {(
            [
              { id: 'services', label: `Services (${draft.services.length})` },
              { id: 'estimator', label: `Cost Estimator (${draft.estimatorGarments.length})` },
              { id: 'matching', label: `Matching Rates (${draft.matchingRates.length})` },
              { id: 'patterns', label: `Design Patterns (${draft.designPatterns.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                section === tab.id ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-800 hover:bg-rose-900 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Changes...' : 'Save All Pricing & Services'}</span>
        </button>
      </div>

      {/* 1. TAILORING SERVICES */}
      {section === 'services' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-base font-semibold text-stone-950">Tailoring Services &amp; Starting Prices</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Changes update the public Services section immediately after saving.
              </p>
            </div>
            <button
              type="button"
              onClick={addService}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-semibold text-stone-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service</span>
            </button>
          </div>

          <div className="divide-y divide-stone-200">
            {draft.services.map((service, idx) => (
              <div key={idx} className="py-5 first:pt-0 last:pb-0 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label htmlFor={`srv-num-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                      Order #
                    </label>
                    <input
                      id={`srv-num-${idx}`}
                      type="text"
                      value={service.number}
                      onChange={(e) => updateService(idx, { number: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor={`srv-title-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                      Service Title *
                    </label>
                    <input
                      id={`srv-title-${idx}`}
                      type="text"
                      required
                      value={service.title}
                      onChange={(e) => updateService(idx, { title: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-medium outline-none focus:border-rose-800"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor={`srv-price-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                      Starting Price (₹)
                    </label>
                    <input
                      id={`srv-price-${idx}`}
                      type="number"
                      min={0}
                      required
                      value={service.startingPrice}
                      onChange={(e) => updateService(idx, { startingPrice: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeService(idx)}
                      aria-label={`Remove service ${service.title}`}
                      className="p-2 text-stone-400 hover:text-rose-700 rounded-lg border border-stone-200 hover:border-rose-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`srv-desc-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id={`srv-desc-${idx}`}
                      rows={2}
                      value={service.description}
                      onChange={(e) => updateService(idx, { description: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800 resize-none"
                    />
                  </div>
                  <div>
                    <label htmlFor={`srv-highlights-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                      Key Highlights (comma-separated)
                    </label>
                    <textarea
                      id={`srv-highlights-${idx}`}
                      rows={2}
                      value={service.highlights.join(', ')}
                      onChange={(e) =>
                        updateService(idx, {
                          highlights: e.target.value
                            .split(',')
                            .map((h) => h.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800 resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. COST ESTIMATOR (GARMENTS, SPEEDS, ADD-ONS) */}
      {section === 'estimator' && (
        <div className="space-y-6">
          {/* Garments */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
              <div>
                <h2 className="text-base font-semibold text-stone-950">Estimator Garments &amp; Base Prices</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Controls the Garment Type dropdown and base stitching rate in the Cost Estimator.
                </p>
              </div>
              <button
                type="button"
                onClick={addGarment}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-semibold text-stone-800 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Garment</span>
              </button>
            </div>

            <div className="space-y-3">
              {draft.estimatorGarments.map((g, idx) => (
                <div key={g.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6">
                    <label htmlFor={`garm-name-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                      Garment Name
                    </label>
                    <input
                      id={`garm-name-${idx}`}
                      type="text"
                      required
                      value={g.name}
                      onChange={(e) => updateGarment(idx, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor={`garm-cat-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                      Category
                    </label>
                    <select
                      id={`garm-cat-${idx}`}
                      value={g.category}
                      onChange={(e) =>
                        updateGarment(idx, {
                          category: e.target.value as GarmentOption['category'],
                        })
                      }
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white outline-none focus:border-rose-800"
                    >
                      <option value="Blouse">Blouse</option>
                      <option value="Suit & Kurti">Suit &amp; Kurti</option>
                      <option value="Bridal & Gown">Bridal &amp; Gown</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`garm-price-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                      Price (₹)
                    </label>
                    <input
                      id={`garm-price-${idx}`}
                      type="number"
                      min={0}
                      required
                      value={g.basePrice}
                      onChange={(e) => updateGarment(idx, { basePrice: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={draft.estimatorGarments.length <= 1}
                      onClick={() => removeGarment(idx)}
                      aria-label={`Remove garment ${g.name}`}
                      className="p-2 text-stone-400 hover:text-rose-700 disabled:opacity-40 rounded-lg border border-stone-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Turnaround Speeds & Add-ons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-stone-950">Turnaround Speed Fees</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Standard &amp; express delivery fees</p>
                </div>
                <button
                  type="button"
                  onClick={addTurnaround}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-semibold text-stone-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Speed</span>
                </button>
              </div>

              <div className="space-y-3">
                {draft.estimatorTurnarounds.map((t, idx) => (
                  <div key={t.id} className="grid grid-cols-12 gap-2.5 items-end">
                    <div className="col-span-8">
                      <label htmlFor={`turn-name-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                        Delivery Option Label
                      </label>
                      <input
                        id={`turn-name-${idx}`}
                        type="text"
                        required
                        value={t.name}
                        onChange={(e) => updateTurnaround(idx, { name: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                      />
                    </div>
                    <div className="col-span-3">
                      <label htmlFor={`turn-fee-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                        Fee (₹)
                      </label>
                      <input
                        id={`turn-fee-${idx}`}
                        type="number"
                        min={0}
                        required
                        value={t.fee}
                        onChange={(e) => updateTurnaround(idx, { fee: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        disabled={draft.estimatorTurnarounds.length <= 1}
                        onClick={() => removeTurnaround(idx)}
                        aria-label={`Remove turnaround ${t.name}`}
                        className="p-2 text-stone-400 hover:text-rose-700 disabled:opacity-40 rounded-lg border border-stone-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-stone-950">Design Add-On Prices</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Optional cups, lining, piping &amp; pico checkboxes</p>
                </div>
                <button
                  type="button"
                  onClick={addAddon}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-semibold text-stone-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Add-On</span>
                </button>
              </div>

              <div className="space-y-3">
                {draft.estimatorAddons.map((addon, idx) => (
                  <div key={addon.id} className="grid grid-cols-12 gap-2.5 items-end">
                    <div className="col-span-8">
                      <label htmlFor={`addon-label-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                        Add-On Name
                      </label>
                      <input
                        id={`addon-label-${idx}`}
                        type="text"
                        required
                        value={addon.label}
                        onChange={(e) =>
                          updateAddon(idx, {
                            label: e.target.value,
                            shortLabel: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                      />
                    </div>
                    <div className="col-span-3">
                      <label htmlFor={`addon-price-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                        Price (₹)
                      </label>
                      <input
                        id={`addon-price-${idx}`}
                        type="number"
                        min={0}
                        required
                        value={addon.price}
                        onChange={(e) => updateAddon(idx, { price: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeAddon(idx)}
                        aria-label={`Remove add-on ${addon.label}`}
                        className="p-2 text-stone-400 hover:text-rose-700 rounded-lg border border-stone-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MATCHING CENTER RATES */}
      {section === 'matching' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-base font-semibold text-stone-950">Matching Center Fabric &amp; Accessory Rates</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Edit lining, astar, saree fall, latkan, and lace counter prices.
              </p>
            </div>
            <button
              type="button"
              onClick={addMatchingRate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-semibold text-stone-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Matching Item</span>
            </button>
          </div>

          <div className="divide-y divide-stone-200">
            {draft.matchingRates.map((item, idx) => (
              <div key={idx} className="py-4 first:pt-0 last:pb-0 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <label htmlFor={`match-name-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                    Item Name
                  </label>
                  <input
                    id={`match-name-${idx}`}
                    type="text"
                    required
                    value={item.name}
                    onChange={(e) => updateMatchingRate(idx, { name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-medium outline-none focus:border-rose-800"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label htmlFor={`match-spec-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                    Specification / Shades
                  </label>
                  <input
                    id={`match-spec-${idx}`}
                    type="text"
                    value={item.spec}
                    onChange={(e) => updateMatchingRate(idx, { spec: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={`match-rate-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                    Rate Range
                  </label>
                  <input
                    id={`match-rate-${idx}`}
                    type="text"
                    value={item.rateRange}
                    onChange={(e) => updateMatchingRate(idx, { rateRange: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono-tabular outline-none focus:border-rose-800"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor={`match-unit-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                    Unit
                  </label>
                  <input
                    id={`match-unit-${idx}`}
                    type="text"
                    value={item.unit}
                    onChange={(e) => updateMatchingRate(idx, { unit: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs outline-none focus:border-rose-800"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeMatchingRate(idx)}
                    aria-label={`Remove matching item ${item.name}`}
                    className="p-2 text-stone-400 hover:text-rose-700 rounded-lg border border-stone-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. TRENDING DESIGN PATTERNS */}
      {section === 'patterns' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-base font-semibold text-stone-950">Trending Cuts &amp; Neck Patterns</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Showcase signature cuts and neckline styles on the home page.
              </p>
            </div>
            <button
              type="button"
              onClick={addPattern}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-semibold text-stone-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Pattern</span>
            </button>
          </div>

          <div className="divide-y divide-stone-200">
            {draft.designPatterns.map((pat, idx) => (
              <div key={idx} className="py-4 first:pt-0 last:pb-0 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label htmlFor={`pat-cat-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                    Category
                  </label>
                  <input
                    id={`pat-cat-${idx}`}
                    type="text"
                    value={pat.category}
                    onChange={(e) => updatePattern(idx, { category: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor={`pat-name-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                    Pattern Name
                  </label>
                  <input
                    id={`pat-name-${idx}`}
                    type="text"
                    required
                    value={pat.name}
                    onChange={(e) => updatePattern(idx, { name: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-medium outline-none focus:border-rose-800"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label htmlFor={`pat-note-${idx}`} className="block text-xs font-semibold text-stone-700 mb-1">
                    Style Note
                  </label>
                  <input
                    id={`pat-note-${idx}`}
                    type="text"
                    value={pat.note}
                    onChange={(e) => updatePattern(idx, { note: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:border-rose-800"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removePattern(idx)}
                    aria-label={`Remove pattern ${pat.name}`}
                    className="p-2 text-stone-400 hover:text-rose-700 rounded-lg border border-stone-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
