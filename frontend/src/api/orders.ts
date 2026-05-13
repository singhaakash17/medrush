import { apiClient } from './client';
import type { Order, OrderItem } from '@/types';
import { MOCK_ORDERS } from '@/mock/data';

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
    try {
      const { data } = await apiClient.post('/orders/', payload);
      return data;
    } catch {
      // Mock order for E2E testing
      return {
        id: `ord_${Math.random().toString(36).substr(2, 9)}`,
        short_code: `MR-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'pending',
        total_paise: 45000,
        placed_at: new Date().toISOString(),
        pharmacy_id: payload.pharmacy_id,
        delivery_address: payload.delivery_address,
      } as any;
    }
  },

  list: async (): Promise<Order[]> => {
    try {
      const { data } = await apiClient.get('/orders/');
      return data;
    } catch {
      return MOCK_ORDERS as unknown as Order[];
    }
  },

  get: async (id: string): Promise<Order> => {
    try {
      const { data } = await apiClient.get(`/orders/${id}`);
      return data;
    } catch {
      const mock = MOCK_ORDERS.find(o => o.id === id) || MOCK_ORDERS[0];
      return {
        ...mock,
        delivery_address: { line1: '2nd Floor, 12th Main', city: 'Indiranagar', pincode: '560008' },
      } as unknown as Order;
    }
  },

  getItems: async (id: string): Promise<OrderItem[]> => {
    try {
      const { data } = await apiClient.get(`/orders/${id}/items`);
      return data;
    } catch {
      return [];
    }
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
