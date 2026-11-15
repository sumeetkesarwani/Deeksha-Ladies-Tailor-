import { get, onValue, ref, remove, update, type Unsubscribe } from 'firebase/database';
import { rtdb } from '../firebase.ts';
import type { TrackedOrderResult } from './tailoring.ts';
import {
  computeRtdbCollectionPatch,
  extractRtdbRecords,
  filterCustomerPublicOrders,
  sanitizeRtdbKey,
  sortOrdersByNumberDesc,
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
