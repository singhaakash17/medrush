'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  ChevronRight, Search, RefreshCw, Bell,
  ShoppingBag, Clock, CheckCircle2, Truck, XCircle,
} from 'lucide-react';
import { api, formatPaise, formatTime } from '@/lib/api';
import { SlaCountdown } from '@/components/SlaCountdown';

type OrderStatus = 'pending' | 'confirmed' | 'packed' | 'dispatched' | 'delivered' | 'cancelled';

interface OrderItem { medicine_id: string; medicine_name: string; qty: number; unit_price_paise: number; }
interface Order {
  id: string; status: OrderStatus; placed_at: string;
  sla_target_at: string; total_paise: number; items: OrderItem[];
}

const STATUS_META: Record<OrderStatus, { label: string; icon: React.ElementType; cls: string }> = {
  pending:    { label: 'New',        icon: Bell,          cls: 'badge-pending' },
  confirmed:  { label: 'Confirmed',  icon: CheckCircle2,  cls: 'badge-confirmed' },
  packed:     { label: 'Packed',     icon: ShoppingBag,   cls: 'badge-packed' },
  dispatched: { label: 'On the way', icon: Truck,         cls: 'badge-dispatched' },
  delivered:  { label: 'Delivered',  icon: CheckCircle2,  cls: 'badge-delivered' },
  cancelled:  { label: 'Cancelled',  icon: XCircle,       cls: 'badge-cancelled' },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed', confirmed: 'packed', packed: 'dispatched',
};
const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: 'Confirm', confirmed: 'Mark Packed', packed: 'Hand to Rider',
};

const ACTIVE: OrderStatus[]  = ['pending', 'confirmed', 'packed', 'dispatched'];
const DONE: OrderStatus[]    = ['delivered', 'cancelled'];
type Tab = 'active' | 'done' | 'all';

function usePharmacyId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pharmacy_id') ?? 'ph_ind_01';
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function OrderSkeleton() {
  return (
    <div className="card p-5 space-y-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="skeleton h-4 w-24 rounded-lg" />
        <div className="skeleton h-5 w-16 rounded-full" />
        <div className="skeleton h-5 w-14 rounded-full ml-auto" />
      </div>
      <div className="skeleton h-3 w-48 rounded-lg" />
      <div className="flex items-center gap-2 pt-1">
        <div className="skeleton h-4 w-20 rounded-lg" />
        <div className="skeleton h-8 w-24 rounded-xl ml-auto" />
        <div className="skeleton h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onTransition,
  isPending: transitioning,
}: {
  order: Order;
  onTransition: (id: string, status: OrderStatus) => void;
  isPending: boolean;
}) {
  const meta = STATUS_META[order.status];
  const StatusIcon = meta.icon;
  const next = NEXT_STATUS[order.status];
  const isActive = ACTIVE.includes(order.status);
  const isNew = order.status === 'pending';

  return (
    <div className={clsx(
      'card-hover p-5 animate-slide-up',
      isNew && 'ring-2 ring-amber-300 ring-offset-1',
    )}>
      {/* Top row */}
      <div className="flex items-start gap-3 mb-3">
        <div className={clsx(
          'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
          isNew ? 'bg-amber-50' : 'bg-surface-50',
        )}>
          <StatusIcon size={18} className={isNew ? 'text-amber-600' : 'text-surface-400'} strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-surface-800 tracking-tight">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span className={meta.cls}>
              {meta.label}
            </span>
            {isActive && <SlaCountdown slaTargetAt={order.sla_target_at} placedAt={order.placed_at} />}
          </div>
          <p className="text-xs text-surface-500 mt-1 truncate">
            {order.items.slice(0, 2).map(i => `${i.medicine_name} ×${i.qty}`).join(' · ')}
            {order.items.length > 2 && ` +${order.items.length - 2} more`}
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-surface-900">{formatPaise(order.total_paise)}</div>
          <div className="text-[11px] text-surface-400 mt-0.5">{formatTime(order.placed_at)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-surface-100">
        <Link
          href={`/dashboard/orders/${order.id}`}
          className="btn btn-ghost btn-sm gap-1.5 text-surface-500"
        >
          View details
          <ChevronRight size={13} />
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          {order.status === 'pending' && (
            <button
              onClick={() => onTransition(order.id, 'cancelled')}
              disabled={transitioning}
              className="btn btn-danger btn-sm"
            >
              Reject
            </button>
          )}
          {next && (
            <button
              onClick={() => onTransition(order.id, next)}
              disabled={transitioning}
              className={clsx(
                'btn btn-md',
                isNew ? 'btn-emerald' : 'btn-primary',
              )}
            >
              {NEXT_LABEL[order.status]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const pharmacyId = usePharmacyId();

  const statuses: OrderStatus[] =
    tab === 'active' ? ACTIVE : tab === 'done' ? DONE : [...ACTIVE, ...DONE];

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['pharmacy-orders', pharmacyId, statuses],
    queryFn: async () => {
      const res = await api.get(`/orders/pharmacy/${pharmacyId}`, {
        params: { statuses: statuses.join(',') },
      });
      return res.data;
    },
    enabled: !!pharmacyId,
    refetchInterval: 30_000,
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      await api.patch(`/orders/${orderId}/status`, { status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-orders'] }),
  });

  useEffect(() => {
    if (!pharmacyId) return;
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/^http/, 'ws');
    const ws = new WebSocket(`${base}/ws/pharmacy/${pharmacyId}`);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.event === 'new_order') {
          setNewOrderAlert(true);
          qc.invalidateQueries({ queryKey: ['pharmacy-orders'] });
        } else if (msg.event === 'status_update') {
          qc.invalidateQueries({ queryKey: ['pharmacy-orders'] });
        }
      } catch {}
    };

    const ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), 25_000);
    return () => { clearInterval(ping); ws.close(); };
  }, [pharmacyId, qc]);

  const filtered = orders.filter(o =>
    search === '' ||
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.items.some(i => i.medicine_name.toLowerCase().includes(search.toLowerCase()))
  );

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'active', label: `Active${pendingCount > 0 ? ` (${pendingCount} new)` : ''}` },
    { id: 'done',   label: 'Completed' },
    { id: 'all',    label: 'All Orders' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-surface-900 tracking-tight">Orders</h1>
          <p className="text-sm text-surface-400 mt-0.5">Real-time order management</p>
        </div>
        <div className="flex items-center gap-3">
          {newOrderAlert && (
            <button
              onClick={() => { setNewOrderAlert(false); setTab('active'); }}
              className="btn btn-emerald btn-sm gap-2 animate-pulse"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              New order arrived
            </button>
          )}
          <div className="flex items-center gap-1.5 text-xs text-surface-400 bg-surface-50
                          border border-surface-200 rounded-full px-3 py-1.5">
            <span className="live-dot" />
            Live
          </div>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['pharmacy-orders'] })}
            className="btn btn-ghost btn-sm"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending',    value: orders.filter(o => o.status === 'pending').length,    cls: 'text-amber-600' },
          { label: 'Confirmed',  value: orders.filter(o => o.status === 'confirmed').length,  cls: 'text-navy-600' },
          { label: 'Packed',     value: orders.filter(o => o.status === 'packed').length,     cls: 'text-purple-600' },
          { label: 'Dispatched', value: orders.filter(o => o.status === 'dispatched').length, cls: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card px-4 py-3">
            <div className={`text-2xl font-black ${s.cls}`}>{s.value}</div>
            <div className="text-xs text-surface-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Search + Tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-9 h-9 text-xs"
            placeholder="Search order ID or medicine…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-surface-100 p-1 rounded-xl ml-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
                tab === t.id
                  ? 'bg-white text-surface-800 shadow-card'
                  : 'text-surface-500 hover:text-surface-700',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <OrderSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-20 text-center">
          <div className="w-16 h-16 rounded-3xl bg-surface-50 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={28} className="text-surface-300" />
          </div>
          <p className="text-base font-semibold text-surface-700">
            {search ? 'No orders match your search' : `No ${tab === 'active' ? 'active' : tab === 'done' ? 'completed' : ''} orders`}
          </p>
          <p className="text-sm text-surface-400 mt-1">
            {search ? 'Try a different order ID or medicine name' : 'New orders will appear here instantly'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onTransition={(id, status) => transitionMutation.mutate({ orderId: id, status })}
              isPending={transitionMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
