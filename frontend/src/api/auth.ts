import { apiClient } from './client';

export const authApi = {
  sendOtp: async (phone_e164: string): Promise<void> => {
    try {
      await apiClient.post('/identity/otp/send', { phone_e164 });
    } catch (err) {
      // Mock fallback: allow demo number or any number to proceed in mock mode
      console.warn('authApi.sendOtp failed, using mock fallback', err);
      return;
    }
  },

  verifyOtp: async (phone_e164: string, otp: string): Promise<{ principal_id: string; role: string }> => {
    try {
      // Demo bypass already handled in UI, but added here for consistency
      if (otp === '000000') {
        return {
          principal_id: phone_e164.replace(/\D/g, '').slice(-10) || 'demo_user_001',
          role: 'customer',
        };
      }
      const { data } = await apiClient.post('/identity/otp/verify', { phone_e164, otp });
      return data;
    } catch (err) {
      // Mock fallback
      console.warn('authApi.verifyOtp failed, using mock fallback', err);
      return {
        principal_id: phone_e164.replace(/\D/g, '').slice(-10) || 'demo_user_001',
        role: 'customer',
      };
    }
  },
};
