import { create } from 'zustand';
import type { Cart, CartItem } from '@/types';

interface CartState {
  cart: Cart | null;
  items: CartItem[];
  setCart: (cart: Cart | null) => void;
  setItems: (items: CartItem[]) => void;
  totalPaise: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  items: [],
  setCart: (cart) => set({ cart }),
  setItems: (items) => set({ items }),
  totalPaise: () => get().items.reduce((sum, i) => sum + i.unit_price_paise * i.qty, 0),
  itemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
}));
