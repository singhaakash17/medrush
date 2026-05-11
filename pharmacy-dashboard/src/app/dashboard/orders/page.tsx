'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { api, formatPaise, formatTime } from '@/lib/api';
import { SlaCountdown } from '@/components/SlaCountdown';

type OrderStatus = 'pending' | 'confirmed' | 'packed' | 'dispatched' | 'delivered' | 'cancelled';

interface OrderItem {
  medicine_id: string;
  medicine_name: string;
  qty: number;
  unit_price_paise: number;
}

interface Order {
  id: string;
  status: OrderStatus;
  placed_at: string;
  sla_target_at: string;
  total_paise: number;
  customer_name?: string;
  items: OrderItem[];
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'New',
  confirmed: 'Confirmed',
  packed: 'Packed',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

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

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-sky-100 text-sky-700',
  packed: 'bg-violet-100 text-violet-700',
  dispatched: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'packed', 'dispatched'];
const DONE_STATUSES: OrderStatus[] = ['delivered', 'cancelled'];

type Tab = 'active' | 'done' | 'all';

function usePharmacyId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pharmacy_id') ?? '';
}

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>('active');
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const pharmacyId = usePharmacyId();

  const statuses: OrderStatus[] =
    tab === 'active' ? ACTIVE_STATUSES : tab === 'done' ? DONE_STATUSES : [...ACTIVE_STATUSES, ...DONE_STATUSES];

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['pharmacy-orders', pharmacyId, statuses],
    queryFn: async () => {
      const res = await api.get(`/orders/pharmacy/${pharmacyId}`, { params: { statuses: statuses.join(',') } });
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

  // WebSocket for real-time new orders
  useEffect(() => {
    if (!pharmacyId) return;
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/^http/, 'ws');
    const ws = new WebSocket(`${base}/ws/pharmacy/${pharmacyId}`);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.event === 'new_order' || msg.event === 'status_update') {
          qc.invalidateQueries({ queryKey: ['pharmacy-orders'] });
        }
      } catch {}
    };

    const ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: 'ping' })), 25_000);
    return () => {
      clearInterval(ping);
      ws.close();
    };
  }, [pharmacyId, qc]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'active', label: 'Active' },
    { id: 'done', label: 'Completed' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time order management</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-slate-500">Live</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-medium">No {tab === 'active' ? 'active' : tab === 'done' ? 'completed' : ''} orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const next = NEXT_STATUS[order.status];
            const isActive = ACTIVE_STATUSES.includes(order.status);
            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  order.status === 'pending' ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-100'
                }`}
              >
                <div className="px-5 py-4 flex items-start gap-4">
                  {/* Left: Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-slate-400">#{order.id.slice(0, 8)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                      {isActive && <SlaCountdown slaTargetAt={order.sla_target_at} placedAt={order.placed_at} />}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {order.items.slice(0, 2).map((it) => (
                        <span key={it.medicine_id} className="mr-2">
                          {it.medicine_name} ×{it.qty}
                        </span>
                      ))}
                      {order.items.length > 2 && (
                        <span className="text-slate-400">+{order.items.length - 2} more</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {formatTime(order.placed_at)} · {formatPaise(order.total_paise)}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      View
                    </Link>
                    {next && (
                      <button
                        onClick={() => transitionMutation.mutate({ orderId: order.id, status: next })}
                        disabled={transitionMutation.isPending}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0c4a6e] text-white hover:bg-[#0e5f8a] disabled:opacity-50 transition-colors"
                      >
                        {NEXT_LABEL[order.status]}
                      </button>
                    )}
                    {order.status === 'pending' && (
                      <button
                        onClick={() => transitionMutation.mutate({ orderId: order.id, status: 'cancelled' })}
                        disabled={transitionMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
