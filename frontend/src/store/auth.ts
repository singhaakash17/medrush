import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

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
    await SecureStore.setItemAsync('principal_id', principalId);
    await SecureStore.setItemAsync('role', role);
    set({ principalId, role, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('principal_id');
    await SecureStore.deleteItemAsync('role');
    set({ principalId: null, role: null, isAuthenticated: false });
  },

  hydrate: async () => {
    try {
      const principalId = await SecureStore.getItemAsync('principal_id');
      const role = await SecureStore.getItemAsync('role');
      if (principalId) {
        set({ principalId, role: role ?? 'customer', isAuthenticated: true });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
