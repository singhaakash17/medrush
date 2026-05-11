import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Inject pharmacist/pharmacy headers
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const pharmacyId = localStorage.getItem('pharmacy_id');
    const userId = localStorage.getItem('user_id');
    if (pharmacyId) config.headers['x-pharmacy-id'] = pharmacyId;
    if (userId) config.headers['x-user-id'] = userId;
  }
  return config;
});

export function formatPaise(paise: number) {
  return `₹${(paise / 100).toFixed(0)}`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
