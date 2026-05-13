/**
 * Sync Manager
 *
 * Handles the two directions of offline-first sync:
 *
 *  1. Server → Local (hydrate):
 *     Fetch fresh inventory from the API and write into IndexedDB.
 *     Called on page load (when online) and after reconnect.
 *
 *  2. Local → Server (flush):
 *     Replay pending mutations from the sync queue against the API.
 *     Called immediately when a mutation happens (if online) and on reconnect.
 *
 * Conflict strategy: delta-based optimistic writes.
 * - We always send deltas (+N / -N) not absolute values, so concurrent
 *   mutations on the server (e.g., online order reservations) compose cleanly.
 * - If the server rejects a delta (422 — stock would go negative), the op is
 *   marked 'failed' and the local optimistic update is rolled back.
 * - After every successful flush we re-hydrate so local state converges to
 *   the true server state.
 */

import {
  SyncQueueEntry,
  LocalInventoryItem,
  enqueueOp,
  getPendingOps,
  updateQueueEntry,
  deleteQueueEntry,
  getLocalInventory,
  putLocalInventoryItems,
  patchLocalInventoryItem,
  setMeta,
} from './db';
import { api } from './api';

/* ─── tiny uuid shim (no extra dep) ──────────────────────────────────────── */
function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ─── Sync state (in-memory, non-reactive) ──────────────────────────────── */
let _isSyncing = false;
const _listeners: Set<() => void> = new Set();

export function subscribeSyncState(cb: () => void) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

function notifyListeners() {
  _listeners.forEach((cb) => cb());
}

export function isSyncing() {
  return _isSyncing;
}

/* ─── Hydrate: Server → Local ────────────────────────────────────────────── */

export async function hydrateInventory(pharmacyId: string): Promise<void> {
  try {
    const res = await api.get(`/inventory/pharmacies/${pharmacyId}`);
    const serverItems: Record<string, unknown>[] = res.data;

    const local: LocalInventoryItem[] = serverItems.map((item) => ({
      ...(item as any),
      pharmacy_id: pharmacyId,
      _synced_at: Date.now(),
      _dirty: false,
    }));

    await putLocalInventoryItems(local);
    await setMeta('last_sync_at', Date.now());
    notifyListeners();
  } catch {
    // Silently fail — local data is still usable
  }
}

/* ─── Flush: Local → Server ─────────────────────────────────────────────── */

export async function flushSyncQueue(pharmacyId: string): Promise<void> {
  if (_isSyncing) return;
  _isSyncing = true;
  notifyListeners();

  try {
    const pending = await getPendingOps();
    // Process in creation order
    const ordered = [...pending].sort((a, b) => a.created_at - b.created_at);

    for (const op of ordered) {
      try {
        if (op.method === 'POST') {
          await api.post(op.endpoint, op.payload, { headers: op.headers });
        } else {
          await api.patch(op.endpoint, op.payload, { headers: op.headers });
        }
        // Success — remove from queue
        await deleteQueueEntry(op.id);
      } catch (err: any) {
        const status = err?.response?.status;
        const isPermFail = status === 422 || status === 404 || status === 400;

        if (isPermFail) {
          // Server rejected the mutation — roll back optimistic update
          if (op.rollback) {
            await patchLocalInventoryItem(op.rollback.medicine_id, {
              qty_on_hand: op.rollback.qty_on_hand_before,
              _dirty: false,
            });
            if (op.rollback.is_listed_before !== undefined) {
              await patchLocalInventoryItem(op.rollback.medicine_id, {
                is_listed: op.rollback.is_listed_before,
                _dirty: false,
              });
            }
          }
          await updateQueueEntry({
            ...op,
            status: 'failed',
            last_error: err?.response?.data?.detail ?? `HTTP ${status}`,
            attempts: op.attempts + 1,
          });
        } else {
          // Transient error (network, 5xx) — keep pending, bump attempt count
          await updateQueueEntry({ ...op, attempts: op.attempts + 1 });
          // Stop processing — will retry on next sync cycle
          break;
        }
      }
    }

    // Re-hydrate from server so local converges to truth
    await hydrateInventory(pharmacyId);
  } finally {
    _isSyncing = false;
    notifyListeners();
  }
}

/* ─── Enqueue helpers called by UI ──────────────────────────────────────── */

export async function enqueueSell(
  pharmacyId: string,
  medicineId: string,
  qty: number,
  notes: string,
  actorId: string,
): Promise<void> {
  // Optimistic update
  const localItems = await getLocalInventory(pharmacyId);
  const existing = localItems.find((i) => i.medicine_id === medicineId);
  if (!existing) return;

  await patchLocalInventoryItem(medicineId, {
    qty_on_hand: existing.qty_on_hand - qty,
    qty_available: existing.qty_available - qty,
    _dirty: true,
  });

  await enqueueOp({
    id: newId(),
    endpoint: `/inventory/pharmacies/${pharmacyId}/medicines/${medicineId}/adjust`,
    method: 'POST',
    payload: { delta: -qty, reason: 'walk_in_sale', notes },
    headers: { 'x-user-id': actorId },
    label: `Sell ${qty}× ${existing.medicine_name ?? medicineId}`,
    rollback: { medicine_id: medicineId, pharmacy_id: pharmacyId, qty_on_hand_before: existing.qty_on_hand },
    created_at: Date.now(),
    attempts: 0,
    status: 'pending',
  });
}

export async function enqueueReceive(
  pharmacyId: string,
  medicineId: string,
  medicineName: string,
  payload: {
    batch_no: string;
    expiry_date: string;
    qty_received: number;
    manufacture_date?: string;
    cost_paise?: number;
    notes?: string;
  },
  actorId: string,
): Promise<void> {
  const localItems = await getLocalInventory(pharmacyId);
  const existing = localItems.find((i) => i.medicine_id === medicineId);
  if (!existing) return;

  await patchLocalInventoryItem(medicineId, {
    qty_on_hand: existing.qty_on_hand + payload.qty_received,
    qty_available: existing.qty_available + payload.qty_received,
    current_batch_no: payload.batch_no,
    current_expiry: payload.expiry_date,
    _dirty: true,
  });

  await enqueueOp({
    id: newId(),
    endpoint: `/inventory/pharmacies/${pharmacyId}/medicines/${medicineId}/receive`,
    method: 'POST',
    payload: payload as Record<string, unknown>,
    headers: { 'x-user-id': actorId },
    label: `Receive ${payload.qty_received}× ${medicineName}`,
    rollback: { medicine_id: medicineId, pharmacy_id: pharmacyId, qty_on_hand_before: existing.qty_on_hand },
    created_at: Date.now(),
    attempts: 0,
    status: 'pending',
  });
}

export async function enqueueAdjust(
  pharmacyId: string,
  medicineId: string,
  medicineName: string,
  delta: number,
  reason: string,
  notes: string,
  actorId: string,
): Promise<void> {
  const localItems = await getLocalInventory(pharmacyId);
  const existing = localItems.find((i) => i.medicine_id === medicineId);
  if (!existing) return;

  await patchLocalInventoryItem(medicineId, {
    qty_on_hand: existing.qty_on_hand + delta,
    qty_available: existing.qty_available + delta,
    _dirty: true,
  });

  await enqueueOp({
    id: newId(),
    endpoint: `/inventory/pharmacies/${pharmacyId}/medicines/${medicineId}/adjust`,
    method: 'POST',
    payload: { delta, reason, notes: notes || undefined },
    headers: { 'x-user-id': actorId },
    label: `${reason} ${delta > 0 ? '+' : ''}${delta} ${medicineName}`,
    rollback: { medicine_id: medicineId, pharmacy_id: pharmacyId, qty_on_hand_before: existing.qty_on_hand },
    created_at: Date.now(),
    attempts: 0,
    status: 'pending',
  });
}

export async function enqueueToggleListing(
  pharmacyId: string,
  medicineId: string,
  isListed: boolean,
  actorId: string,
): Promise<void> {
  const localItems = await getLocalInventory(pharmacyId);
  const existing = localItems.find((i) => i.medicine_id === medicineId);
  if (!existing) return;

  await patchLocalInventoryItem(medicineId, {
    is_listed: isListed,
    _dirty: true,
  });

  await enqueueOp({
    id: newId(),
    endpoint: `/inventory/pharmacies/${pharmacyId}/medicines/${medicineId}/listing`,
    method: 'PATCH',
    payload: { is_listed: isListed, reason: isListed ? undefined : 'Out of stock' },
    headers: { 'x-user-id': actorId },
    label: `${isListed ? 'List' : 'Unlist'} ${medicineId}`,
    rollback: {
      medicine_id: medicineId,
      pharmacy_id: pharmacyId,
      qty_on_hand_before: existing.qty_on_hand,
      is_listed_before: existing.is_listed,
    },
    created_at: Date.now(),
    attempts: 0,
    status: 'pending',
  });
}
