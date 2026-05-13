import { apiClient } from './client';
import type { Medicine, MedicineWarning } from '@/types';
import { MEDICINES } from '@/mock/data';

// Featured medicine IDs used as mock fallback
const FEATURED_IDS = ['med_001', 'med_007', 'med_013', 'med_028', 'med_032', 'med_019'];

export const catalogApi = {
  search: async (q: string): Promise<Medicine[]> => {
    try {
      const { data } = await apiClient.get('/catalog/medicines', { params: { q } });
      return data;
    } catch {
      const query = q.toLowerCase();
      return MEDICINES.filter(m => 
        m.brand_name.toLowerCase().includes(query) || 
        m.generic_name.toLowerCase().includes(query)
      ) as unknown as Medicine[];
    }
  },

  getFeatured: async (): Promise<Medicine[]> => {
    try {
      const { data } = await apiClient.get('/catalog/medicines/featured');
      return data;
    } catch {
      // Backend may not have this endpoint yet — return mock featured list
      return FEATURED_IDS
        .map((id) => MEDICINES.find((m) => m.id === id))
        .filter(Boolean) as unknown as Medicine[];
    }
  },

  getMedicine: async (id: string): Promise<Medicine> => {
    try {
      const { data } = await apiClient.get(`/catalog/medicines/${id}`);
      return data;
    } catch {
      const mock = MEDICINES.find(m => m.id === id);
      if (!mock) throw new Error('Medicine not found');
      return mock as unknown as Medicine;
    }
  },

  getWarnings: async (id: string): Promise<MedicineWarning[]> => {
    try {
      const { data } = await apiClient.get(`/catalog/medicines/${id}/warnings`);
      return data;
    } catch {
      return [];
    }
  },
};
