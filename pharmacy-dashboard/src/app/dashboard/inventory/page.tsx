'use client';
import { usePharmacyId } from '@/hooks/usePharmacyId';
import { useState } from 'react';
import { formatPaise } from '@/lib/api';
import { useOfflineInventory, ReceivePayload } from '@/hooks/useOfflineInventory';
import { SyncStatusBar } from '@/components/SyncStatusBar';
import type { LocalInventoryItem } from '@/lib/db';
import {
  Search, Package, ToggleLeft, ToggleRight,
  Plus, Minus, AlertTriangle, X, ShoppingCart, Truck, Clock,
} from 'lucide-react';

/* ─── Helpers ────────────────────────────────────────────────────────── */

type AdjustReason = 'restock' | 'write_off' | 'damage' | 'expiry' | 'correction' | 'theft';
const REASON_LABELS: Record<AdjustReason, string> = {
  restock:   '📦 Restock',   write_off: '🗑️ Write-off',
  damage:    '💥 Damage',    expiry:    '⏰ Expiry',
  correction:'✏️ Correction', theft:     '🚨 Theft',
};

/* ─── Sell Modal ─────────────────────────────────────────────────────── */
interface SellProps {
  item: LocalInventoryItem;
  onSell: (qty: number, notes: string) => Promise<void>;
  onClose: () => void;
}
function SellModal({ item, onSell, onClose }: SellProps) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const available = item.qty_on_hand - item.qty_reserved;

  const handleSell = async () => {
    setError('');
    if (qty <= 0) { setError('Quantity must be at least 1.'); return; }
    if (qty > available) { setError(`Only ${available} units available.`); return; }
    setBusy(true);
    try { await onSell(qty, 'Walk-in counter sale'); onClose(); }
    catch { setError('Failed to record sale.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ShoppingCart size={14} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Walk-in Sale</h2>
              <p className="text-xs text-slate-400">{item.medicine_name ?? item.medicine_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
              <p className="text-xs text-slate-500">Available</p>
              <p className={`text-2xl font-bold mt-0.5 ${available < 5 ? 'text-amber-600' : 'text-slate-700'}`}>{available}</p>
            </div>
            <div className="flex-1 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
              <p className="text-xs text-emerald-600">Price / unit</p>
              <p className="text-2xl font-bold text-emerald-700 mt-0.5">{formatPaise(item.selling_price_paise)}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Quantity</label>
            <div className="flex gap-2 mb-2">
              {[1, 2, 5, 10].map((q) => (
                <button key={q} onClick={() => setQty(q)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${qty === q ? 'bg-[#0c4a6e] text-white border-[#0c4a6e]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {q}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Minus size={14} /></button>
              <input type="number" value={qty} min={1} max={available} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="flex-1 text-center py-2 border border-slate-200 rounded-xl font-mono font-bold text-xl focus:outline-none focus:border-[#0c4a6e]" />
              <button onClick={() => setQty((q) => Math.min(available, q + 1))} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Plus size={14} /></button>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex justify-between">
            <span className="text-sm text-emerald-700 font-medium">Total Revenue</span>
            <span className="text-lg font-bold text-emerald-700">{formatPaise(qty * item.selling_price_paise)}</span>
          </div>

          {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"><AlertTriangle size={14} />{error}</div>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleSell} disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-emerald-700 transition-colors">
              {busy ? 'Recording…' : `Sell ${qty} unit${qty > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Receive Modal ──────────────────────────────────────────────────── */
interface ReceiveProps {
  item: LocalInventoryItem;
  onReceive: (payload: ReceivePayload) => Promise<void>;
  onClose: () => void;
}
function ReceiveModal({ item, onReceive, onClose }: ReceiveProps) {
  const today = new Date().toISOString().split('T')[0];
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [qty, setQty] = useState<number>(0);
  const [costPaise, setCostPaise] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleReceive = async () => {
    setError('');
    if (!batchNo.trim()) { setError('Batch number is required.'); return; }
    if (!expiryDate) { setError('Expiry date is required.'); return; }
    if (qty <= 0) { setError('Quantity must be greater than 0.'); return; }
    setBusy(true);
    try {
      await onReceive({
        batch_no: batchNo,
        expiry_date: expiryDate,
        qty_received: qty,
        manufacture_date: mfgDate || undefined,
        cost_paise: costPaise ? Math.round(parseFloat(costPaise) * 100) : undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch { setError('Failed to record stock receipt.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center"><Truck size={14} className="text-blue-600" /></div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Receive Stock</h2>
              <p className="text-xs text-slate-400">{item.medicine_name ?? item.medicine_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex justify-between text-sm">
            <span className="text-slate-500">Current stock</span>
            <span className="font-bold text-slate-700">{item.qty_on_hand} on hand · {item.qty_on_hand - item.qty_reserved} available</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Batch Number *</label>
              <input type="text" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="e.g. BT2025A"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-[#0c4a6e]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Qty Received *</label>
              <input type="number" value={qty || ''} min={1} onChange={(e) => setQty(Number(e.target.value))} placeholder="0"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono text-center font-bold focus:outline-none focus:border-[#0c4a6e]" />
            </div>
          </div>

          <div className="flex gap-2">
            {[10, 25, 50, 100].map((q) => (
              <button key={q} onClick={() => setQty(q)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${qty === q ? 'bg-[#0c4a6e] text-white border-[#0c4a6e]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                +{q}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Mfg Date</label>
              <input type="date" value={mfgDate} max={today} onChange={(e) => setMfgDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0c4a6e]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Expiry Date *</label>
              <input type="date" value={expiryDate} min={today} onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0c4a6e]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Cost / unit (₹)</label>
              <input type="number" value={costPaise} onChange={(e) => setCostPaise(e.target.value)} placeholder="0.00" step="0.01"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0c4a6e]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Supplier</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Supplier name..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0c4a6e]" />
            </div>
          </div>

          {qty > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex justify-between text-sm">
              <span className="text-blue-700 font-medium">After receiving</span>
              <span className="font-bold text-blue-700">{item.qty_on_hand} + {qty} = <strong>{item.qty_on_hand + qty}</strong> on hand</span>
            </div>
          )}

          {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"><AlertTriangle size={14} />{error}</div>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleReceive} disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-[#0c4a6e] text-white text-sm font-bold disabled:opacity-50 hover:bg-[#0a3d5c] transition-colors">
              {busy ? 'Saving…' : `Receive ${qty > 0 ? `${qty} units` : 'Stock'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Adjust Modal ───────────────────────────────────────────────────── */
interface AdjustProps {
  item: LocalInventoryItem;
  onAdjust: (delta: number, reason: string, notes: string) => Promise<void>;
  onClose: () => void;
}
function AdjustModal({ item, onAdjust, onClose }: AdjustProps) {
  const [delta, setDelta] = useState<number>(0);
  const [reason, setReason] = useState<AdjustReason>('restock');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const previewQty = item.qty_on_hand + delta;
  const previewAvail = previewQty - item.qty_reserved;
  const quickDeltas = reason === 'restock' ? [10, 25, 50, 100] : [-5, -10, -25, -50];

  const handleSubmit = async () => {
    setError('');
    if (delta === 0) { setError('Delta cannot be zero.'); return; }
    if (previewQty < 0) { setError('qty_on_hand cannot go below 0.'); return; }
    if (previewAvail < 0) { setError(`Cannot go below reserved qty (${item.qty_reserved}).`); return; }
    setBusy(true);
    try { await onAdjust(delta, reason, notes); onClose(); }
    catch { setError('Adjustment failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">{item.medicine_name ?? item.medicine_id}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manual stock correction</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            {[
              { label: 'On Hand', val: item.qty_on_hand, cls: 'text-slate-700' },
              { label: 'Reserved', val: item.qty_reserved, cls: 'text-amber-600' },
              { label: 'Available', val: item.qty_on_hand - item.qty_reserved, cls: item.qty_on_hand - item.qty_reserved < 5 ? 'text-red-600' : 'text-emerald-600' },
            ].map(({ label, val, cls }) => (
              <div key={label} className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-xl font-bold mt-0.5 ${cls}`}>{val}</p>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Reason</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(REASON_LABELS) as [AdjustReason, string][]).map(([key, label]) => (
                <button key={key} onClick={() => { setReason(key); setDelta(0); }}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors ${reason === key ? 'bg-[#0c4a6e] text-white border-[#0c4a6e]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Quantity Adjustment</label>
            <div className="flex gap-2 mb-2">
              {quickDeltas.map((q) => (
                <button key={q} onClick={() => setDelta(q)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${delta === q ? 'bg-[#0c4a6e] text-white border-[#0c4a6e]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {q > 0 ? `+${q}` : q}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setDelta((d) => d - 1)} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Minus size={14} /></button>
              <input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))}
                className="flex-1 text-center py-2 border border-slate-200 rounded-xl font-mono font-bold text-lg focus:outline-none focus:border-[#0c4a6e]" />
              <button onClick={() => setDelta((d) => d + 1)} className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Plus size={14} /></button>
            </div>
          </div>

          {delta !== 0 && (
            <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${previewAvail < 0 || previewQty < 0 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
              <span className="font-semibold">After:</span>
              <span>{item.qty_on_hand} {delta > 0 ? '+' : ''}{delta} = <strong>{previewQty}</strong> on hand · <strong>{previewAvail}</strong> available</span>
            </div>
          )}

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes (optional)..."
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0c4a6e] resize-none" />

          {error && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"><AlertTriangle size={14} />{error}</div>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleSubmit} disabled={busy || delta === 0}
              className="flex-1 py-2.5 rounded-xl bg-[#0c4a6e] text-white text-sm font-bold disabled:opacity-50 hover:bg-[#0a3d5c] transition-colors">
              {busy ? 'Saving…' : 'Apply Adjustment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────── */
type ModalState = { type: 'sell' | 'receive' | 'adjust'; item: LocalInventoryItem } | null;

export default function InventoryPage() {
  const pharmacyId = usePharmacyId();
  const { items, isLoading, syncStatus, dirtyIds, sell, receive, adjust, toggle, retryFailed, dismissFailed } = useOfflineInventory(pharmacyId ?? "");
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  const filtered = items.filter((it) => {
    const matchSearch = !search ||
      (it.medicine_name ?? it.medicine_id).toLowerCase().includes(search.toLowerCase()) ||
      (it.generic_name ?? '').toLowerCase().includes(search.toLowerCase());
    const available = it.qty_on_hand - it.qty_reserved;
    return matchSearch && (!showLowStock || available <= Math.max(it.reorder_level, 5));
  });

  const listedCount   = items.filter((it) => it.is_listed).length;
  const lowStockCount = items.filter((it) => it.qty_on_hand - it.qty_reserved <= Math.max(it.reorder_level, 5)).length;
  const totalValue    = items.reduce((s, it) => s + it.qty_on_hand * it.selling_price_paise, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Sync status bar — always at top */}
      <SyncStatusBar syncStatus={syncStatus} onRetryFailed={retryFailed} onDismissFailed={dismissFailed} />

      {/* Modals */}
      {modal?.type === 'sell' && (
        <SellModal item={modal.item} onClose={() => setModal(null)}
          onSell={(qty, notes) => sell(modal.item.medicine_id, modal.item.medicine_name ?? modal.item.medicine_id, qty, notes)} />
      )}
      {modal?.type === 'receive' && (
        <ReceiveModal item={modal.item} onClose={() => setModal(null)}
          onReceive={(payload) => receive(modal.item.medicine_id, modal.item.medicine_name ?? modal.item.medicine_id, payload)} />
      )}
      {modal?.type === 'adjust' && (
        <AdjustModal item={modal.item} onClose={() => setModal(null)}
          onAdjust={(delta, reason, notes) => adjust(modal.item.medicine_id, modal.item.medicine_name ?? modal.item.medicine_id, delta, reason, notes)} />
      )}

      <div className="p-6 max-w-6xl mx-auto w-full flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time stock management
            {!syncStatus.isOnline && (
              <span className="ml-2 text-amber-600 font-medium">· Offline mode — changes saved locally</span>
            )}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-500">Total SKUs</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{items.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-500">Active Listings</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{listedCount}</p>
          </div>
          <div className={`rounded-2xl border shadow-sm p-4 ${lowStockCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
            <p className={`text-xs ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Low Stock</p>
            <p className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{lowStockCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-500">Stock Value</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{formatPaise(totalValue)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicines..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0c4a6e] bg-white" />
          </div>
          <button onClick={() => setShowLowStock(!showLowStock)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors flex items-center gap-2 ${showLowStock ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            <AlertTriangle size={14} />
            Low stock
            {lowStockCount > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${showLowStock ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-700'}`}>
                {lowStockCount}
              </span>
            )}
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{items.length === 0 && !syncStatus.isOnline ? 'No local data — connect to internet to load inventory' : 'No items found'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Medicine</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Batch / Expiry</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Listed</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((item) => {
                  const available = item.qty_on_hand - item.qty_reserved;
                  const isLow = available <= Math.max(item.reorder_level, 5);
                  const isDirty = dirtyIds.has(item.medicine_id);
                  const expiryDate = item.current_expiry ? new Date(item.current_expiry) : null;
                  const daysToExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / 86400000) : null;
                  return (
                    <tr key={item.medicine_id} className={`hover:bg-slate-50/70 transition-colors ${isDirty ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-2">
                          {isDirty && (
                            <span title="Pending sync" className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-slate-700">{item.medicine_name ?? item.medicine_id}</p>
                            {item.generic_name && <p className="text-xs text-slate-400">{item.generic_name}{item.form ? ` · ${item.form}` : ''}{item.strength ? ` · ${item.strength}` : ''}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className={`font-bold ${isLow ? 'text-amber-600' : 'text-slate-700'}`}>{available} avail</p>
                        <p className="text-xs text-slate-400">{item.qty_on_hand} on hand{item.qty_reserved > 0 ? ` · ${item.qty_reserved} reserved` : ''}</p>
                        {isLow && <p className="text-[10px] font-semibold text-amber-500 flex items-center justify-end gap-0.5 mt-0.5"><AlertTriangle size={9} />Low</p>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="font-medium text-slate-700">{formatPaise(item.selling_price_paise)}</p>
                        {item.mrp_paise !== item.selling_price_paise && <p className="text-xs text-slate-400 line-through">{formatPaise(item.mrp_paise)}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        {item.current_batch_no ? (
                          <>
                            <p className="text-xs font-mono text-slate-600">{item.current_batch_no}</p>
                            {expiryDate && daysToExpiry !== null && (
                              <p className={`text-xs flex items-center gap-0.5 ${daysToExpiry < 90 ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                                {daysToExpiry < 90 && <Clock size={10} />}
                                {daysToExpiry < 90 ? `${daysToExpiry}d left` : expiryDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                              </p>
                            )}
                          </>
                        ) : <p className="text-xs text-slate-300">—</p>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button onClick={() => toggle(item.medicine_id, !item.is_listed)}
                          className="inline-flex items-center justify-center"
                          title={item.is_listed ? 'Click to unlist' : 'Click to list'}>
                          {item.is_listed
                            ? <ToggleRight size={28} className="text-green-500" />
                            : <ToggleLeft size={28} className="text-slate-300" />}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 justify-center">
                          <button onClick={() => setModal({ type: 'sell', item })}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                            Sell
                          </button>
                          <button onClick={() => setModal({ type: 'receive', item })}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                            Receive
                          </button>
                          <button onClick={() => setModal({ type: 'adjust', item })}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                            Adjust
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
