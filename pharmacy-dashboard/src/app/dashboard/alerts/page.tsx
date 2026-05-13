'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AlertTriangle, Clock, Package, RefreshCw, CheckCircle } from 'lucide-react';

interface LowStockAlert {
  medicine_id: string;
  qty_available: number;
  reorder_level: number;
  current_expiry: string | null;
}

interface ExpiryAlert {
  id: string;
  medicine_id: string;
  batch_no: string;
  expiry_date: string;
  qty_remaining: number;
  days_until_expiry: number;
}

interface AlertsData {
  low_stock: LowStockAlert[];
  expiring_soon: ExpiryAlert[];
}

function usePharmacyId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pharmacy_id') ?? '';
}

function expiryColor(days: number) {
  if (days <= 0)  return 'bg-red-50 border-red-200 text-red-700';
  if (days <= 30) return 'bg-red-50 border-red-200 text-red-700';
  if (days <= 60) return 'bg-orange-50 border-orange-200 text-orange-700';
  return 'bg-amber-50 border-amber-200 text-amber-700';
}

function stockColor(available: number, reorderLevel: number) {
  if (available === 0) return 'bg-red-50 border-red-200 text-red-700';
  if (available <= Math.max(reorderLevel, 3)) return 'bg-orange-50 border-orange-200 text-orange-700';
  return 'bg-amber-50 border-amber-200 text-amber-700';
}

function expiryLabel(days: number) {
  if (days <= 0)  return 'EXPIRED';
  if (days === 1) return '1 day left';
  if (days < 30)  return `${days} days left`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} left`;
}

export default function AlertsPage() {
  const pharmacyId = usePharmacyId();

  const { data, isLoading, refetch, isFetching } = useQuery<AlertsData>({
    queryKey: ['alerts', pharmacyId],
    queryFn: async () => (await api.get(`/inventory/pharmacies/${pharmacyId}/alerts`)).data,
    enabled: !!pharmacyId,
    refetchInterval: 60_000,
  });

  const lowStock = data?.low_stock ?? [];
  const expiring = data?.expiring_soon ?? [];
  const critical = lowStock.filter((a) => a.qty_available === 0);
  const expired = expiring.filter((a) => a.days_until_expiry <= 0);

  const totalAlerts = lowStock.length + expiring.length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Alerts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Stock warnings that need your attention</p>
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

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <div className={`rounded-2xl border shadow-sm p-4 ${critical.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Package size={14} className={critical.length > 0 ? 'text-red-500' : 'text-slate-400'} />
            <p className={`text-xs ${critical.length > 0 ? 'text-red-600' : 'text-slate-500'}`}>Out of Stock</p>
          </div>
          <p className={`text-2xl font-bold ${critical.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>{critical.length}</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-4 ${lowStock.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className={lowStock.length > 0 ? 'text-amber-500' : 'text-slate-400'} />
            <p className={`text-xs ${lowStock.length > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Low Stock</p>
          </div>
          <p className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{lowStock.length}</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-4 ${expired.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className={expired.length > 0 ? 'text-red-500' : 'text-slate-400'} />
            <p className={`text-xs ${expired.length > 0 ? 'text-red-600' : 'text-slate-500'}`}>Expired Batches</p>
          </div>
          <p className={`text-2xl font-bold ${expired.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>{expired.length}</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-4 ${expiring.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className={expiring.length > 0 ? 'text-orange-500' : 'text-slate-400'} />
            <p className={`text-xs ${expiring.length > 0 ? 'text-orange-600' : 'text-slate-500'}`}>Expiring Soon</p>
          </div>
          <p className={`text-2xl font-bold ${expiring.length > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{expiring.length}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
      ) : totalAlerts === 0 ? (
        <div className="text-center py-24">
          <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400" />
          <h2 className="text-lg font-bold text-slate-700">All Clear!</h2>
          <p className="text-sm text-slate-400 mt-1">No stock alerts. Everything looks good.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Low Stock */}
          {lowStock.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-500" />
                <h2 className="font-bold text-slate-700">Low Stock ({lowStock.length})</h2>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {lowStock.map((alert) => {
                  const cls = stockColor(alert.qty_available, alert.reorder_level);
                  return (
                    <div key={alert.medicine_id} className={`flex items-center justify-between p-4 rounded-xl border ${cls}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center">
                          <Package size={16} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm font-mono">{alert.medicine_id}</p>
                          <p className="text-xs opacity-70 mt-0.5">
                            Reorder level: {alert.reorder_level} units
                            {alert.current_expiry && ` · Expiry: ${new Date(alert.current_expiry).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black">{alert.qty_available}</p>
                        <p className="text-xs opacity-70">units left</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Expiring Soon */}
          {expiring.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-orange-500" />
                <h2 className="font-bold text-slate-700">Expiring Within 90 Days ({expiring.length})</h2>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {expiring.map((alert) => {
                  const cls = expiryColor(alert.days_until_expiry);
                  const expiryDate = new Date(alert.expiry_date).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  });
                  return (
                    <div key={alert.id} className={`flex items-center justify-between p-4 rounded-xl border ${cls}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center">
                          <Clock size={16} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm font-mono">{alert.medicine_id}</p>
                          <p className="text-xs opacity-70 mt-0.5">
                            Batch <span className="font-mono font-semibold">{alert.batch_no}</span> · Expires {expiryDate}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{expiryLabel(alert.days_until_expiry)}</p>
                        <p className="text-xs opacity-70">{alert.qty_remaining} units in batch</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
