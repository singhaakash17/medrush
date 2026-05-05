import { apiClient } from './client';
import type { Cart, CartItem } from '@/types';

export const cartApi = {
  getCart: async (): Promise<Cart | null> => {
    const { data } = await apiClient.get('/cart/');
    return data;
  },
  getItems: async (cartId: string): Promise<CartItem[]> => {
    const { data } = await apiClient.get(`/cart/${cartId}/items`);
    return data;
  },
};
