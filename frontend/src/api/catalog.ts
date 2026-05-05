import { apiClient } from './client';
import type { Medicine, MedicineWarning } from '@/types';

export const catalogApi = {
  search: async (q: string): Promise<Medicine[]> => {
    const { data } = await apiClient.get('/catalog/medicines', { params: { q } });
    return data;
  },
  getMedicine: async (id: string): Promise<Medicine> => {
    const { data } = await apiClient.get(`/catalog/medicines/${id}`);
    return data;
  },
  getWarnings: async (id: string): Promise<MedicineWarning[]> => {
    const { data } = await apiClient.get(`/catalog/medicines/${id}/warnings`);
    return data;
  },
};
