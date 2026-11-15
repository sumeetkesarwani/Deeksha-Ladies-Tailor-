import type {
  AddonOption,
  CatalogConfig,
  CustomerReview,
  DesignPattern,
  GarmentOption,
  MatchingRateItem,
  OrderStatus,
  ReviewSummary,
  ServiceOffering,
  TailoringOrder,
  TurnaroundOption,
} from '../types.ts';

export type {
  AddonOption,
  CatalogConfig,
  DesignPattern,
  GarmentOption,
  MatchingRateItem,
  ServiceOffering,
  TurnaroundOption,
};

export const GARMENT_OPTIONS: GarmentOption[] = [
  { id: 'alite-blouse', name: 'Alite Cut Designer Blouse', basePrice: 350, category: 'Blouse' },
  { id: 'prince-blouse', name: 'Prince Cut Blouse', basePrice: 320, category: 'Blouse' },
  { id: 'katori-blouse', name: 'Katori / Double Katori Blouse', basePrice: 420, category: 'Blouse' },
  { id: 'sabyasachi-blouse', name: 'Sabyasachi / Bridal Cut Blouse', basePrice: 450, category: 'Blouse' },
  { id: 'straight-kurti', name: 'Simple Straight Kurti / Top', basePrice: 350, category: 'Suit & Kurti' },
  { id: 'salwar-suit', name: 'Full Salwar Suit Set (Top + Bottom)', basePrice: 550, category: 'Suit & Kurti' },
  { id: 'anarkali-suit', name: 'Anarkali / Alia / Nayra Cut Suit', basePrice: 750, category: 'Suit & Kurti' },
  { id: 'lehenga-choli', name: 'Lehenga Choli Stitching', basePrice: 1200, category: 'Bridal & Gown' },
];

export const TURNAROUND_OPTIONS: TurnaroundOption[] = [
  { id: 'standard', name: 'Standard Delivery (4–6 Days)', fee: 0, windowLabel: '4 to 6 Days' },
  { id: 'express', name: 'Express Rush Delivery (24–48 Hours)', fee: 150, windowLabel: '24 to 48 Hours' },
];

export const ADDON_OPTIONS: AddonOption[] = [
  { id: 'cups', label: 'Padded Cups', shortLabel: 'Padded Cups', price: 120 },
  { id: 'lining', label: 'Double / Cotton Lining', shortLabel: 'Double Lining', price: 80 },
  { id: 'piping', label: 'Contrast Thread Piping', shortLabel: 'Piping', price: 60 },
  { id: 'dori', label: 'Dori + Latkan Set', shortLabel: 'Dori Latkan', price: 80 },
  { id: 'fall', label: 'Saree Fall + Pico', shortLabel: 'Fall Pico', price: 60 },
];

export const SERVICE_OFFERINGS: ServiceOffering[] = [
  {
    number: '01',
    title: 'Designer Blouses',
    description:
      'Signature Alite cut, Prince cut (padded and non-padded), double Katori, Bombay cut, Sabyasachi bridal cuts, and backless dori styling.',
    startingPrice: 350,
    highlights: ['16-point bust & shoulder darting', 'Zero-puckering back necklines'],
  },
  {
    number: '02',
    title: 'Salwar Suits & Kurtis',
    description:
      'Straight cut, Nayra cut, Alia cut V-Empire, flared Anarkalis, Pakistani suits with designer mori, cigarette pants, and palazzos.',
    startingPrice: 350,
    highlights: ['Custom neckline & sleeve finish', 'Breathable cotton or crepe lining'],
  },
  {
    number: '03',
    title: 'Bridal & Lehenga Cholis',
    description:
      'Heavy zari bridal lehenga choli tailoring, kalidar stitching, cancan net insertion, dupatta setting, and festive western gowns.',
    startingPrice: 1200,
    highlights: ['Structured cancan volume', 'Precision zardozi seam handling'],
  },
  {
    number: '04',
    title: 'Saree Fall, Pico & Alterations',
    description:
      'Fine saree fall stitching, zig-zag interlock pico, saree kuchu thread tassels, handmade bridal latkans, and precision alterations.',
    startingPrice: 60,
    highlights: ['Pre-washed colorfast falls', 'Same-day urgent alterations'],
  },
];

export const MATCHING_CENTER_RATES: MatchingRateItem[] = [
  {
    name: 'Premium Rubia Cotton Astar',
    spec: '100% pre-shrunk colorfast cotton across 100+ shades',
    rateRange: '₹45 – ₹65',
    unit: 'per meter',
  },
  {
    name: 'Santoon / Butter Crepe Lining',
    spec: 'Soft silky drape for designer suits, anarkalis & kurtis',
    rateRange: '₹60 – ₹80',
    unit: 'per meter',
  },
  {
    name: 'Standard Cotton Saree Fall',
    spec: 'Pre-washed, anti-shrink border weight in matching shades',
    rateRange: '₹30 – ₹45',
    unit: 'per piece',
  },
  {
    name: 'Fancy Heavy Bridal Latkan',
    spec: 'Handmade thread tassels, mirror work & pearl drops',
    rateRange: '₹80 – ₹250',
    unit: 'per pair',
  },
  {
    name: 'Gota Patti & Cutwork Border',
    spec: 'Gold, silver, zari, and thread decorative laces',
    rateRange: '₹35 – ₹120',
    unit: 'per meter',
  },
  {
    name: 'Pure Cotton Inskirt / Petticoat',
    spec: 'Standard cotton petticoats, satin inskirts & mermaid cuts',
    rateRange: '₹160 – ₹240',
    unit: 'per piece',
  },
];

export const DESIGN_PATTERNS: DesignPattern[] = [
  { name: 'Alite Cut', category: 'Blouse Cut', note: 'Structured bust darting & tailored everyday poise' },
  { name: 'Prince Cut', category: 'Blouse Cut', note: 'Seamless princess curve with optional padded support' },
  { name: 'Sweetheart Neck', category: 'Neckline', note: 'Deep romantic neckline with crisp piping finish' },
  { name: 'Sabyasachi Cut', category: 'Bridal Cut', note: 'Broad deep V-neck paired with heavy bridal dori' },
  { name: 'Pot / Keyhole Back', category: 'Back Pattern', note: 'Balanced drop cutout finished with custom latkans' },
  { name: 'Alia Empire Kurti', category: 'Ethnic Kurti', note: 'V-empire gathers tailored for festive occasions' },
];

export const DEFAULT_CATALOG: CatalogConfig = {
  services: SERVICE_OFFERINGS,
  designPatterns: DESIGN_PATTERNS,
  matchingRates: MATCHING_CENTER_RATES,
  estimatorGarments: GARMENT_OPTIONS,
  estimatorTurnarounds: TURNAROUND_OPTIONS,
  estimatorAddons: ADDON_OPTIONS,
};

export interface EstimateInput {
  garmentId: string;
  turnaroundId: string;
  addonIds: string[];
  whatsappDigits?: string;
  catalog?: Pick<CatalogConfig, 'estimatorGarments' | 'estimatorTurnarounds' | 'estimatorAddons'>;
}

export interface EstimateResult {
  garmentName: string;
  basePrice: number;
  turnaroundFee: number;
  addonsTotal: number;
  total: number;
  selectedAddonLabels: string[];
  summary: string;
  whatsappUrl: string;
}

export function calculateStitchingEstimate(input: EstimateInput): EstimateResult {
  const garments = input.catalog ? input.catalog.estimatorGarments : GARMENT_OPTIONS;
  const turnarounds = input.catalog ? input.catalog.estimatorTurnarounds : TURNAROUND_OPTIONS;
  const addons = input.catalog ? input.catalog.estimatorAddons : ADDON_OPTIONS;

  const garment = garments.find((g) => g.id === input.garmentId) ?? garments[0];
  const turnaround = turnarounds.find((t) => t.id === input.turnaroundId) ?? turnarounds[0];

  const uniqueAddonIds = Array.from(new Set(input.addonIds));
  const selectedAddons = addons.filter((a) => uniqueAddonIds.includes(a.id));

  const garmentName = garment?.name ?? 'Custom Garment';
  const basePrice = garment?.basePrice ?? 0;
  const turnaroundFee = turnaround?.fee ?? 0;
  const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.price, 0);
  const total = basePrice + turnaroundFee + addonsTotal;
  const selectedAddonLabels = selectedAddons.map((a) => a.shortLabel || a.label);

  let summary = garmentName;
  if (selectedAddonLabels.length > 0) {
    summary += ` + ${selectedAddonLabels.join(', ')}`;
  }
  if (turnaround) {
    if (turnaround.fee > 0) {
      summary += ` (${turnaround.name})`;
    } else {
      summary += ` · ${turnaround.name}`;
    }
  }

  const digits = (input.whatsappDigits ?? '917449531663').replace(/\D/g, '') || '917449531663';
  const waMsg = `Hello Deeksha Tailors, I calculated an estimate on your website for *${summary}* (Estimated Total: *₹${total}*). I would like to book an appointment!`;

  return {
    garmentName,
    basePrice,
    turnaroundFee,
    addonsTotal,
    total,
    selectedAddonLabels,
    summary,
    whatsappUrl: `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(waMsg)}`,
  };
}

export const BILLING_STORAGE_KEY = 'deeksha_orders_registry_v1';

export interface TrackedOrderResult {
  id: string;
  orderNo: string;
  items: TailoringOrder['items'];
  balance: number;
  deliveryDate: string;
  status: OrderStatus;
}

const VALID_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'Booked',
  'In Progress',
  'Ready',
  'Partial Delivered',
  'Delivered',
]);

export function mapBillingHtmlOrders(raw: unknown): TailoringOrder[] {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  const result: TailoringOrder[] = [];

  for (let idx = 0; idx < parsed.length; idx++) {
    const entry = parsed[idx];
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;

    const orderNo = String(rec.orderNo ?? '').trim();
    const customerName = String(rec.customerName ?? '').trim();
    const phone = normalizeIndianPhone(String(rec.phone ?? ''));

    if (!orderNo && !customerName && !phone) continue;

    const rawItems = Array.isArray(rec.items) ? rec.items : [];
    const items = rawItems
      .filter((it): it is Record<string, unknown> => Boolean(it && typeof it === 'object'))
      .map((it, itemIdx) => ({
        id: String(it.id ?? '').trim() || `itm-${idx}-${itemIdx}`,
        desc: String(it.desc ?? 'Tailoring Item').trim() || 'Tailoring Item',
        qty: Math.max(1, Number(it.qty) || 1),
        isDelivered: Boolean(it.isDelivered),
      }));

    const rawItemTotals = rawItems.reduce((sum: number, it) => {
      if (!it || typeof it !== 'object') return sum;
      const itemObj = it as Record<string, unknown>;
      const t = Number(itemObj.total);
      if (Number.isFinite(t)) return sum + Math.max(0, t);
      const q = Math.max(1, Number(itemObj.qty) || 1);
      const r = Number(itemObj.rate) || 0;
      return sum + Math.max(0, q * r);
    }, 0);

    const discount = Math.max(0, Number(rec.discount) || 0);
    let totalAmount = 0;
    if (typeof rec.subtotal === 'number' && Number.isFinite(rec.subtotal)) {
      totalAmount = Math.max(0, rec.subtotal - discount);
    } else if (typeof rec.totalAmount === 'number' && Number.isFinite(rec.totalAmount)) {
      totalAmount = Math.max(0, rec.totalAmount);
    } else {
      totalAmount = Math.max(0, rawItemTotals - discount);
    }

    let advancePaid = 0;
    if (typeof rec.totalPaid === 'number' && Number.isFinite(rec.totalPaid)) {
      advancePaid = Math.max(0, rec.totalPaid);
    } else if (rec.advance !== undefined || rec.finalPaid !== undefined) {
      advancePaid = Math.max(0, (Number(rec.advance) || 0) + (Number(rec.finalPaid) || 0));
    } else if (typeof rec.advancePaid === 'number' && Number.isFinite(rec.advancePaid)) {
      advancePaid = Math.max(0, rec.advancePaid);
    }

    const balance =
      typeof rec.balance === 'number' && Number.isFinite(rec.balance)
        ? Math.max(0, Number(rec.balance.toFixed(2)))
        : computeOrderBalance(totalAmount, advancePaid);

    const rawStatus = String(rec.status ?? '').trim() as OrderStatus;
    const status: OrderStatus = VALID_ORDER_STATUSES.has(rawStatus) ? rawStatus : 'Booked';

    const notes = String(rec.qualityNotes ?? rec.notes ?? '').trim() || undefined;

    result.push({
      id: String(rec.id ?? '').trim() || `bill-${idx}-${orderNo || 'entry'}`,
      orderNo: orderNo || String(idx + 101),
      customerName: customerName || 'Customer',
      phone,
      items,
      totalAmount,
      advancePaid,
      balance,
      deliveryDate: String(rec.deliveryDate ?? '').trim() || 'Pending',
      status,
      notes,
      createdAt: String(rec.updatedAt ?? rec.createdAt ?? '').trim() || new Date().toISOString(),
    });
  }

  return result;
}

export function toTrackedOrderResult(order: TailoringOrder): TrackedOrderResult {
  return {
    id: order.id,
    orderNo: order.orderNo,
    items: order.items,
    balance: order.balance,
    deliveryDate: order.deliveryDate,
    status: order.status,
  };
}

export function mergeTrackedOrders(
  primaryOrders: TrackedOrderResult[],
  secondaryOrders: TrackedOrderResult[],
): TrackedOrderResult[] {
  const seenIds = new Set<string>();
  const seenOrderNos = new Set<string>();
  const merged: TrackedOrderResult[] = [];

  for (const order of [...primaryOrders, ...secondaryOrders]) {
    const orderKey = order.orderNo.trim().toLowerCase();
    if (seenIds.has(order.id) || (orderKey && seenOrderNos.has(orderKey))) {
      continue;
    }
    seenIds.add(order.id);
    if (orderKey) {
      seenOrderNos.add(orderKey);
    }
    merged.push(order);
  }

  return merged;
}

export function computeOrderBalance(totalAmount: number, advancePaid: number): number {
  const safeTotal = Number.isFinite(totalAmount) ? Math.max(0, totalAmount) : 0;
  const safeAdvance = Number.isFinite(advancePaid) ? Math.max(0, advancePaid) : 0;
  return Math.max(0, Number((safeTotal - safeAdvance).toFixed(2)));
}

export function filterOrders(
  orders: TailoringOrder[],
  query: string,
  statusFilter: OrderStatus | 'All' = 'All',
): TailoringOrder[] {
  const trimmed = query.trim().toLowerCase();
  const cleanBill = trimmed.replace(/^#+/, '');
  const digitsOnly = normalizeIndianPhone(trimmed);

  return orders.filter((order) => {
    if (statusFilter !== 'All' && order.status !== statusFilter) {
      return false;
    }
    if (!trimmed) {
      return true;
    }
    const orderPhoneDigits = normalizeIndianPhone(order.phone);
    const phoneMatch = digitsOnly.length > 0 && orderPhoneDigits.includes(digitsOnly);
    const billMatch =
      cleanBill.length > 0 &&
      (order.orderNo.toLowerCase() === cleanBill || order.orderNo.toLowerCase().includes(cleanBill));
    const nameMatch = order.customerName.toLowerCase().includes(trimmed);
    return phoneMatch || billMatch || nameMatch;
  });
}

export function computeReviewSummary(
  reviews: CustomerReview[],
  baseDirectoryRating: number,
  baseDirectoryReviewCount: number,
  googleProfileUrl: string,
): ReviewSummary {
  const webReviews = reviews.filter((r) => r.visible && r.source === 'Website Customer');
  const baseWeight = Math.max(0, baseDirectoryReviewCount);
  const baseSum = baseDirectoryRating * baseWeight;
  const webSum = webReviews.reduce((acc, r) => acc + Math.min(5, Math.max(1, r.rating)), 0);
  const totalCount = baseWeight + webReviews.length;
  const avg = totalCount > 0 ? Number(((baseSum + webSum) / totalCount).toFixed(1)) : baseDirectoryRating;

  return {
    averageRating: avg,
    totalReviewsCount: totalCount,
    googleProfileUrl,
    sourceNote: 'Verified rating across Google Business Profile & local Kolkata directories',
  };
}

export function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

export function validateAppointmentInput(input: {
  name: string;
  phone: string;
  preferredDate?: string;
  timeSlot?: string;
}): { valid: boolean; error?: string; normalizedPhone?: string } {
  const name = input.name.trim();
  const normalizedPhone = normalizeIndianPhone(input.phone);

  if (name.length < 2) {
    return { valid: false, error: 'Please enter your full name (at least 2 characters).' };
  }
  if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
    return { valid: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
  }
  return { valid: true, normalizedPhone };
}

export function validateReviewInput(input: {
  customerName: string;
  rating: number;
  service: string;
  comment: string;
}): { valid: boolean; error?: string } {
  if (input.customerName.trim().length < 2) {
    return { valid: false, error: 'Please enter your name.' };
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { valid: false, error: 'Rating must be between 1 and 5 stars.' };
  }
  if (input.service.trim().length < 2) {
    return { valid: false, error: 'Please select or enter the service you visited for.' };
  }
  if (input.comment.trim().length < 8) {
    return { valid: false, error: 'Please write a short review (at least 8 characters).' };
  }
  return { valid: true };
}

export function formatCurrencyINR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `₹${safe.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function buildAppointmentWhatsAppUrl(
  whatsappDigits: string,
  details: { name: string; phone: string; date: string; timeSlot: string; notes: string },
): string {
  const digits = whatsappDigits.replace(/\D/g, '') || '917449531663';
  const msg =
    `NEW FITTING / MEASUREMENT APPOINTMENT REQUEST\n` +
    `Customer Name: ${details.name}\n` +
    `Phone: +91 ${details.phone}\n` +
    `Preferred Date: ${details.date || 'Earliest Available'}\n` +
    `Preferred Time: ${details.timeSlot}\n` +
    `Requirements: ${details.notes || 'Stitching and consultation'}`;
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(msg)}`;
}

export function buildOrderInquiryWhatsAppUrl(
  whatsappDigits: string,
  order: { orderNo: string; customerName?: string },
): string {
  const digits = whatsappDigits.replace(/\D/g, '') || '917449531663';
  const msg = order.customerName
    ? `Hi Deeksha Tailors, I am checking status for Bill #${order.orderNo} (${order.customerName}).`
    : `Hi Deeksha Tailors, I am checking status for Bill #${order.orderNo}.`;
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(msg)}`;
}

export function buildDirectEnquiryWhatsAppUrl(
  whatsappDigits: string,
  details?: { name?: string; phone?: string; date?: string; timeSlot?: string; notes?: string },
): string {
  const digits = whatsappDigits.replace(/\D/g, '') || '917449531663';
  const lines = ['Hello Deeksha Ladies Tailor & Matching Center, I have an enquiry:'];
  if (details?.name?.trim()) lines.push(`Name: ${details.name.trim()}`);
  if (details?.phone?.trim()) lines.push(`Mobile: ${details.phone.trim()}`);
  if (details?.date?.trim()) lines.push(`Preferred Date: ${details.date.trim()}`);
  if (details?.timeSlot?.trim()) lines.push(`Preferred Time: ${details.timeSlot.trim()}`);
  if (details?.notes?.trim()) {
    lines.push(`Requirements / Enquiry: ${details.notes.trim()}`);
  } else {
    lines.push('I would like to enquire about stitching / matching fabrics.');
  }
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(lines.join('\n'))}`;
}
