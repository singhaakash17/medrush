'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, formatPaise } from '@/lib/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, IndianRupee, Clock, Package } from 'lucide-react';

type Period = '7d' | '30d' | '90d';

interface EarningsDay {
  date: string;
  orders: number;
  gmv_paise: number;
  earnings_paise: number;
}

interface EarningSummary {
  total_orders: number;
  total_gmv_paise: number;
  total_earnings_paise: number;
  avg_order_value_paise: number;
  pending_payout_paise: number;
  daily: EarningsDay[];
}

interface Payout {
  id: string;
  period_start: string;
  period_end: string;
  amount_paise: number;
  status: 'pending' | 'processing' | 'paid';
  settled_at?: string;
  utr?: string;
}

function usePharmacyId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pharmacy_id') ?? '';
}

const PAYOUT_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-sky-50 text-sky-700',
  paid: 'bg-green-50 text-green-700',
};

export default function EarningsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const pharmacyId = usePharmacyId();

  const { data: summary, isLoading: summaryLoading } = useQuery<EarningSummary>({
    queryKey: ['earnings', pharmacyId, period],
    queryFn: async () => (await api.get(`/pharmacy/${pharmacyId}/earnings`, { params: { period } })).data,
    enabled: !!pharmacyId,
    // Fallback mock data for development
    placeholderData: {
      total_orders: 142,
      total_gmv_paise: 38_40000,
      total_earnings_paise: 28_80000,
      avg_order_value_paise: 27_000,
      pending_payout_paise: 9_60000,
      daily: Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          orders: Math.floor(Math.random() * 20) + 5,
          gmv_paise: Math.floor(Math.random() * 500_000) + 200_000,
          earnings_paise: Math.floor(Math.random() * 400_000) + 150_000,
        };
      }),
    },
  });

  const { data: payouts = [] } = useQuery<Payout[]>({
    queryKey: ['payouts', pharmacyId],
    queryFn: async () => (await api.get(`/pharmacy/${pharmacyId}/payouts`)).data,
    enabled: !!pharmacyId,
    placeholderData: [
      {
        id: '1',
        period_start: '2026-05-01',
        period_end: '2026-05-07',
        amount_paise: 9_60000,
        status: 'pending',
      },
      {
        id: '2',
        period_start: '2026-04-24',
        period_end: '2026-04-30',
        amount_paise: 12_30000,
        status: 'paid',
        settled_at: '2026-05-02',
        utr: 'UTR123456789',
      },
    ],
  });

  const periods: { id: Period; label: string }[] = [
    { id: '7d', label: '7 days' },
    { id: '30d', label: '30 days' },
    { id: '90d', label: '90 days' },
  ];

  const stats = [
    {
      icon: IndianRupee,
      label: 'Earnings',
      value: formatPaise(summary?.total_earnings_paise ?? 0),
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      icon: Package,
      label: 'Orders',
      value: summary?.total_orders ?? 0,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
    {
      icon: TrendingUp,
      label: 'Avg Order Value',
      value: formatPaise(summary?.avg_order_value_paise ?? 0),
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      icon: Clock,
      label: 'Pending Payout',
      value: formatPaise(summary?.pending_payout_paise ?? 0),
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Earnings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Revenue analytics and payout history</p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon size={16} className={stat.color} />
            </div>
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Earnings Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
        <h2 className="font-semibold text-slate-700 text-sm mb-4">Daily Earnings</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={summary?.daily ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0c4a6e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0c4a6e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `₹${(v / 100).toFixed(0)}`}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip
              formatter={(value: number) => [formatPaise(value), 'Earnings']}
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="earnings_paise"
              stroke="#0c4a6e"
              strokeWidth={2.5}
              fill="url(#earningsGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Orders Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
        <h2 className="font-semibold text-slate-700 text-sm mb-4">Orders per Day</h2>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={summary?.daily ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              formatter={(value: number) => [value, 'Orders']}
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="orders"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#ordersGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Payout History */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700 text-sm">Payout History</h2>
        </div>
        {payouts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No payouts yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Period</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">UTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <p className="text-slate-700 font-medium">
                      {new Date(p.period_start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} —{' '}
                      {new Date(p.period_end).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </p>
                    {p.settled_at && (
                      <p className="text-xs text-slate-400">
                        Paid {new Date(p.settled_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-700">
                    {formatPaise(p.amount_paise)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${PAYOUT_STATUS_STYLE[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-xs font-mono text-slate-400">{p.utr ?? '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
