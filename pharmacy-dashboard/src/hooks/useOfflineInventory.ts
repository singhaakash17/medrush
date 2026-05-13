'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { LocalInventoryItem, SyncQueueEntry, getLocalInventory, getAllQueuedOps, getMeta, clearFailedOps } from '@/lib/db';
import {
  hydrateInventory, flushSyncQueue,
  enqueueSell, enqueueReceive, enqueueAdjust, enqueueToggleListing,
  subscribeSyncState, isSyncing,
} from '@/lib/syncManager';
import { useNetworkStatus } from './useNetworkStatus';

function actorId(): string {
  if (typeof window === 'undefined') return 'system';
  return localStorage.getItem('user_id') || 'system';
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncAt: number | null;
  failedOps: SyncQueueEntry[];
}

export interface OfflineInventoryResult {
  items: LocalInventoryItem[];
  isLoading: boolean;
  syncStatus: SyncStatus;
  /** Set of medicine_ids with pending or failed ops — show dirty indicator */
  dirtyIds: Set<string>;
  sell:   (medicineId: string, medicineName: string, qty: number, notes: string) => Promise<void>;
  receive:(medicineId: string, medicineName: string, payload: ReceivePayload)     => Promise<void>;
  adjust: (medicineId: string, medicineName: string, delta: number, reason: string, notes: string) => Promise<void>;
  toggle: (medicineId: string, isListed: boolean)                                => Promise<void>;
  retryFailed: () => Promise<void>;
  dismissFailed: () => Promise<void>;
}

export interface ReceivePayload {
  batch_no: string;
  expiry_date: string;
  qty_received: number;
  manufacture_date?: string;
  cost_paise?: number;
  notes?: string;
}

export function useOfflineInventory(pharmacyId: string): OfflineInventoryResult {
  const isOnline = useNetworkStatus();
  const [items, setItems] = useState<LocalInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [queuedOps, setQueuedOps] = useState<SyncQueueEntry[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [, forceRender] = useState(0);
  const syncingRef = useRef(false);

  /* ── Load from local DB ─────────────────────────────────────── */
  const loadLocal = useCallback(async () => {
    if (!pharmacyId) return;
    const [localItems, ops, syncedAt] = await Promise.all([
      getLocalInventory(pharmacyId),
      getAllQueuedOps(),
      getMeta('last_sync_at'),
    ]);
    setItems(localItems);
    setQueuedOps(ops);
    setLastSyncAt((syncedAt as number) ?? null);
    setIsLoading(localItems.length === 0);
  }, [pharmacyId]);

  /* ── Initial load ───────────────────────────────────────────── */
  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  /* ── Sync state change listener ─────────────────────────────── */
  useEffect(() => {
    const unsub = subscribeSyncState(() => {
      syncingRef.current = isSyncing();
      forceRender((n) => n + 1);
      loadLocal();
    });
    return () => { unsub(); };
  }, [loadLocal]);

  /* ── When we go online: hydrate then flush ──────────────────── */
  useEffect(() => {
    if (!isOnline || !pharmacyId) return;
    (async () => {
      setIsLoading(items.length === 0);
      await hydrateInventory(pharmacyId);
      await flushSyncQueue(pharmacyId);
      await loadLocal();
      setIsLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, pharmacyId]);

  /* ── Derived sync status ────────────────────────────────────── */
  const failedOps   = queuedOps.filter((o) => o.status === 'failed');
  const pendingOps  = queuedOps.filter((o) => o.status === 'pending');
  const dirtyIds    = new Set(
    queuedOps.map((o) => o.rollback?.medicine_id).filter(Boolean) as string[],
  );

  const syncStatus: SyncStatus = {
    isOnline,
    isSyncing: syncingRef.current,
    pendingCount: pendingOps.length,
    failedCount: failedOps.length,
    lastSyncAt,
    failedOps,
  };

  /* ── Mutation helpers (enqueue + optionally flush) ──────────── */
  const afterMutation = async () => {
    await loadLocal();
    if (isOnline) await flushSyncQueue(pharmacyId);
  };

  const sell = async (medicineId: string, medicineName: string, qty: number, notes: string) => {
    await enqueueSell(pharmacyId, medicineId, qty, notes, actorId());
    await afterMutation();
  };

  const receive = async (medicineId: string, medicineName: string, payload: ReceivePayload) => {
    await enqueueReceive(pharmacyId, medicineId, medicineName, payload, actorId());
    await afterMutation();
  };

  const adjust = async (medicineId: string, medicineName: string, delta: number, reason: string, notes: string) => {
    await enqueueAdjust(pharmacyId, medicineId, medicineName, delta, reason, notes, actorId());
    await afterMutation();
  };

  const toggle = async (medicineId: string, isListed: boolean) => {
    await enqueueToggleListing(pharmacyId, medicineId, isListed, actorId());
    await afterMutation();
  };

  const retryFailed = async () => {
    // Reset failed ops back to pending so flushSyncQueue picks them up
    const { getFailedOps, updateQueueEntry } = await import('@/lib/db');
    const failed = await getFailedOps();
    for (const op of failed) {
      await updateQueueEntry({ ...op, status: 'pending', attempts: 0, last_error: undefined });
    }
    await afterMutation();
  };

  const dismissFailed = async () => {
    await clearFailedOps();
    await loadLocal();
  };

  return { items, isLoading, syncStatus, dirtyIds, sell, receive, adjust, toggle, retryFailed, dismissFailed };
}
