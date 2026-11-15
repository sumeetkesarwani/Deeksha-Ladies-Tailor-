import { get, onValue, ref, remove, set, update, type Unsubscribe } from 'firebase/database';
import { rtdb } from '../firebase.ts';
import type { CatalogConfig, CustomerReview, FittingAppointment, ShopDetails } from '../types.ts';
import type { TrackedOrderResult } from './tailoring.ts';
import {
  computeRtdbCollectionPatch,
  extractRtdbRecords,
  filterCustomerPublicOrders,
  mergeReviewsWithCloud,
  sanitizeRtdbKey,
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
      'site/reviewsInitialized': true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteReviewFromRtdb(reviewId: string, remainingReviews?: CustomerReview[]): Promise<boolean> {
  try {
    if (remainingReviews) {
      await syncAllReviewsToRtdb(remainingReviews);
    } else {
      await remove(ref(rtdb, `reviews/${sanitizeRtdbKey(reviewId)}`));
      await set(ref(rtdb, 'site/reviewsInitialized'), true);
    }
    return true;
  } catch {
    return false;
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

export async function saveCatalogToRtdb(catalog: CatalogConfig): Promise<boolean> {
  try {
    await set(ref(rtdb, 'site/catalog'), stripUndefined(catalog));
    return true;
  } catch {
    return false;
  }
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
 * Subscribes to live public storefront updates from Firebase RTDB (`reviews`, `site/shopDetails`, `site/catalog`)
 * so customer reviews and Admin edits appear across all devices without needing reloads.
 */
export function subscribePublicStorefrontRtdb(options: {
  getBaselineReviews: () => CustomerReview[];
  onReviewsUpdate: (allReviews: CustomerReview[]) => void;
  onShopDetailsUpdate: (shopDetails: ShopDetails) => void;
  onCatalogUpdate: (catalog: CatalogConfig) => void;
}): () => void {
  const { getBaselineReviews, onReviewsUpdate, onShopDetailsUpdate, onCatalogUpdate } = options;

  let latestCloudReviews: unknown[] = [];
  let reviewsInitialized = false;
  let hasReviewsSnapshot = false;

  const emitMergedReviews = () => {
    if (!hasReviewsSnapshot && !reviewsInitialized) return;
    const merged = mergeReviewsWithCloud({
      cloudReviews: latestCloudReviews,
      baselineReviews: getBaselineReviews(),
      reviewsInitialized,
    });
    onReviewsUpdate(merged);
  };

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
        reviewsInitialized?: boolean;
        shopDetails?: ShopDetails;
        catalog?: CatalogConfig;
      } | null;
      if (!siteVal || typeof siteVal !== 'object') return;

      if (typeof siteVal.reviewsInitialized === 'boolean') {
        reviewsInitialized = siteVal.reviewsInitialized;
        emitMergedReviews();
      }
      if (siteVal.shopDetails && typeof siteVal.shopDetails === 'object' && siteVal.shopDetails.businessName) {
        onShopDetailsUpdate(siteVal.shopDetails);
      }
      if (
        siteVal.catalog &&
        typeof siteVal.catalog === 'object' &&
        Array.isArray(siteVal.catalog.estimatorGarments) &&
        siteVal.catalog.estimatorGarments.length > 0
      ) {
        onCatalogUpdate(siteVal.catalog);
      }
    },
    () => {
      // Keep server-provided shopDetails & catalog if Firebase read fails
    },
  );

  return () => {
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
