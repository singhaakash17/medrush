import axios from 'axios';
import { useAuthStore } from '@/store/auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const userId = useAuthStore.getState().principalId;
  const role = useAuthStore.getState().role;
  if (userId) {
    config.headers['x-user-id'] = userId;
    config.headers['x-user-role'] = role ?? 'customer';
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  },
);
