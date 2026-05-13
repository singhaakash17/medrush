import { apiClient } from './client';

export const notificationsApi = {
  registerToken: async (token: string, platform: 'ios' | 'android' | 'web') => {
    await apiClient.post('/notifications/device-token', { token, platform });
  },

  deregisterToken: async (token: string) => {
    await apiClient.delete(`/notifications/device-token/${encodeURIComponent(token)}`).catch(() => {});
  },

  list: async () => {
    const { data } = await apiClient.get('/notifications/');
    return data;
  },
};
