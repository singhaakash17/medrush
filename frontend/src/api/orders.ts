import { apiClient } from './client';
import type { Order, OrderItem } from '@/types';

export interface PlaceOrderPayload {
  pharmacy_id: string;
  items: { medicine_id: string; qty: number }[];
  delivery_address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    lat?: number;
    lon?: number;
  };
  rx_id?: string;
  coupon_code?: string;
  payment_method?: string;
}

export const ordersApi = {
  place: async (payload: PlaceOrderPayload): Promise<Order> => {
    const { data } = await apiClient.post('/orders/', payload);
    return data;
  },

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

  getHistory: async (id: string) => {
    const { data } = await apiClient.get(`/orders/${id}/history`);
    return data;
  },

  updateStatus: async (id: string, status: string, reason?: string) => {
    const { data } = await apiClient.patch(`/orders/${id}/status`, { status, reason });
    return data;
  },

  rate: async (id: string, payload: { pharmacy_rating?: number; delivery_rating?: number; comment?: string }) => {
    await apiClient.post(`/orders/${id}/rate`, payload);
  },

  // Pharmacy: get orders
  getPharmacyOrders: async (pharmacyId: string, statuses?: string) => {
    const { data } = await apiClient.get(`/orders/pharmacy/${pharmacyId}`, {
      params: statuses ? { statuses } : undefined,
    });
    return data as Order[];
  },
};
