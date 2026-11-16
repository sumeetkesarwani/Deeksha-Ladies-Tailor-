import { get, onValue, push, ref, remove, set, update, type Unsubscribe } from 'firebase/database';
import { rtdb } from '../firebase.ts';
import type { CatalogConfig, CustomerReview, FittingAppointment, ShopDetails } from '../types.ts';
import type { TrackedOrderResult } from './tailoring.ts';
import {
  computeRtdbCollectionPatch,
  extractRtdbRecords,
  filterCustomerPublicOrders,
  mergeReviewsWithCloud,
  parseRtdbServicesSnapshot,
  sanitizeRtdbKey,
  serializeCatalogForRtdbServices,
  sortOrdersByNumberDesc,
  stripUndefined,
} from './firebaseSyncHelpers.ts';

export interface RtdbCollectionController<T extends Record<string, unknown>> {
  pushLocalToCloud: (allowDeletions?: boolean) => Promise<void>;
  deleteKeyFromCloud: (rawKey: string) => Promise<void>;
  stop: () => void;
}

/**
 * Queries Firebase Realtime Database (/orders) for public order tracking.
 * Strictly returns only public fields (orderNo, status, items, deliveryDate, balance).
 */
export async function queryPublicOrdersFromRtdb(searchQuery: string): Promise<TrackedOrderResult[]> {
  const snapshot = await get(ref(rtdb, 'orders'));
  if (!snapshot.exists()) {
    return [];
  }
  const records = extractRtdbRecords(snapshot.val());
  return filterCustomerPublicOrders(records, searchQuery);
}

/**
 * Creates a brand-new customer review directly in Firebase RTDB (/reviews) using push()/set()
 * without requiring login so any customer review saves immediately to the cloud.
 */
export async function publishNewReviewToRtdb(input: {
  customerName: string;
  rating: number;
  service: string;
  comment: string;
}): Promise<{ ok: boolean; review: CustomerReview }> {
  const newRef = push(ref(rtdb, 'reviews'));
  const reviewId = newRef.key || `rev-${Date.now()}`;
  const review: CustomerReview = {
    id: reviewId,
    customerName: input.customerName.trim(),
    rating: Number(input.rating),
    service: input.service.trim(),
    comment: input.comment.trim(),
    source: 'Website Customer',
    visitDate: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    visible: true,
    featured: false,
    createdAt: new Date().toISOString(),
  };

  try {
    await set(newRef, stripUndefined(review));
    return { ok: true, review };
  } catch {
    return { ok: false, review };
  }
}

/**
 * Publishes or updates a single customer review in Firebase RTDB (/reviews/{id})
 * so all devices see new customer reviews and shop replies immediately.
 */
export async function publishReviewToRtdb(review: CustomerReview): Promise<boolean> {
  try {
    const key = sanitizeRtdbKey(review.id);
    await set(ref(rtdb, `reviews/${key}`), stripUndefined(review));
    return true;
  } catch {
    return false;
  }
}

export async function syncAllReviewsToRtdb(reviews: CustomerReview[]): Promise<boolean> {
  try {
    const reviewsMap: Record<string, CustomerReview> = {};
    for (const r of reviews) {
      reviewsMap[sanitizeRtdbKey(r.id)] = stripUndefined(r);
    }
    await update(ref(rtdb), {
      reviews: reviewsMap,
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteReviewFromRtdb(reviewId: string): Promise<boolean> {
  const safeKey = sanitizeRtdbKey(reviewId);
  try {
    await update(ref(rtdb), {
      [`reviews/${safeKey}`]: null,
      [`site/deletedReviewIds/${safeKey}`]: true,
    });
    return true;
  } catch {
    const [removeRes, markRes] = await Promise.allSettled([
      remove(ref(rtdb, `reviews/${safeKey}`)),
      set(ref(rtdb, `site/deletedReviewIds/${safeKey}`), true),
    ]);
    return removeRes.status === 'fulfilled' || markRes.status === 'fulfilled';
  }
}

export async function saveShopDetailsToRtdb(shopDetails: ShopDetails): Promise<boolean> {
  try {
    await set(ref(rtdb, 'site/shopDetails'), stripUndefined(shopDetails));
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves live service offerings & estimator pricing directly to Firebase RTDB `/services`
 * (and mirrors to `/site/catalog`), returning true if Firebase accepts `/services` or `/site/catalog`.
 */
export async function saveCatalogToRtdb(catalog: CatalogConfig): Promise<boolean> {
  const servicesPayload = serializeCatalogForRtdbServices(catalog);
  const siteCatalogPayload = stripUndefined(catalog);
  const results = await Promise.allSettled([
    set(ref(rtdb, 'services'), servicesPayload),
    set(ref(rtdb, 'site/catalog'), siteCatalogPayload),
  ]);
  return results.some((r) => r.status === 'fulfilled');
}

export async function saveAppointmentToRtdb(appointment: FittingAppointment): Promise<boolean> {
  try {
    await set(ref(rtdb, `appointments/${sanitizeRtdbKey(appointment.id)}`), stripUndefined(appointment));
    return true;
  } catch {
    return false;
  }
}

export function subscribeAppointmentsRtdb(
  onAppointmentsUpdate: (appointments: FittingAppointment[]) => void,
): Unsubscribe {
  return onValue(
    ref(rtdb, 'appointments'),
    (snapshot) => {
      if (!snapshot.exists()) return;
      const items = extractRtdbRecords<FittingAppointment>(snapshot.val()).sort((a, b) =>
        String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')),
      );
      onAppointmentsUpdate(items);
    },
    () => {
      // ignore read permission errors gracefully
    },
  );
}

/**
 * Subscribes to live public storefront updates from Firebase RTDB (`services`, `reviews`, `site/shopDetails`, `site/catalog`)
 * so pricing edits and customer reviews appear in real time across all devices without falling back to hardcoded defaults.
 */
export function subscribePublicStorefrontRtdb(options: {
  getBaselineReviews: () => CustomerReview[];
  onReviewsUpdate: (allReviews: CustomerReview[]) => void;
  onShopDetailsUpdate: (shopDetails: ShopDetails) => void;
  onCatalogUpdate: (catalog: CatalogConfig) => void;
}): () => void {
  const { getBaselineReviews, onReviewsUpdate, onShopDetailsUpdate, onCatalogUpdate } = options;

  let latestCloudReviews: unknown[] = [];
  let deletedReviewIds: Record<string, unknown> = {};
  let hasReviewsSnapshot = false;
  let hasCloudServices = false;

  const emitMergedReviews = () => {
    if (!hasReviewsSnapshot && Object.keys(deletedReviewIds).length === 0) return;
    const merged = mergeReviewsWithCloud({
      cloudReviews: latestCloudReviews,
      baselineReviews: getBaselineReviews(),
      deletedReviewIds,
    });
    onReviewsUpdate(merged);
  };

  const unsubServices = onValue(
    ref(rtdb, 'services'),
    (snapshot) => {
      if (!snapshot.exists()) return;
      const parsed = parseRtdbServicesSnapshot(snapshot.val());
      if (parsed.initialized) {
        hasCloudServices = true;
        onCatalogUpdate(parsed.catalog);
      }
    },
    () => {
      // Keep fallback/server catalog if Firebase read fails
    },
  );

  const unsubReviews = onValue(
    ref(rtdb, 'reviews'),
    (snapshot) => {
      hasReviewsSnapshot = true;
      latestCloudReviews = snapshot.exists() ? extractRtdbRecords(snapshot.val()) : [];
      emitMergedReviews();
    },
    () => {
      // Keep local/server reviews if Firebase read fails
    },
  );

  const unsubSite = onValue(
    ref(rtdb, 'site'),
    (snapshot) => {
      if (!snapshot.exists()) return;
      const siteVal = snapshot.val() as {
        deletedReviewIds?: Record<string, unknown>;
        shopDetails?: ShopDetails;
        catalog?: CatalogConfig;
      } | null;
      if (!siteVal || typeof siteVal !== 'object') return;

      if (siteVal.deletedReviewIds && typeof siteVal.deletedReviewIds === 'object') {
        deletedReviewIds = siteVal.deletedReviewIds;
        emitMergedReviews();
      }
      if (siteVal.shopDetails && typeof siteVal.shopDetails === 'object' && siteVal.shopDetails.businessName) {
        onShopDetailsUpdate(siteVal.shopDetails);
      }
      if (!hasCloudServices && siteVal.catalog && typeof siteVal.catalog === 'object') {
        const parsed = parseRtdbServicesSnapshot(siteVal.catalog);
        if (parsed.initialized) {
          onCatalogUpdate(parsed.catalog);
        }
      }
    },
    () => {
      // Keep server-provided shopDetails & catalog if Firebase read fails
    },
  );

  return () => {
    unsubServices();
    unsubReviews();
    unsubSite();
  };
}

/**
 * Creates a bidirectional real-time Firebase RTDB collection bridge for a localStorage key.
 * - Subscribes to `onValue` on the RTDB path (`orders`, `staff`, `attendance`, `production`).
 * - Never overwrites cloud data with an empty list on boot or reconnect.
 * - When cloud is initially empty and local device has records, pushes local records up safely.
 */
export function createRtdbCollectionSync<T extends Record<string, unknown>>(options: {
  rtdbPath: 'orders' | 'staff' | 'attendance' | 'production';
  storageKey: string;
  getKey: (item: T, index: number) => string;
  sortItems?: (items: T[]) => T[];
  onCloudApplied: () => void;
  onSyncError?: (error: unknown) => void;
}): RtdbCollectionController<T> {
  const { rtdbPath, storageKey, getKey, sortItems, onCloudApplied, onSyncError } = options;
  const dbRef = ref(rtdb, rtdbPath);

  let cloudMap: Record<string, T> = {};
  let hasReceivedFirstCloudSnapshot = false;
  let hadNonEmptyCloud = false;
  let stopped = false;

  const readLocal = (): T[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is T => Boolean(x && typeof x === 'object')) : [];
    } catch {
      return [];
    }
  };

  const writeLocal = (items: T[]) => {
    try {
      const finalItems = sortItems ? sortItems(items) : items;
      localStorage.setItem(storageKey, JSON.stringify(finalItems));
    } catch {
      // ignore storage quota errors
    }
  };

  const toKeyedMap = (items: T[]): Record<string, T> => {
    const map: Record<string, T> = {};
    items.forEach((item, idx) => {
      map[sanitizeRtdbKey(getKey(item, idx))] = item;
    });
    return map;
  };

  const pushLocalToCloud = async (allowDeletions = false): Promise<void> => {
    if (stopped || !hasReceivedFirstCloudSnapshot) return;
    const localItems = readLocal();
    // Never push empty list onto cloud automatically
    if (localItems.length === 0) return;

    const patch = computeRtdbCollectionPatch({
      localItems,
      cloudMap,
      getKey,
      allowDeletions,
    });
    if (!patch) return;

    try {
      await update(dbRef, patch);
      // Optimistically reflect pushed patch in cloudMap
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) {
          delete cloudMap[k];
        } else {
          cloudMap[k] = v;
        }
      }
      if (Object.keys(cloudMap).length > 0) {
        hadNonEmptyCloud = true;
      }
    } catch (err) {
      onSyncError?.(err);
    }
  };

  const deleteKeyFromCloud = async (rawKey: string): Promise<void> => {
    if (stopped || !hasReceivedFirstCloudSnapshot) return;
    const safeKey = sanitizeRtdbKey(rawKey);
    try {
      await remove(ref(rtdb, `${rtdbPath}/${safeKey}`));
      delete cloudMap[safeKey];
    } catch (err) {
      onSyncError?.(err);
    }
  };

  const unsubscribe: Unsubscribe = onValue(
    dbRef,
    (snapshot) => {
      if (stopped) return;
      hasReceivedFirstCloudSnapshot = true;

      const rawVal = snapshot.exists() ? snapshot.val() : null;
      const cloudItems = extractRtdbRecords<T>(rawVal);
      cloudMap = toKeyedMap(cloudItems);

      if (cloudItems.length > 0) {
        hadNonEmptyCloud = true;
        const sortedCloud = rtdbPath === 'orders' ? (sortOrdersByNumberDesc(cloudItems as Array<T & { orderNo?: unknown }>) as T[]) : cloudItems;
        const currentLocal = readLocal();
        const nextJson = JSON.stringify(sortItems ? sortItems(sortedCloud) : sortedCloud);
        const currentJson = JSON.stringify(sortItems ? sortItems(currentLocal) : currentLocal);
        if (nextJson !== currentJson) {
          writeLocal(sortedCloud);
          onCloudApplied();
        }
      } else {
        // Cloud node is currently empty
        const currentLocal = readLocal();
        if (hadNonEmptyCloud) {
          // Records existed earlier in this session and were explicitly deleted from cloud
          if (currentLocal.length > 0) {
            writeLocal([]);
            onCloudApplied();
          }
        } else if (currentLocal.length > 0) {
          // Initial migration: cloud is empty, local has records -> push local records safely
          void pushLocalToCloud(false);
        }
      }
    },
    (err) => {
      onSyncError?.(err);
    },
  );

  return {
    pushLocalToCloud,
    deleteKeyFromCloud,
    stop: () => {
      stopped = true;
      unsubscribe();
    },
  };
}
