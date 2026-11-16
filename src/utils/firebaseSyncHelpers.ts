import type {
  AddonOption,
  CatalogConfig,
  CustomerReview,
  DesignPattern,
  GarmentOption,
  MatchingRateItem,
  ServiceOffering,
  TurnaroundOption,
} from '../types.ts';
import {
  DEFAULT_CATALOG,
  mapBillingHtmlOrders,
  normalizeIndianPhone,
  toTrackedOrderResult,
  type TrackedOrderResult,
} from './tailoring.ts';

export const STAFF_STORAGE_KEY = 'deeksha_staff_registry_v1';
export const ATTENDANCE_STORAGE_KEY = 'deeksha_attendance_registry_v1';
export const PRODUCTION_STORAGE_KEY = 'deeksha_production_registry_v1';

/**
 * Formats an Admin login identifier for Firebase Email/Password authentication.
 * If no '@' is present, normalizes phone digits (or identifier) and appends '@deekshatailors.com'.
 */
export function formatAdminLoginEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (!trimmed) return '';
  if (trimmed.includes('@')) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 10) {
    const normalizedPhone = normalizeIndianPhone(trimmed);
    return `${normalizedPhone}@deekshatailors.com`;
  }
  return `${trimmed.replace(/\s+/g, '')}@deekshatailors.com`;
}

/**
 * Returns candidate emails when signing in with a mobile number or username without '@',
 * checking '@deekshatailors.com' first and falling back to '@deekshaladiestailor.com'.
 */
export function getAdminLoginEmailCandidates(identifier: string): string[] {
  const trimmed = identifier.trim();
  if (!trimmed) return [];
  if (trimmed.includes('@')) return [trimmed];

  const primary = formatAdminLoginEmail(trimmed);
  const localPart = primary.split('@')[0];
  if (!localPart) return [];
  return Array.from(new Set([primary, `${localPart}@deekshaladiestailor.com`]));
}

export function sanitizeRtdbKey(rawKey: string): string {
  const cleaned = String(rawKey ?? '')
    .trim()
    .replace(/[.#$\[\]/\s]+/g, '_');
  return cleaned || 'record';
}

export function stripUndefined<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)).filter((item) => item !== undefined) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

export function extractRtdbRecords<T extends object = Record<string, unknown>>(snapshotVal: unknown): T[] {
  if (!snapshotVal) return [];
  if (Array.isArray(snapshotVal)) {
    return snapshotVal.filter((item): item is T => Boolean(item && typeof item === 'object'));
  }
  if (typeof snapshotVal === 'object') {
    const out: T[] = [];
    for (const [key, val] of Object.entries(snapshotVal as Record<string, unknown>)) {
      if (key === '_meta' || !val || typeof val !== 'object') continue;
      const obj = val as Record<string, unknown>;
      if (!obj.id) {
        out.push({ id: key, ...obj } as T);
      } else {
        out.push(obj as T);
      }
    }
    return out;
  }
  return [];
}

function normalizeServiceOfferings(raw: unknown): ServiceOffering[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((s, idx) => ({
      number: String(s.number ?? String(idx + 1).padStart(2, '0')).trim() || String(idx + 1).padStart(2, '0'),
      title: String(s.title ?? '').trim(),
      description: String(s.description ?? '').trim(),
      startingPrice: Math.max(0, Number(s.startingPrice) || 0),
      highlights: Array.isArray(s.highlights)
        ? s.highlights.map((h) => String(h).trim()).filter(Boolean)
        : [],
    }))
    .filter((s) => s.title.length > 0);
}

export function serializeCatalogForRtdbServices(catalog: CatalogConfig): Record<string, unknown> {
  return stripUndefined({
    catalogInitialized: true,
    updatedAt: new Date().toISOString(),
    services: catalog.services,
    designPatterns: catalog.designPatterns,
    matchingRates: catalog.matchingRates,
    estimatorGarments: catalog.estimatorGarments,
    estimatorTurnarounds: catalog.estimatorTurnarounds,
    estimatorAddons: catalog.estimatorAddons,
  });
}

/**
 * Parses Firebase RTDB `/services` snapshot into a full CatalogConfig.
 * Once cloud data exists (`catalogInitialized` or structured fields), cloud values
 * are treated as authoritative and never fall back to hardcoded defaults.
 */
export function parseRtdbServicesSnapshot(
  rawVal: unknown,
  fallbackCatalog: CatalogConfig = DEFAULT_CATALOG,
): { initialized: boolean; catalog: CatalogConfig } {
  if (!rawVal || typeof rawVal !== 'object') {
    return { initialized: false, catalog: fallbackCatalog };
  }

  // Case 1: Array of ServiceOffering stored directly under /services
  if (Array.isArray(rawVal)) {
    const services = normalizeServiceOfferings(rawVal);
    return {
      initialized: true,
      catalog: {
        ...fallbackCatalog,
        services,
      },
    };
  }

  const obj = rawVal as Record<string, unknown>;
  const hasCatalogKeys =
    obj.catalogInitialized === true ||
    'services' in obj ||
    'estimatorGarments' in obj ||
    'matchingRates' in obj ||
    'designPatterns' in obj;

  if (hasCatalogKeys) {
    const services = 'services' in obj
      ? normalizeServiceOfferings(obj.services)
      : fallbackCatalog.services;

    const designPatterns = Array.isArray(obj.designPatterns)
      ? (obj.designPatterns as DesignPattern[]).filter((p) => p && typeof p.name === 'string' && p.name.trim())
      : 'designPatterns' in obj
        ? []
        : fallbackCatalog.designPatterns;

    const matchingRates = Array.isArray(obj.matchingRates)
      ? (obj.matchingRates as MatchingRateItem[]).filter((m) => m && typeof m.name === 'string' && m.name.trim())
      : 'matchingRates' in obj
        ? []
        : fallbackCatalog.matchingRates;

    const estimatorGarments = Array.isArray(obj.estimatorGarments)
      ? (obj.estimatorGarments as GarmentOption[]).filter((g) => g && typeof g.name === 'string' && g.name.trim())
      : 'estimatorGarments' in obj
        ? []
        : fallbackCatalog.estimatorGarments;

    const estimatorTurnarounds = Array.isArray(obj.estimatorTurnarounds)
      ? (obj.estimatorTurnarounds as TurnaroundOption[]).filter((t) => t && typeof t.name === 'string' && t.name.trim())
      : 'estimatorTurnarounds' in obj
        ? []
        : fallbackCatalog.estimatorTurnarounds;

    const estimatorAddons = Array.isArray(obj.estimatorAddons)
      ? (obj.estimatorAddons as AddonOption[]).filter((a) => a && typeof a.label === 'string' && a.label.trim())
      : 'estimatorAddons' in obj
        ? []
        : fallbackCatalog.estimatorAddons;

    return {
      initialized: true,
      catalog: {
        services,
        designPatterns,
        matchingRates,
        estimatorGarments,
        estimatorTurnarounds,
        estimatorAddons,
      },
    };
  }

  // Case 2: Map of keyed ServiceOffering objects { key: { title, startingPrice, ... } }
  const mapItems = normalizeServiceOfferings(Object.values(obj));
  if (mapItems.length > 0) {
    return {
      initialized: true,
      catalog: {
        ...fallbackCatalog,
        services: mapItems,
      },
    };
  }

  return { initialized: false, catalog: fallbackCatalog };
}

/**
 * Filters Firebase RTDB /orders records by exact Bill Number or 10-digit Mobile Number,
 * returning ONLY public customer fields (order status, items, delivery date, balance due).
 * Hides all 16 measurements, financial totals (subtotal/discount/advance), and staff records.
 */
export function filterCustomerPublicOrders(rawRecords: unknown, searchQuery: string): TrackedOrderResult[] {
  const trimmed = searchQuery.trim();
  if (!trimmed) return [];

  const cleanBill = trimmed.replace(/^#+/, '').toLowerCase();
  const digits = normalizeIndianPhone(trimmed);
  const hasValidMobile = /^[6-9]\d{9}$/.test(digits) || digits.length === 10;

  const list = Array.isArray(rawRecords) ? rawRecords : extractRtdbRecords(rawRecords);
  const normalizedOrders = mapBillingHtmlOrders(list);

  return normalizedOrders
    .filter((order) => {
      const billMatch = cleanBill.length > 0 && order.orderNo.toLowerCase() === cleanBill;
      const phoneMatch = hasValidMobile && normalizeIndianPhone(order.phone) === digits;
      return billMatch || phoneMatch;
    })
    .map(toTrackedOrderResult);
}

export function sortOrdersByNumberDesc<T extends { orderNo?: unknown }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const na = parseInt(String(a.orderNo ?? '0'), 10) || 0;
    const nb = parseInt(String(b.orderNo ?? '0'), 10) || 0;
    return nb - na;
  });
}

/**
 * Computes a Firebase RTDB multi-path update object `{ [key]: record | null }` for a collection.
 * Strictly guards against overwriting cloud data with empty lists.
 */
export function computeRtdbCollectionPatch<T extends Record<string, unknown>>(params: {
  localItems: T[];
  cloudMap: Record<string, T>;
  getKey: (item: T, index: number) => string;
  allowDeletions?: boolean;
}): Record<string, T | null> | null {
  const { localItems, cloudMap, getKey, allowDeletions = false } = params;

  // CRITICAL GUARD: Never overwrite cloud data with an empty list
  if (localItems.length === 0) {
    return null;
  }

  const localMap: Record<string, T> = {};
  const patch: Record<string, T | null> = {};
  let hasChanges = false;

  localItems.forEach((item, index) => {
    const key = sanitizeRtdbKey(getKey(item, index));
    const cleanItem = stripUndefined(item);
    localMap[key] = cleanItem;

    const existingCloud = cloudMap[key];
    if (!existingCloud || JSON.stringify(stripUndefined(existingCloud)) !== JSON.stringify(cleanItem)) {
      patch[key] = cleanItem;
      hasChanges = true;
    }
  });

  if (allowDeletions && Object.keys(localMap).length > 0) {
    for (const cloudKey of Object.keys(cloudMap)) {
      if (!(cloudKey in localMap)) {
        patch[cloudKey] = null;
        hasChanges = true;
      }
    }
  }

  return hasChanges ? patch : null;
}

const VALID_REVIEW_SOURCES = new Set<CustomerReview['source']>([
  'Google Business Profile',
  'Justdial Verified',
  'Boutique Counter',
  'Website Customer',
]);

export function normalizeReviewRecord(raw: unknown): CustomerReview | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? '').trim();
  const customerName = String(r.customerName ?? r.name ?? r.author ?? '').trim();
  const comment = String(r.comment ?? r.text ?? r.review ?? r.reviewText ?? r.message ?? '').trim();
  if (!id || !customerName || !comment) return null;

  const rawSource = String(r.source ?? 'Website Customer').trim() as CustomerReview['source'];
  const source: CustomerReview['source'] = VALID_REVIEW_SOURCES.has(rawSource) ? rawSource : 'Website Customer';
  const rawRating = Number(r.rating);
  const rating = Number.isFinite(rawRating) ? Math.min(5, Math.max(1, Math.round(rawRating))) : 5;
  const ownerReplyRaw = typeof r.ownerReply === 'string' ? r.ownerReply.trim() : '';

  return {
    id,
    customerName,
    rating,
    service: String(r.service ?? 'Tailoring Service').trim() || 'Tailoring Service',
    comment,
    source,
    visitDate: String(r.visitDate ?? r.date ?? '').trim() || 'Verified Visit',
    visible: r.visible !== false,
    featured: Boolean(r.featured),
    ...(ownerReplyRaw ? { ownerReply: ownerReplyRaw } : {}),
    createdAt: String(r.createdAt ?? '').trim() || new Date().toISOString(),
  };
}

/**
 * Combines Firebase RTDB `/reviews` records with baseline/server reviews so existing
 * reviews and newly submitted customer reviews always remain visible across all devices,
 * while honoring admin edits (`visible`, `ownerReply`) and explicit deletions (`deletedReviewIds`).
 */
export function mergeReviewsWithCloud(params: {
  cloudReviews: unknown[];
  baselineReviews: CustomerReview[];
  reviewsInitialized?: boolean;
  deletedReviewIds?: Record<string, unknown> | string[];
}): CustomerReview[] {
  const { cloudReviews, baselineReviews, deletedReviewIds } = params;

  const deletedSet = new Set<string>();
  if (Array.isArray(deletedReviewIds)) {
    for (const id of deletedReviewIds) {
      const cleanId = String(id ?? '').trim();
      if (cleanId) deletedSet.add(cleanId);
    }
  } else if (deletedReviewIds && typeof deletedReviewIds === 'object') {
    for (const [key, flag] of Object.entries(deletedReviewIds)) {
      if (flag === true) {
        deletedSet.add(key);
      }
    }
  }

  const normalizedCloud = cloudReviews
    .map(normalizeReviewRecord)
    .filter((item): item is CustomerReview => item !== null && !deletedSet.has(item.id));

  const byId = new Map<string, CustomerReview>();
  for (const base of baselineReviews) {
    const clean = normalizeReviewRecord(base);
    if (clean && !deletedSet.has(clean.id)) {
      byId.set(clean.id, clean);
    }
  }
  for (const cloudItem of normalizedCloud) {
    byId.set(cloudItem.id, cloudItem);
  }

  return Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

