'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, formatPaise } from '@/lib/api';
import { ShoppingCart, Package, RefreshCw, TrendingDown, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface LedgerEntry {
  id: number;
  medicine_id: string;
  delta_qty: number;
  reason: string;
  reference_id: string | null;
  qty_after: number;
  actor_id: string | null;
  notes: string | null;
  occurred_at: string;
}

function usePharmacyId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pharmacy_id') ?? '';
}

const REASON_META: Record<string, { label: string; color: string; icon: string }> = {
  walk_in_sale:  { label: 'Walk-in Sale',   color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: '🛒' },
  restock:       { label: 'Restock',        color: 'text-blue-700 bg-blue-50 border-blue-200',          icon: '📦' },
  reservation:   { label: 'Online Order',   color: 'text-violet-700 bg-violet-50 border-violet-200',    icon: '📱' },
  committed:     { label: 'Delivered',      color: 'text-slate-600 bg-slate-50 border-slate-200',       icon: '✅' },
  released:      { label: 'Cancelled',      color: 'text-red-600 bg-red-50 border-red-200',             icon: '↩️' },
  write_off:     { label: 'Write-off',      color: 'text-orange-700 bg-orange-50 border-orange-200',    icon: '🗑️' },
  damage:        { label: 'Damage',         color: 'text-red-700 bg-red-50 border-red-200',             icon: '💥' },
  expiry:        { label: 'Expiry',         color: 'text-red-700 bg-red-50 border-red-200',             icon: '⏰' },
  correction:    { label: 'Correction',     color: 'text-slate-700 bg-slate-50 border-slate-200',       icon: '✏️' },
  theft:         { label: 'Theft',          color: 'text-red-700 bg-red-50 border-red-200',             icon: '🚨' },
  erp_sync:      { label: 'ERP Sync',       color: 'text-slate-600 bg-slate-50 border-slate-200',       icon: '🔄' },
};

function reasonMeta(reason: string) {
  return REASON_META[reason] ?? { label: reason, color: 'text-slate-600 bg-slate-50 border-slate-200', icon: '•' };
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
}

type FilterType = 'all' | 'sales' | 'restock' | 'adjustments';

const FILTER_REASONS: Record<FilterType, string[]> = {
  all:         [],
  sales:       ['walk_in_sale', 'reservation'],
  restock:     ['restock'],
  adjustments: ['write_off', 'damage', 'expiry', 'correction', 'theft', 'released'],
};

export default function SalesPage() {
  const pharmacyId = usePharmacyId();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: entries = [], isLoading, refetch, isFetching } = useQuery<LedgerEntry[]>({
    queryKey: ['ledger', pharmacyId],
    queryFn: async () => (await api.get(`/inventory/pharmacies/${pharmacyId}/ledger`, { params: { limit: 200 } })).data,
    enabled: !!pharmacyId,
    refetchInterval: 30_000,
  });

  const filtered = filter === 'all'
    ? entries
    : entries.filter((e) => FILTER_REASONS[filter].includes(e.reason));

  // Today's summary
  const todayStr = new Date().toDateString();
  const todayEntries = entries.filter((e) => new Date(e.occurred_at).toDateString() === todayStr);
  const todaySales = todayEntries.filter((e) => e.reason === 'walk_in_sale');
  const todayOnline = todayEntries.filter((e) => e.reason === 'reservation');
  const todayRestock = todayEntries.filter((e) => e.reason === 'restock');
  const totalUnitsSold = todaySales.reduce((s, e) => s + Math.abs(e.delta_qty), 0);
  const totalUnitsReceived = todayRestock.reduce((s, e) => s + e.delta_qty, 0);

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'sales', label: '🛒 Sales' },
    { id: 'restock', label: '📦 Restocks' },
    { id: 'adjustments', label: '✏️ Adjustments' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales & Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Complete inventory movement history</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Today's summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart size={14} className="text-emerald-500" />
            <p className="text-xs text-slate-500">Walk-in Sales Today</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{todaySales.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">{totalUnitsSold} units sold</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={14} className="text-violet-500" />
            <p className="text-xs text-slate-500">Online Orders Today</p>
          </div>
          <p className="text-2xl font-bold text-violet-600">{todayOnline.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">reservations</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle size={14} className="text-blue-500" />
            <p className="text-xs text-slate-500">Stock Received Today</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{todayRestock.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">{totalUnitsReceived} units in</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-slate-400" />
            <p className="text-xs text-slate-500">Total Movements</p>
          </div>
          <p className="text-2xl font-bold text-slate-700">{todayEntries.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">today</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              filter === f.id
                ? 'bg-[#0c4a6e] text-white border-[#0c4a6e]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
            {filter === f.id && (
              <span className="ml-1.5 text-xs bg-white/20 rounded-full px-1.5 py-0.5">
                {filtered.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No transactions found</p>
          <p className="text-sm mt-1">Record a walk-in sale or receive stock from the Inventory page.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Medicine</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock After</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((entry) => {
                const { date, time } = formatDateTime(entry.occurred_at);
                const meta = reasonMeta(entry.reason);
                const isOut = entry.delta_qty < 0;
                return (
                  <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-700 text-xs">{time}</p>
                      <p className="text-xs text-slate-400">{date}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-700 font-mono text-xs">{entry.medicine_id}</p>
                      {entry.reference_id && (
                        <p className="text-xs text-slate-400 truncate max-w-[140px]">ref: {entry.reference_id}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${meta.color}`}>
                        <span>{meta.icon}</span>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`font-bold text-sm flex items-center justify-end gap-1 ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
                        {isOut
                          ? <ArrowDownCircle size={13} />
                          : <ArrowUpCircle size={13} />}
                        {isOut ? '' : '+'}{entry.delta_qty}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-mono text-xs text-slate-600 font-semibold">{entry.qty_after}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-slate-400 truncate max-w-[160px]">{entry.notes ?? '—'}</p>
                      {entry.actor_id && entry.actor_id !== 'system' && (
                        <p className="text-xs text-slate-300 mt-0.5">by {entry.actor_id}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
