import { apiClient } from './client';
import type { Prescription, PrescriptionDetail } from '@/types';

export const rxApi = {
  getPresignedUrl: async (): Promise<{ upload_url: string; s3_key: string; expires_in: number }> => {
    const { data } = await apiClient.get('/rx/presigned-upload');
    return data;
  },

  upload: async (payload: { s3_key: string; family_member_id?: string }): Promise<PrescriptionDetail> => {
    const { data } = await apiClient.post('/rx/', payload);
    return data;
  },

  list: async (): Promise<Prescription[]> => {
    const { data } = await apiClient.get('/rx/');
    return data;
  },

  get: async (id: string): Promise<Prescription> => {
    const { data } = await apiClient.get(`/rx/${id}`);
    return data;
  },

  getItems: async (id: string) => {
    const { data } = await apiClient.get(`/rx/${id}/items`);
    return data;
  },

  getFlags: async (id: string) => {
    const { data } = await apiClient.get(`/rx/${id}/flags`);
    return data;
  },

  verify: async (id: string, payload: { approved: boolean; notes?: string }) => {
    const { data } = await apiClient.patch(`/rx/${id}/verify`, payload);
    return data;
  },
};
