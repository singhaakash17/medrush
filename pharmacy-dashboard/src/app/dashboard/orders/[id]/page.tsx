'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import {
  ChevronLeft, CheckCircle2, XCircle, AlertTriangle,
  ShieldCheck, ShieldAlert, MapPin, Package,
  FileText, Truck, User, Clock,
} from 'lucide-react';
import { api, formatPaise, formatTime } from '@/lib/api';
import { SlaCountdown } from '@/components/SlaCountdown';

type OrderStatus = 'pending' | 'confirmed' | 'packed' | 'dispatched' | 'delivered' | 'cancelled';

interface RxFlag  { id: string; flag_type: string; message: string; }
interface RxItem  { id: string; medicine_name: string; dosage: string; frequency: string; duration_days: number; }
interface Rx {
  id: string; s3_key: string; ocr_status: string; ocr_confidence_bps: number;
  doctor_name?: string; hospital_name?: string; verified_at?: string;
  items: RxItem[]; flags: RxFlag[];
}
interface OrderItem {
  medicine_id: string; medicine_name: string; qty: number;
  unit_price_paise: number; requires_rx: boolean;
}
interface Order {
  id: string; status: OrderStatus; placed_at: string; sla_target_at: string;
  subtotal_paise: number; delivery_fee_paise: number; platform_fee_paise: number;
  gst_paise: number; total_paise: number;
  delivery_address: { line1: string; line2?: string; city: string; pincode: string };
  items: OrderItem[]; prescription_id?: string;
}

const STEPS: OrderStatus[] = ['pending', 'confirmed', 'packed', 'dispatched', 'delivered'];
const STEP_LABELS = ['New', 'Confirmed', 'Packed', 'Dispatched', 'Delivered'];
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed', confirmed: 'packed', packed: 'dispatched',
};
const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: 'Confirm Order', confirmed: 'Mark as Packed', packed: 'Hand to Rider',
};

// ── Confidence bar ────────────────────────────────────────────────────────────
function ConfidenceBar({ bps }: { bps: number }) {
  const pct = Math.round(bps / 100);
  const isHigh = pct >= 80;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-surface-500">AI Confidence</span>
        <span className={clsx('text-xs font-bold', isHigh ? 'text-emerald-600' : 'text-amber-600')}>
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-700',
            isHigh ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                   : 'bg-gradient-to-r from-amber-400 to-amber-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Status stepper ───────────────────────────────────────────────────────────
function StatusStepper({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 p-4 bg-crimson-50 rounded-2xl border border-crimson-100">
        <XCircle size={18} className="text-crimson-600 shrink-0" />
        <span className="text-sm font-semibold text-crimson-700">This order was cancelled</span>
      </div>
    );
  }
  const idx = STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {STEPS.map((step, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none min-w-0">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                done   ? 'bg-navy-600 border-navy-600 text-white'
                       : active ? 'border-navy-600 text-navy-600 bg-navy-50'
                       : 'border-surface-200 text-surface-300 bg-white',
              )}>
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={clsx(
                'text-[10px] font-semibold whitespace-nowrap',
                done || active ? 'text-navy-700' : 'text-surface-300',
              )}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx(
                'flex-1 h-0.5 mx-1.5 mb-5 rounded-full transition-all',
                done ? 'bg-navy-600' : 'bg-surface-200',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => (await api.get(`/orders/${id}`)).data,
  });

  const { data: rx } = useQuery<Rx>({
    queryKey: ['order-rx', order?.prescription_id],
    queryFn: async () => (await api.get(`/rx/${order!.prescription_id}`)).data,
    enabled: !!order?.prescription_id,
  });

  const transitionMutation = useMutation({
    mutationFn: async (status: OrderStatus) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', id] }),
  });

  const verifyRxMutation = useMutation({
    mutationFn: async (approved: boolean) =>
      api.patch(`/rx/${order!.prescription_id}/verify`, {
        approved, notes: approved ? 'Approved by pharmacist' : 'Rejected by pharmacist',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order-rx'] }),
  });

  if (isLoading || !order) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-36 rounded-3xl" />)}
      </div>
    );
  }

  const isActive    = ['pending', 'confirmed', 'packed', 'dispatched'].includes(order.status);
  const next        = NEXT_STATUS[order.status];
  const allChecked  = order.items.every(i => checked.has(i.medicine_id));
  const needsCheck  = ['confirmed', 'packed'].includes(order.status);
  const canProceed  = !needsCheck || allChecked;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center
                     bg-surface-100 hover:bg-surface-200 text-surface-600 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-black text-surface-900 tracking-tight">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            {isActive && (
              <SlaCountdown slaTargetAt={order.sla_target_at} placedAt={order.placed_at} size="md" />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock size={11} className="text-surface-400" />
            <p className="text-xs text-surface-400">Placed at {formatTime(order.placed_at)}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black text-surface-900">{formatPaise(order.total_paise)}</div>
          <div className="text-xs text-surface-400">{order.items.length} items</div>
        </div>
      </div>

      {/* ── Stepper ──────────────────────────────────────────── */}
      <div className="card p-5">
        <StatusStepper status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Left (3 cols) ─────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Packing checklist */}
          {needsCheck && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-navy-50 flex items-center justify-center">
                  <Package size={15} className="text-navy-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-surface-800">Packing Checklist</h2>
                  <p className="text-xs text-surface-400">
                    {checked.size}/{order.items.length} items verified
                  </p>
                </div>
                {allChecked && (
                  <span className="ml-auto badge badge-delivered">All checked</span>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-surface-100 mb-4 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(checked.size / order.items.length) * 100}%` }}
                />
              </div>

              <div className="space-y-2">
                {order.items.map(item => (
                  <label
                    key={item.medicine_id}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors',
                      checked.has(item.medicine_id)
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-surface-50 border border-transparent hover:border-surface-200',
                    )}
                  >
                    <div className={clsx(
                      'w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors',
                      checked.has(item.medicine_id)
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-surface-300',
                    )}>
                      {checked.has(item.medicine_id) && (
                        <CheckCircle2 size={12} className="text-white" strokeWidth={3} />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked.has(item.medicine_id)}
                      onChange={e => {
                        const n = new Set(checked);
                        e.target.checked ? n.add(item.medicine_id) : n.delete(item.medicine_id);
                        setChecked(n);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        'text-sm font-semibold truncate',
                        checked.has(item.medicine_id) ? 'text-emerald-800 line-through opacity-60' : 'text-surface-800',
                      )}>
                        {item.medicine_name}
                      </p>
                      <p className="text-xs text-surface-400">Qty: {item.qty}</p>
                    </div>
                    {item.requires_rx && (
                      <span className="badge badge-packed text-[10px]">Rx</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Prescription */}
          {rx && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                  <FileText size={15} className="text-purple-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-surface-800">Prescription</h2>
                  {rx.doctor_name && (
                    <p className="text-xs text-surface-400">
                      Dr. {rx.doctor_name}{rx.hospital_name ? ` · ${rx.hospital_name}` : ''}
                    </p>
                  )}
                </div>
                <div className="ml-auto">
                  {rx.verified_at ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold
                                     text-emerald-700 bg-emerald-50 border border-emerald-200
                                     rounded-full px-3 py-1">
                      <ShieldCheck size={12} />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold
                                     text-amber-700 bg-amber-50 border border-amber-200
                                     rounded-full px-3 py-1">
                      <ShieldAlert size={12} />
                      Needs review
                    </span>
                  )}
                </div>
              </div>

              <ConfidenceBar bps={rx.ocr_confidence_bps} />

              {rx.flags.length > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
                  {rx.flags.map(f => (
                    <div key={f.id} className="flex items-start gap-2">
                      <AlertTriangle size={12} className="text-amber-600 mt-0.5 shrink-0" />
                      <span className="text-xs text-amber-700">{f.message}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 space-y-1.5">
                {rx.items.map(it => (
                  <div key={it.id} className="flex items-center gap-2 px-3 py-2 bg-surface-50 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-navy-400 shrink-0" />
                    <span className="text-xs font-semibold text-surface-700 flex-1">{it.medicine_name}</span>
                    <span className="text-xs text-surface-400">
                      {it.dosage} · {it.frequency} · {it.duration_days}d
                    </span>
                  </div>
                ))}
              </div>

              {!rx.verified_at && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => verifyRxMutation.mutate(true)}
                    disabled={verifyRxMutation.isPending}
                    className="btn btn-emerald btn-md flex-1 gap-1.5"
                  >
                    <CheckCircle2 size={14} /> Approve Rx
                  </button>
                  <button
                    onClick={() => verifyRxMutation.mutate(false)}
                    disabled={verifyRxMutation.isPending}
                    className="btn btn-danger btn-md flex-1 gap-1.5"
                  >
                    <XCircle size={14} /> Reject Rx
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Delivery Address */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <MapPin size={15} className="text-blue-600" />
              </div>
              <h2 className="text-sm font-bold text-surface-800">Delivery Address</h2>
            </div>
            <p className="text-sm font-medium text-surface-700">{order.delivery_address.line1}</p>
            {order.delivery_address.line2 && (
              <p className="text-sm text-surface-600">{order.delivery_address.line2}</p>
            )}
            <p className="text-xs text-surface-400 mt-1">
              {order.delivery_address.city} — {order.delivery_address.pincode}
            </p>
          </div>
        </div>

        {/* ── Right (2 cols) ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Order items + pricing */}
          <div className="card p-5">
            <h2 className="text-sm font-bold text-surface-800 mb-3">Order Summary</h2>
            <div className="space-y-2.5 mb-4">
              {order.items.map(it => (
                <div key={it.medicine_id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-navy-50 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-navy-600">{it.qty}×</span>
                    </div>
                    <span className="text-xs text-surface-700 font-medium truncate">{it.medicine_name}</span>
                  </div>
                  <span className="text-xs font-bold text-surface-800 shrink-0">
                    {formatPaise(it.unit_price_paise * it.qty)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-surface-100 pt-3 space-y-2">
              {[
                ['Subtotal',      order.subtotal_paise],
                ['Delivery',      order.delivery_fee_paise],
                ['Platform fee',  order.platform_fee_paise],
                ['GST',           order.gst_paise],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between text-xs text-surface-500">
                  <span>{label}</span>
                  <span>{formatPaise(val as number)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-surface-100">
                <span className="text-sm font-bold text-surface-900">Total</span>
                <span className="text-sm font-black text-surface-900">{formatPaise(order.total_paise)}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {(next || order.status === 'pending' || order.status === 'confirmed') && (
            <div className="card p-5 space-y-2.5">
              <h2 className="text-sm font-bold text-surface-800 mb-1">Actions</h2>

              {next && (
                <button
                  onClick={() => transitionMutation.mutate(next)}
                  disabled={transitionMutation.isPending || !canProceed}
                  className="btn btn-primary btn-xl w-full"
                >
                  {transitionMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Updating…
                    </span>
                  ) : (
                    <>
                      {next === 'dispatched' && <Truck size={16} />}
                      {NEXT_LABEL[order.status]}
                    </>
                  )}
                </button>
              )}

              {needsCheck && !allChecked && (
                <p className="text-xs text-amber-600 text-center">
                  Check all items in the list above to proceed
                </p>
              )}

              {(order.status === 'pending' || order.status === 'confirmed') && (
                <button
                  onClick={() => transitionMutation.mutate('cancelled')}
                  disabled={transitionMutation.isPending}
                  className="btn btn-danger btn-lg w-full"
                >
                  <XCircle size={14} /> Cancel Order
                </button>
              )}
            </div>
          )}

          {/* Rider info when dispatched */}
          {order.status === 'dispatched' && (
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-navy-50 flex items-center justify-center">
                  <User size={18} className="text-navy-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-800">Rider Assigned</p>
                  <p className="text-xs text-surface-400">En route to customer</p>
                </div>
                <span className="live-dot ml-auto" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
