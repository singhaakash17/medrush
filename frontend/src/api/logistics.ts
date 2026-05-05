import { apiClient } from './client';
import type { Assignment } from '@/types';

export const logisticsApi = {
  getAssignment: async (orderId: string): Promise<Assignment> => {
    const { data } = await apiClient.get(`/logistics/orders/${orderId}/assignment`);
    return data;
  },
};
