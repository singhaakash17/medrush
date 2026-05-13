import { apiClient } from './client';
import type { Profile, Address, FamilyMember } from '@/types';
import { MOCK_ADDRESSES } from '@/mock/data';

export const userApi = {
  getProfile: async (): Promise<Profile> => {
    try {
      const { data } = await apiClient.get('/users/me');
      return data;
    } catch {
      return {
        id: 'demo_user_001',
        full_name: 'MedRush Demo',
        email: 'demo@medrush.com',
        phone_e164: '+919876543210',
      } as Profile;
    }
  },
  getAddresses: async (): Promise<Address[]> => {
    try {
      const { data } = await apiClient.get('/users/me/addresses');
      return data;
    } catch {
      return MOCK_ADDRESSES as unknown as Address[];
    }
  },
  getFamily: async (): Promise<FamilyMember[]> => {
    try {
      const { data } = await apiClient.get('/users/me/family');
      return data;
    } catch {
      return [];
    }
  },
};
