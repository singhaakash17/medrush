import { apiClient } from './client';
import type { Prescription } from '@/types';

export const rxApi = {
  list: async (): Promise<Prescription[]> => {
    const { data } = await apiClient.get('/rx/');
    return data;
  },
  get: async (id: string): Promise<Prescription> => {
    const { data } = await apiClient.get(`/rx/${id}`);
    return data;
  },
};
