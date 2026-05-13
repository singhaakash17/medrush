import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const storage = {
  getItem: async (key: string) => {
    if (isWeb) return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (isWeb) {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  deleteItem: async (key: string) => {
    if (isWeb) {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

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
    await storage.deleteItem('principal_id');
    await storage.deleteItem('role');
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
