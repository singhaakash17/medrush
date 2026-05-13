/**
 * IndexedDB schema for offline-first inventory.
 *
 * Stores:
 *   inventory_items  — local mirror of server inventory, keyed by medicine_id
 *   sync_queue       — pending API mutations that haven't reached the server yet
 *   meta             — key/value singletons (last_sync_at, etc.)
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface LocalInventoryItem {
  medicine_id: string;
  pharmacy_id: string;
  medicine_name?: string;
  generic_name?: string;
  form?: string;
  strength?: string;
  qty_on_hand: number;
  qty_reserved: number;
  qty_available: number;
  reorder_level: number;
  selling_price_paise: number;
  mrp_paise: number;
  current_batch_no?: string;
  current_expiry?: string;
  is_listed: boolean;
  unlisted_reason?: string;
  /** Timestamp of last server sync for this item */
  _synced_at: number;
  /** True when a pending mutation has been applied locally but not confirmed by server */
  _dirty: boolean;
}

export type SyncOpStatus = 'pending' | 'failed';

export interface SyncQueueEntry {
  /** uuid */
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH';
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  /** Human label shown in the UI */
  label: string;
  /** Used to roll back optimistic update on permanent failure */
  rollback?: {
    medicine_id: string;
    pharmacy_id: string;
    qty_on_hand_before: number;
    is_listed_before?: boolean;
  };
  created_at: number;
  attempts: number;
  status: SyncOpStatus;
  last_error?: string;
}

interface MedRushPharmacyDB extends DBSchema {
  inventory_items: {
    key: string; // medicine_id
    value: LocalInventoryItem;
    indexes: { by_pharmacy: string };
  };
  sync_queue: {
    key: string; // id
    value: SyncQueueEntry;
    indexes: { by_created_at: number; by_status: string };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

/* ─── Singleton DB ───────────────────────────────────────────────────────── */

let _db: IDBPDatabase<MedRushPharmacyDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<MedRushPharmacyDB>> {
  if (_db) return _db;
  _db = await openDB<MedRushPharmacyDB>('medrush_pharmacy_v1', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('inventory_items')) {
        const inv = db.createObjectStore('inventory_items', { keyPath: 'medicine_id' });
        inv.createIndex('by_pharmacy', 'pharmacy_id');
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        const q = db.createObjectStore('sync_queue', { keyPath: 'id' });
        q.createIndex('by_created_at', 'created_at');
        q.createIndex('by_status', 'status');
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    },
  });
  return _db;
}

/* ─── Inventory helpers ──────────────────────────────────────────────────── */

export async function getLocalInventory(pharmacyId: string): Promise<LocalInventoryItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('inventory_items', 'by_pharmacy', pharmacyId);
}

export async function putLocalInventoryItems(items: LocalInventoryItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('inventory_items', 'readwrite');
  await Promise.all(items.map((item) => tx.store.put(item)));
  await tx.done;
}

export async function patchLocalInventoryItem(
  medicineId: string,
  patch: Partial<LocalInventoryItem>,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('inventory_items', medicineId);
  if (!existing) return;
  await db.put('inventory_items', { ...existing, ...patch, _dirty: true });
}

/* ─── Sync queue helpers ─────────────────────────────────────────────────── */

export async function enqueueOp(entry: SyncQueueEntry): Promise<void> {
  const db = await getDB();
  await db.put('sync_queue', entry);
}

export async function getPendingOps(): Promise<SyncQueueEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex('sync_queue', 'by_status', 'pending');
}

export async function getFailedOps(): Promise<SyncQueueEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex('sync_queue', 'by_status', 'failed');
}

export async function getAllQueuedOps(): Promise<SyncQueueEntry[]> {
  const db = await getDB();
  return db.getAll('sync_queue');
}

export async function updateQueueEntry(entry: SyncQueueEntry): Promise<void> {
  const db = await getDB();
  await db.put('sync_queue', entry);
}

export async function deleteQueueEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sync_queue', id);
}

export async function clearFailedOps(): Promise<void> {
  const db = await getDB();
  const failed = await getFailedOps();
  const tx = db.transaction('sync_queue', 'readwrite');
  await Promise.all(failed.map((e) => tx.store.delete(e.id)));
  await tx.done;
}

/* ─── Meta helpers ───────────────────────────────────────────────────────── */

export async function getMeta(key: string): Promise<unknown> {
  const db = await getDB();
  const row = await db.get('meta', key);
  return row?.value;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('meta', { key, value });
}
