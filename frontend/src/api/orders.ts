import { apiClient } from './client';
import type { Order, OrderItem } from '@/types';

export const ordersApi = {
  list: async (): Promise<Order[]> => {
    const { data } = await apiClient.get('/orders/');
    return data;
  },
  get: async (id: string): Promise<Order> => {
    const { data } = await apiClient.get(`/orders/${id}`);
    return data;
  },
  getItems: async (id: string): Promise<OrderItem[]> => {
    const { data } = await apiClient.get(`/orders/${id}/items`);
    return data;
  },
};
