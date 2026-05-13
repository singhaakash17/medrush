import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ─── Platform-aware storage shim ─────────────────────────────────────────────
// expo-secure-store only works on native (iOS/Android).
// On web we fall back to localStorage so the app doesn't crash.

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// ─── Auth store ───────────────────────────────────────────────────────────────

interface AuthState {
  principalId: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (principalId: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  principalId: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (principalId, role = 'customer') => {
    await storage.setItem('principal_id', principalId);
    await storage.setItem('role', role);
    set({ principalId, role, isAuthenticated: true });
  },

  logout: async () => {
    await storage.removeItem('principal_id');
    await storage.removeItem('role');
    set({ principalId: null, role: null, isAuthenticated: false });
  },

  hydrate: async () => {
    try {
      const principalId = await storage.getItem('principal_id');
      const role = await storage.getItem('role');
      if (principalId) {
        set({ principalId, role: role ?? 'customer', isAuthenticated: true });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
