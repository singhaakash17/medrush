import { apiClient } from './client';
import type { Assignment, RiderShift } from '@/types';

export const logisticsApi = {
  getAssignment: async (orderId: string): Promise<Assignment> => {
    const { data } = await apiClient.get(`/logistics/orders/${orderId}/assignment`);
    return data;
  },

  getRiderAssignments: async (riderId: string): Promise<Assignment[]> => {
    const { data } = await apiClient.get(`/logistics/riders/${riderId}/assignments`);
    return data;
  },

  pingLocation: async (payload: {
    lat: number;
    lon: number;
    accuracy_m?: number;
    assignment_id?: string;
  }) => {
    await apiClient.post('/logistics/riders/location', payload);
  },

  verifyOtp: async (assignmentId: string, otp: string) => {
    const { data } = await apiClient.post(`/logistics/assignments/${assignmentId}/verify-otp`, { otp });
    return data;
  },

  updateAssignmentStatus: async (assignmentId: string, status: string) => {
    const { data } = await apiClient.patch(`/logistics/assignments/${assignmentId}/status`, { status });
    return data;
  },

  startShift: async (): Promise<RiderShift> => {
    const { data } = await apiClient.post('/logistics/riders/shift/start');
    return data;
  },

  endShift: async (): Promise<RiderShift> => {
    const { data } = await apiClient.post('/logistics/riders/shift/end');
    return data;
  },

  getActiveShift: async (): Promise<RiderShift | null> => {
    try {
      const { data } = await apiClient.get('/logistics/riders/shift/active');
      return data;
    } catch {
      return null;
    }
  },

  getRiderEarnings: async (riderId: string, period: string) => {
    const { data } = await apiClient.get(`/logistics/riders/${riderId}/earnings`, { params: { period } });
    return data;
  },
};
