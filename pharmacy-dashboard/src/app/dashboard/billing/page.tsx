'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOfflineInventory } from '@/hooks/useOfflineInventory';
import {
  computeLineItem, computeBillTotals, saveBill, getNextBillNo,
  loadPharmacyProfile, formatExpiry, rupeesFromPaise,
  type BillLineItem, type PaymentMethod,
} from '@/lib/billing';
import { formatPaise } from '@/lib/api';
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  User, Phone, MapPin, Receipt, AlertTriangle,
} from 'lucide-react';

function usePharmacyId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pharmacy_id') ?? '';
}
function actorId() {
  if (typeof window === 'undefined') return 'system';
  return localStorage.getItem('user_id') || 'system';
}

/* ─── Cart item (editable) ───────────────────────────────────────────── */
interface CartEntry extends BillLineItem {
  _key: string; // medicine_id + batch_no
}

function newId(): string {
  return `bill_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function BillingPOSPage() {
  const router = useRouter();
  const pharmacyId = usePharmacyId();
  const { items: inventory, syncStatus } = useOfflineInventory(pharmacyId);

  // ── Search ────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [patientAddress, setPatientAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return inventory
      .filter((it) =>
        (it.medicine_name ?? it.medicine_id).toLowerCase().includes(q) ||
        (it.generic_name ?? '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [search, inventory]);

  const addToCart = (item: typeof inventory[number]) => {
    const key = item.medicine_id;
    if (cart.some((c) => c._key === key)) {
      // bump qty
      setCart((prev) =>
        prev.map((c) =>
          c._key === key
            ? computeCartEntry(c, c.qty + 1, c.discount_pct)
            : c,
        ),
      );
    } else {
      const line = computeLineItem(
        item.medicine_id,
        item.medicine_name ?? item.medicine_id,
        item.form ? `${item.form}` : 'Unit',
        item.current_batch_no ?? '—',
        item.current_expiry ? formatExpiry(item.current_expiry) : '—',
        item.mrp_paise,
        1,
        0, // default 0% discount (pharmacist can edit in cart)
        5, // default 5% GST
      );
      setCart((prev) => [...prev, { ...line, _key: key }]);
    }
    setSearch('');
  };

  function computeCartEntry(entry: CartEntry, qty: number, discount_pct: number): CartEntry {
    const updated = computeLineItem(
      entry.medicine_id, entry.item_name, entry.packing,
      entry.batch_no, entry.expiry_date,
      entry.mrp_paise, qty, discount_pct, entry.gst_rate_pct,
    );
    return { ...updated, _key: entry._key };
  }

  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) { removeItem(key); return; }
    setCart((prev) => prev.map((c) => c._key === key ? computeCartEntry(c, qty, c.discount_pct) : c));
  };

  const updateDiscount = (key: string, pct: number) => {
    setCart((prev) => prev.map((c) => c._key === key ? computeCartEntry(c, c.qty, Math.min(100, Math.max(0, pct))) : c));
  };

  const removeItem = (key: string) => setCart((prev) => prev.filter((c) => c._key !== key));

  const totals = useMemo(() => computeBillTotals(cart), [cart]);

  // ── Generate Bill ──────────────────────────────────────────────────
  const handleGenerateBill = async () => {
    setError('');
    if (cart.length === 0) { setError('Add at least one item.'); return; }
    if (!patientName.trim()) { setError('Patient name is required.'); return; }

    setBusy(true);
    try {
      const profile = loadPharmacyProfile();
      const billId  = newId();
      const billNo  = getNextBillNo(pharmacyId);

      const bill = {
        id: billId,
        bill_no: billNo,
        pharmacy_id: pharmacyId,
        bill_type: 'walk_in' as const,
        pharmacy: {
          name: profile.name ?? 'Pharmacy',
          line1: profile.line1 ?? '',
          line2: profile.line2,
          city: profile.city ?? '',
          mobile: profile.mobile ?? '',
          gstin: profile.gstin ?? '',
          pan: profile.pan ?? '',
          license20: profile.license20 ?? '',
          license21: profile.license21 ?? '',
          affiliated_with: profile.affiliated_with,
        },
        patient_name: patientName,
        patient_mobile: patientMobile,
        patient_address: patientAddress,
        billed_by: actorId(),
        payment_method: paymentMethod,
        items: cart,
        ...totals,
        created_at: new Date().toISOString(),
      };

      await saveBill(bill);

      // Deduct inventory for each item (post-bill generation)
      for (const item of cart) {
        try {
          const { api } = await import('@/lib/api');
          await api.post(
            `/inventory/pharmacies/${pharmacyId}/medicines/${item.medicine_id}/adjust`,
            { delta: -item.qty, reason: 'walk_in_sale', notes: `Bill #${billNo}` },
            { headers: { 'x-user-id': actorId() } },
          );
        } catch {
          // offline — will sync later via queue (already handled by offline hook)
        }
      }

      router.push(`/dashboard/billing/${billId}?print=1`);
    } catch (e) {
      setError('Failed to generate bill. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Card', 'GrowthRx', 'Credit'];

  return (
    <div className="flex h-full min-h-screen bg-slate-50">
      {/* ── Left: Medicine search ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col border-r border-slate-200 bg-white">
        <div className="p-5 border-b border-slate-100">
          <h1 className="text-lg font-bold text-slate-800 mb-1">New Walk-in Bill</h1>
          {!syncStatus.isOnline && (
            <p className="text-xs text-amber-600">Offline — bill will sync when reconnected</p>
          )}
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search medicine to add..."
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0c4a6e]"
            />
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
              {searchResults.map((item) => {
                const available = item.qty_on_hand - item.qty_reserved;
                return (
                  <button
                    key={item.medicine_id}
                    onClick={() => addToCart(item)}
                    disabled={available <= 0}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed border-b border-slate-50 last:border-0 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{item.medicine_name ?? item.medicine_id}</p>
                      <p className="text-xs text-slate-400">{item.generic_name}{item.form ? ` · ${item.form}` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-700">{formatPaise(item.mrp_paise)}</p>
                      <p className={`text-xs ${available < 5 ? 'text-amber-500' : 'text-slate-400'}`}>{available} left</p>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-[#0c4a6e] text-white flex items-center justify-center shrink-0">
                      <Plus size={14} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300">
              <ShoppingCart size={48} className="mb-3 opacity-50" />
              <p className="text-sm font-medium">Search and add medicines above</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {cart.map((entry, idx) => (
                <div key={entry._key} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-slate-500">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm">{entry.item_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Batch: {entry.batch_no} · Exp: {entry.expiry_date} · MRP: {formatPaise(entry.mrp_paise)}
                      </p>

                      <div className="flex items-center gap-4 mt-2.5">
                        {/* Qty */}
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(entry._key, entry.qty - 1)} className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Minus size={10} /></button>
                          <input
                            type="number"
                            value={entry.qty}
                            min={1}
                            onChange={(e) => updateQty(entry._key, Number(e.target.value))}
                            className="w-10 text-center text-sm font-bold border border-slate-200 rounded-lg py-0.5 focus:outline-none focus:border-[#0c4a6e]"
                          />
                          <button onClick={() => updateQty(entry._key, entry.qty + 1)} className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Plus size={10} /></button>
                        </div>

                        {/* Discount */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">Disc</span>
                          <input
                            type="number"
                            value={entry.discount_pct}
                            min={0}
                            max={100}
                            onChange={(e) => updateDiscount(entry._key, Number(e.target.value))}
                            className="w-12 text-center text-xs font-bold border border-slate-200 rounded-lg py-0.5 focus:outline-none focus:border-[#0c4a6e]"
                          />
                          <span className="text-xs text-slate-400">%</span>
                        </div>

                        {/* GST */}
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          GST {entry.gst_rate_pct}%
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-800">{formatPaise(entry.amount_paise)}</p>
                      {entry.discount_pct > 0 && (
                        <p className="text-xs text-emerald-600">{entry.discount_pct}% off</p>
                      )}
                      <button onClick={() => removeItem(entry._key)} className="mt-1 text-slate-300 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Patient + Summary ────────────────────────────────── */}
      <div className="w-80 xl:w-96 flex flex-col bg-white border-l border-slate-100">
        {/* Patient info */}
        <div className="p-5 border-b border-slate-100 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Info</h2>
          <div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 focus-within:border-[#0c4a6e]">
              <User size={14} className="text-slate-400 shrink-0" />
              <input
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Patient name *"
                className="flex-1 text-sm focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 focus-within:border-[#0c4a6e]">
            <Phone size={14} className="text-slate-400 shrink-0" />
            <input
              value={patientMobile}
              onChange={(e) => setPatientMobile(e.target.value)}
              placeholder="Mobile number"
              type="tel"
              className="flex-1 text-sm focus:outline-none"
            />
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-slate-200 focus-within:border-[#0c4a6e]">
            <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <textarea
              value={patientAddress}
              onChange={(e) => setPatientAddress(e.target.value)}
              placeholder="Address (optional)"
              rows={2}
              className="flex-1 text-sm focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Payment method */}
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Payment</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {(['Cash', 'UPI', 'Card', 'GrowthRx', 'Credit'] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors ${paymentMethod === m ? 'bg-[#0c4a6e] text-white border-[#0c4a6e]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Bill totals */}
        <div className="p-5 border-b border-slate-100 space-y-2 text-sm flex-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Summary</h2>
          <div className="flex justify-between text-slate-500">
            <span>Items</span><span className="font-medium text-slate-700">{cart.length}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>MRP Total</span><span>{formatPaise(totals.total_mrp_paise)}</span>
          </div>
          {totals.total_discount_paise > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span><span>- {formatPaise(totals.total_discount_paise)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500">
            <span>CGST</span><span>{formatPaise(totals.cgst_paise)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>SGST</span><span>{formatPaise(totals.sgst_paise)}</span>
          </div>
          {totals.round_off_paise !== 0 && (
            <div className="flex justify-between text-slate-400 text-xs">
              <span>Round off</span><span>{rupeesFromPaise(totals.round_off_paise)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-slate-900 text-lg pt-2 border-t border-slate-200 mt-2">
            <span>Net Total</span>
            <span>{formatPaise(totals.net_paise)}</span>
          </div>
          {totals.total_discount_paise > 0 && (
            <div className="text-xs text-emerald-600 text-right">
              Customer saves {formatPaise(totals.total_discount_paise)} 🎉
            </div>
          )}
        </div>

        {/* Error + Generate */}
        <div className="p-5 space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}
          <button
            onClick={handleGenerateBill}
            disabled={busy || cart.length === 0}
            className="w-full py-3.5 rounded-xl bg-[#0c4a6e] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#0a3d5c] transition-colors"
          >
            <Receipt size={16} />
            {busy ? 'Generating Bill…' : 'Generate Bill & Print'}
          </button>
          <p className="text-xs text-center text-slate-400">
            Inventory will be deducted after bill generation
          </p>
        </div>
      </div>
    </div>
  );
}
