import {
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
 * If no '@' is present, normalizes phone digits (or identifier) and appends '@deekshaladiestailor.com'.
 */
export function formatAdminLoginEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (!trimmed) return '';
  if (trimmed.includes('@')) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 10) {
    const normalizedPhone = normalizeIndianPhone(trimmed);
    return `${normalizedPhone}@deekshaladiestailor.com`;
  }
  return `${trimmed.replace(/\s+/g, '')}@deekshaladiestailor.com`;
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

export function extractRtdbRecords<T extends Record<string, unknown>>(snapshotVal: unknown): T[] {
  if (!snapshotVal) return [];
  if (Array.isArray(snapshotVal)) {
    return snapshotVal.filter((item): item is T => Boolean(item && typeof item === 'object'));
  }
  if (typeof snapshotVal === 'object') {
    return Object.values(snapshotVal as Record<string, unknown>).filter((item): item is T =>
      Boolean(item && typeof item === 'object'),
    );
  }
  return [];
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
