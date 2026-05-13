'use client';
import { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, ChevronDown, ChevronUp, X, RotateCcw } from 'lucide-react';
import type { SyncStatus } from '@/hooks/useOfflineInventory';

interface Props {
  syncStatus: SyncStatus;
  onRetryFailed: () => Promise<void>;
  onDismissFailed: () => Promise<void>;
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10)  return 'just now';
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function SyncStatusBar({ syncStatus, onRetryFailed, onDismissFailed }: Props) {
  const [showFailed, setShowFailed] = useState(false);
  const { isOnline, isSyncing, pendingCount, failedCount, lastSyncAt, failedOps } = syncStatus;

  /* Nothing to show when everything is clean and online */
  if (isOnline && !isSyncing && pendingCount === 0 && failedCount === 0) {
    return (
      <div className="flex items-center gap-1.5 px-4 py-2 text-xs text-emerald-600 bg-emerald-50 border-b border-emerald-100">
        <CheckCircle size={12} />
        <span className="font-medium">All synced</span>
        {lastSyncAt && <span className="text-emerald-500 ml-1">· {relativeTime(lastSyncAt)}</span>}
      </div>
    );
  }

  /* Offline with pending changes */
  if (!isOnline) {
    return (
      <div className="px-4 py-2.5 bg-slate-800 text-white text-xs flex items-center gap-2">
        <WifiOff size={13} className="text-slate-400 shrink-0" />
        <span className="font-semibold">You're offline</span>
        <span className="text-slate-400">·</span>
        {pendingCount > 0 ? (
          <span className="text-amber-300 font-medium">
            {pendingCount} change{pendingCount > 1 ? 's' : ''} queued — will sync when reconnected
          </span>
        ) : (
          <span className="text-slate-400">changes will sync automatically when reconnected</span>
        )}
      </div>
    );
  }

  /* Online, syncing */
  if (isSyncing) {
    return (
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs flex items-center gap-2 text-blue-700">
        <RefreshCw size={12} className="animate-spin" />
        <span className="font-medium">Syncing {pendingCount} change{pendingCount > 1 ? 's' : ''}…</span>
      </div>
    );
  }

  /* Online, pending changes not yet flushed */
  if (pendingCount > 0) {
    return (
      <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs flex items-center gap-2 text-amber-700">
        <RefreshCw size={12} />
        <span className="font-medium">{pendingCount} change{pendingCount > 1 ? 's' : ''} pending sync</span>
      </div>
    );
  }

  /* Failed ops */
  if (failedCount > 0) {
    return (
      <div className="border-b border-red-200">
        <div className="px-4 py-2.5 bg-red-50 text-xs flex items-center gap-2 text-red-700">
          <AlertCircle size={13} className="shrink-0" />
          <span className="font-semibold flex-1">
            {failedCount} change{failedCount > 1 ? 's' : ''} failed to sync
          </span>
          <button
            onClick={onRetryFailed}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 font-semibold transition-colors"
          >
            <RotateCcw size={11} /> Retry
          </button>
          <button
            onClick={onDismissFailed}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
            title="Dismiss — local changes will be reverted"
          >
            <X size={11} /> Dismiss
          </button>
          <button
            onClick={() => setShowFailed(!showFailed)}
            className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors"
          >
            {showFailed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {showFailed && (
          <div className="bg-white border-t border-red-100 px-4 py-3 space-y-2">
            {failedOps.map((op) => (
              <div key={op.id} className="flex items-start gap-3 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-slate-700">{op.label}</p>
                  <p className="text-red-500 mt-0.5">{op.last_error ?? 'Unknown error'}</p>
                </div>
                <span className="text-slate-400 shrink-0">
                  {new Date(op.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
