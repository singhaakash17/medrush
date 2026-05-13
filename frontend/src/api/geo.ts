import { apiClient as client } from './client';
import type { NearbyPharmacy } from '@/types';
import { PHARMACIES } from '@/mock/data';

interface NearbyParams {
  lat: number;
  lon: number;
  radius_m?: number;
  medicine_id?: string;
}

export const geoApi = {
  nearbyPharmacies: async (params: NearbyParams): Promise<NearbyPharmacy[]> => {
    try {
      const { data } = await client.get('/geo/nearby-pharmacies', { params });
      return data;
    } catch {
      return PHARMACIES as unknown as NearbyPharmacy[];
    }
  },
};
