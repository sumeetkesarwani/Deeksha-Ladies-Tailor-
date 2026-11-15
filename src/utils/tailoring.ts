import type {
  CustomerReview,
  OrderStatus,
  ReviewSummary,
  TailoringOrder,
} from '../types.ts';

export interface GarmentOption {
  id: string;
  name: string;
  basePrice: number;
  category: 'Blouse' | 'Suit & Kurti' | 'Bridal & Gown';
}

export interface TurnaroundOption {
  id: string;
  name: string;
  fee: number;
  windowLabel: string;
}

export interface AddonOption {
  id: string;
  label: string;
  shortLabel: string;
  price: number;
}

export interface ServiceOffering {
  number: string;
  title: string;
  description: string;
  startingPrice: number;
  highlights: string[];
}

export interface MatchingRateItem {
  name: string;
  spec: string;
  rateRange: string;
  unit: string;
}

export interface DesignPattern {
  name: string;
  category: string;
  note: string;
}

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

export interface EstimateInput {
  garmentId: string;
  turnaroundId: string;
  addonIds: string[];
  whatsappDigits?: string;
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
  const garment = GARMENT_OPTIONS.find((g) => g.id === input.garmentId) ?? GARMENT_OPTIONS[0];
  const turnaround = TURNAROUND_OPTIONS.find((t) => t.id === input.turnaroundId) ?? TURNAROUND_OPTIONS[0];

  const uniqueAddonIds = Array.from(new Set(input.addonIds));
  const selectedAddons = ADDON_OPTIONS.filter((a) => uniqueAddonIds.includes(a.id));

  const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.price, 0);
  const total = garment.basePrice + turnaround.fee + addonsTotal;
  const selectedAddonLabels = selectedAddons.map((a) => a.shortLabel);

  let summary = garment.name;
  if (selectedAddonLabels.length > 0) {
    summary += ` + ${selectedAddonLabels.join(', ')}`;
  }
  if (turnaround.fee > 0) {
    summary += ` (${turnaround.name})`;
  } else {
    summary += ' · Standard Delivery';
  }

  const digits = (input.whatsappDigits ?? '917449531663').replace(/\D/g, '') || '917449531663';
  const waMsg = `Hello Deeksha Tailors, I calculated an estimate on your website for *${summary}* (Estimated Total: *₹${total}*). I would like to book an appointment!`;

  return {
    garmentName: garment.name,
    basePrice: garment.basePrice,
    turnaroundFee: turnaround.fee,
    addonsTotal,
    total,
    selectedAddonLabels,
    summary,
    whatsappUrl: `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(waMsg)}`,
  };
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
    const billMatch = order.orderNo.toLowerCase() === trimmed || order.orderNo.toLowerCase().includes(trimmed);
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
  order: Pick<TailoringOrder, 'orderNo' | 'customerName'>,
): string {
  const digits = whatsappDigits.replace(/\D/g, '') || '917449531663';
  const msg = `Hi Deeksha Tailors, I am checking status for Bill #${order.orderNo} (${order.customerName}).`;
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(msg)}`;
}
