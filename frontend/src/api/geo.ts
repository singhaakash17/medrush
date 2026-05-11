import { apiClient as client } from './client';
import type { NearbyPharmacy } from '@/types';

interface NearbyParams {
  lat: number;
  lon: number;
  radius_m?: number;
  medicine_id?: string;
}

export const geoApi = {
  nearbyPharmacies: async (params: NearbyParams): Promise<NearbyPharmacy[]> => {
    const { data } = await client.get('/geo/nearby-pharmacies', { params });
    return data;
  },
};
