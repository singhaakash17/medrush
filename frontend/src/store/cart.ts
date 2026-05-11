import { create } from 'zustand';

export interface LocalCartItem {
  medicine_id: string;
  medicine_name: string;
  generic_name: string;
  form: string;
  qty: number;
  unit_price_paise: number;
  mrp_paise: number;
  rx_required: boolean;
  pharmacy_id: string;
  pharmacy_name: string;
}

interface CartState {
  items: LocalCartItem[];
  pharmacyId: string | null;
  pharmacyName: string | null;
  addItem: (item: Omit<LocalCartItem, 'qty'>) => void;
  removeItem: (medicine_id: string) => void;
  updateQty: (medicine_id: string, qty: number) => void;
  clearCart: () => void;
  totalPaise: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  pharmacyId: null,
  pharmacyName: null,

  addItem: (item) => {
    const { items, pharmacyId } = get();
    if (pharmacyId && pharmacyId !== item.pharmacy_id) {
      set({ items: [{ ...item, qty: 1 }], pharmacyId: item.pharmacy_id, pharmacyName: item.pharmacy_name });
      return;
    }
    const existing = items.find((i) => i.medicine_id === item.medicine_id);
    if (existing) {
      set({ items: items.map((i) => i.medicine_id === item.medicine_id ? { ...i, qty: i.qty + 1 } : i) });
    } else {
      set({ items: [...items, { ...item, qty: 1 }], pharmacyId: item.pharmacy_id, pharmacyName: item.pharmacy_name });
    }
  },

  removeItem: (medicine_id) => {
    const next = get().items.filter((i) => i.medicine_id !== medicine_id);
    set({ items: next, ...(next.length === 0 ? { pharmacyId: null, pharmacyName: null } : {}) });
  },

  updateQty: (medicine_id, qty) => {
    if (qty <= 0) { get().removeItem(medicine_id); return; }
    set({ items: get().items.map((i) => i.medicine_id === medicine_id ? { ...i, qty } : i) });
  },

  clearCart: () => set({ items: [], pharmacyId: null, pharmacyName: null }),

  totalPaise: () => get().items.reduce((sum, i) => sum + i.unit_price_paise * i.qty, 0),

  itemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
}));
