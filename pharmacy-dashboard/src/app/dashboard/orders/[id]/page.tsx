'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { api, formatPaise, formatTime } from '@/lib/api';
import { SlaCountdown } from '@/components/SlaCountdown';
import { CheckCircle, XCircle, ChevronLeft, AlertTriangle, ShieldCheck } from 'lucide-react';

type OrderStatus = 'pending' | 'confirmed' | 'packed' | 'dispatched' | 'delivered' | 'cancelled';

interface RxFlag { id: string; flag_type: string; message: string; }
interface RxItem { id: string; medicine_name: string; dosage: string; frequency: string; duration_days: number; }
interface Prescription {
  id: string;
  s3_key: string;
  ocr_status: string;
  ocr_confidence_bps: number;
  doctor_name?: string;
  hospital_name?: string;
  verified_at?: string;
  items: RxItem[];
  flags: RxFlag[];
}

interface OrderItem {
  medicine_id: string;
  medicine_name: string;
  qty: number;
  unit_price_paise: number;
  requires_rx: boolean;
}

interface Order {
  id: string;
  status: OrderStatus;
  placed_at: string;
  sla_target_at: string;
  subtotal_paise: number;
  delivery_fee_paise: number;
  platform_fee_paise: number;
  gst_paise: number;
  total_paise: number;
  delivery_address: { line1: string; line2?: string; city: string; pincode: string };
  items: OrderItem[];
  prescription_id?: string;
}

const STEPS: OrderStatus[] = ['pending', 'confirmed', 'packed', 'dispatched', 'delivered'];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'packed',
  packed: 'dispatched',
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: 'Confirm Order',
  confirmed: 'Mark Packed',
  packed: 'Hand to Rider',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const { data: order, isLoading: orderLoading } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => (await api.get(`/orders/${id}`)).data,
  });

  const { data: rx } = useQuery<Prescription>({
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
      api.patch(`/rx/${order!.prescription_id}/verify`, { approved, notes: approved ? 'Approved by pharmacist' : 'Rejected by pharmacist' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order-rx'] }),
  });

  if (orderLoading || !order) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const activeStatuses: OrderStatus[] = ['pending', 'confirmed', 'packed', 'dispatched'];
  const isActive = activeStatuses.includes(order.status);
  const next = NEXT_STATUS[order.status];
  const allItemsChecked = order.items.every((it) => checkedItems.has(it.medicine_id));
  const stepIdx = STEPS.indexOf(order.status);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">Order #{id.slice(0, 8)}</h1>
            {isActive && <SlaCountdown slaTargetAt={order.sla_target_at} placedAt={order.placed_at} />}
          </div>
          <p className="text-sm text-slate-400 mt-0.5">Placed at {formatTime(order.placed_at)}</p>
        </div>
      </div>

      {/* Status Stepper */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
        <div className="flex items-center gap-0">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                  ${i < stepIdx ? 'bg-[#0c4a6e] border-[#0c4a6e] text-white'
                    : i === stepIdx ? 'border-[#0c4a6e] text-[#0c4a6e]'
                    : 'border-slate-200 text-slate-300'}`}>
                  {i < stepIdx ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] font-medium capitalize whitespace-nowrap ${i <= stepIdx ? 'text-[#0c4a6e]' : 'text-slate-300'}`}>
                  {step}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 rounded ${i < stepIdx ? 'bg-[#0c4a6e]' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Rx Section */}
          {rx && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-700 text-sm">Prescription</h2>
                {rx.verified_at ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                    <ShieldCheck size={12} /> Verified
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">Pending Review</span>
                )}
              </div>

              {/* Confidence */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>OCR Confidence</span>
                  <span className="font-medium">{(rx.ocr_confidence_bps / 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${rx.ocr_confidence_bps >= 8000 ? 'bg-green-500' : 'bg-amber-500'}`}
                    style={{ width: `${rx.ocr_confidence_bps / 100}%` }}
                  />
                </div>
              </div>

              {rx.doctor_name && (
                <p className="text-xs text-slate-500 mb-2">
                  Dr. {rx.doctor_name}{rx.hospital_name ? ` · ${rx.hospital_name}` : ''}
                </p>
              )}

              {/* Flags */}
              {rx.flags.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                  {rx.flags.map((f) => (
                    <div key={f.id} className="flex items-start gap-2">
                      <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
                      <span className="text-xs text-amber-700">{f.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Extracted medicines */}
              <div className="space-y-1.5 mb-4">
                {rx.items.map((it) => (
                  <div key={it.id} className="text-xs bg-slate-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-slate-700">{it.medicine_name}</span>
                    <span className="text-slate-400 ml-2">{it.dosage} · {it.frequency} · {it.duration_days}d</span>
                  </div>
                ))}
              </div>

              {/* Approve/Reject buttons */}
              {!rx.verified_at && (
                <div className="flex gap-2">
                  <button
                    onClick={() => verifyRxMutation.mutate(true)}
                    disabled={verifyRxMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle size={14} /> Approve Rx
                  </button>
                  <button
                    onClick={() => verifyRxMutation.mutate(false)}
                    disabled={verifyRxMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle size={14} /> Reject Rx
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Delivery Address */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-2">Delivery Address</h2>
            <p className="text-sm text-slate-600">{order.delivery_address.line1}</p>
            {order.delivery_address.line2 && <p className="text-sm text-slate-600">{order.delivery_address.line2}</p>}
            <p className="text-sm text-slate-500">{order.delivery_address.city} — {order.delivery_address.pincode}</p>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Packing Checklist */}
          {(order.status === 'confirmed' || order.status === 'packed') && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-semibold text-slate-700 text-sm mb-3">Packing Checklist</h2>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <label
                    key={item.medicine_id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checkedItems.has(item.medicine_id)}
                      onChange={(e) => {
                        const next = new Set(checkedItems);
                        e.target.checked ? next.add(item.medicine_id) : next.delete(item.medicine_id);
                        setCheckedItems(next);
                      }}
                      className="w-4 h-4 rounded accent-[#0c4a6e]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{item.medicine_name}</p>
                      <p className="text-xs text-slate-400">Qty: {item.qty}</p>
                    </div>
                    {item.requires_rx && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 font-medium">Rx</span>
                    )}
                  </label>
                ))}
              </div>
              {!allItemsChecked && (
                <p className="text-xs text-amber-600 mt-2 text-center">Check all items before proceeding</p>
              )}
            </div>
          )}

          {/* Order Items + Pricing */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-3">Order Summary</h2>
            <div className="space-y-2 mb-4">
              {order.items.map((it) => (
                <div key={it.medicine_id} className="flex justify-between text-sm">
                  <span className="text-slate-600">{it.medicine_name} ×{it.qty}</span>
                  <span className="text-slate-700 font-medium">{formatPaise(it.unit_price_paise * it.qty)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal</span>
                <span>{formatPaise(order.subtotal_paise)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Delivery fee</span>
                <span>{formatPaise(order.delivery_fee_paise)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Platform fee</span>
                <span>{formatPaise(order.platform_fee_paise)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>GST</span>
                <span>{formatPaise(order.gst_paise)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-800 pt-1 border-t border-slate-100">
                <span>Total</span>
                <span>{formatPaise(order.total_paise)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {next && (
              <button
                onClick={() => transitionMutation.mutate(next)}
                disabled={
                  transitionMutation.isPending ||
                  ((order.status === 'confirmed' || order.status === 'packed') && !allItemsChecked)
                }
                className="w-full py-3 rounded-2xl bg-[#0c4a6e] text-white font-semibold text-sm hover:bg-[#0e5f8a] disabled:opacity-40 transition-colors"
              >
                {NEXT_LABEL[order.status]}
              </button>
            )}
            {(order.status === 'pending' || order.status === 'confirmed') && (
              <button
                onClick={() => transitionMutation.mutate('cancelled')}
                disabled={transitionMutation.isPending}
                className="w-full py-3 rounded-2xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
