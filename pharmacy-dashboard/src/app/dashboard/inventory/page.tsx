'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, formatPaise } from '@/lib/api';
import { Search, Package, ToggleLeft, ToggleRight } from 'lucide-react';

interface InventoryItem {
  medicine_id: string;
  medicine_name: string;
  generic_name: string;
  form: string;
  strength: string;
  qty_on_hand: number;
  qty_reserved: number;
  selling_price_paise: number;
  mrp_paise: number;
  is_listed: boolean;
  unlisted_reason?: string;
}

function usePharmacyId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pharmacy_id') ?? '';
}

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [showUnlisted, setShowUnlisted] = useState(false);
  const qc = useQueryClient();
  const pharmacyId = usePharmacyId();

  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory', pharmacyId],
    queryFn: async () => (await api.get(`/inventory/pharmacies/${pharmacyId}`)).data,
    enabled: !!pharmacyId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ medicineId, isListed }: { medicineId: string; isListed: boolean }) =>
      api.patch(`/inventory/pharmacies/${pharmacyId}/medicines/${medicineId}/listing`, {
        is_listed: isListed,
        reason: isListed ? undefined : 'Out of stock',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory', pharmacyId] }),
  });

  const filtered = items.filter((it) => {
    const matchSearch =
      !search ||
      it.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
      it.generic_name.toLowerCase().includes(search.toLowerCase());
    const matchListed = showUnlisted ? !it.is_listed : true;
    return matchSearch && matchListed;
  });

  const listedCount = items.filter((it) => it.is_listed).length;
  const lowStockCount = items.filter((it) => it.qty_on_hand - it.qty_reserved < 5).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage medicine listings and stock</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500">Total SKUs</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{items.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500">Active Listings</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{listedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4">
          <p className="text-xs text-amber-600">Low Stock</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicines..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0c4a6e] bg-white"
          />
        </div>
        <button
          onClick={() => setShowUnlisted(!showUnlisted)}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            showUnlisted
              ? 'bg-[#0c4a6e] text-white border-[#0c4a6e]'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Unlisted only
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No items found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Medicine</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Listed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((item) => {
                const available = item.qty_on_hand - item.qty_reserved;
                const isLowStock = available < 5;
                return (
                  <tr key={item.medicine_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-slate-700">{item.medicine_name}</p>
                        <p className="text-xs text-slate-400">{item.generic_name} · {item.form} · {item.strength}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`font-semibold ${isLowStock ? 'text-amber-600' : 'text-slate-700'}`}>
                        {available}
                      </span>
                      {item.qty_reserved > 0 && (
                        <span className="text-xs text-slate-400 ml-1">({item.qty_reserved} reserved)</span>
                      )}
                      {isLowStock && <p className="text-[10px] text-amber-500">Low stock</p>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <p className="font-medium text-slate-700">{formatPaise(item.selling_price_paise)}</p>
                      {item.mrp_paise !== item.selling_price_paise && (
                        <p className="text-xs text-slate-400 line-through">{formatPaise(item.mrp_paise)}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() =>
                          toggleMutation.mutate({ medicineId: item.medicine_id, isListed: !item.is_listed })
                        }
                        disabled={toggleMutation.isPending}
                        className="inline-flex items-center justify-center disabled:opacity-50"
                        title={item.is_listed ? 'Click to unlist' : 'Click to list'}
                      >
                        {item.is_listed ? (
                          <ToggleRight size={28} className="text-green-500" />
                        ) : (
                          <ToggleLeft size={28} className="text-slate-300" />
                        )}
                      </button>
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
