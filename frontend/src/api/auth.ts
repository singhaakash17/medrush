import { apiClient } from './client';

export interface OtpSendResponse {
  message: string;
}

export interface OtpVerifyResponse {
  principal_id: string;
  role: string;
}

export const authApi = {
  /**
   * Sends a 6-digit OTP to the given E.164 phone number.
   * The OTP is printed to the backend console in dev.
   */
  sendOtp: async (phone_e164: string): Promise<OtpSendResponse> => {
    const { data } = await apiClient.post('/identity/otp/send', { phone_e164 });
    return data;
  },

  /**
   * Verifies the OTP and returns the principal_id to store in the auth store.
   */
  verifyOtp: async (phone_e164: string, otp: string): Promise<OtpVerifyResponse> => {
    const { data } = await apiClient.post('/identity/otp/verify', { phone_e164, otp });
    return data;
  },
};
