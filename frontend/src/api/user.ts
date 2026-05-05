import { apiClient } from './client';
import type { Profile, Address, FamilyMember } from '@/types';

export const userApi = {
  getProfile: async (): Promise<Profile> => {
    const { data } = await apiClient.get('/users/me');
    return data;
  },
  getAddresses: async (): Promise<Address[]> => {
    const { data } = await apiClient.get('/users/me/addresses');
    return data;
  },
  getFamily: async (): Promise<FamilyMember[]> => {
    const { data } = await apiClient.get('/users/me/family');
    return data;
  },
};
