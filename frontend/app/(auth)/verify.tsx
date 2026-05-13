import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, Alert, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/api/auth';

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit OTP sent to your phone.');
      return;
    }
    // MOCK DATA REVERSION
    setLoading(true);
    setTimeout(async () => {
      setLoading(false);
      await login(phone ?? 'mock_principal', 'customer');
      router.replace('/(tabs)');
    }, 800);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.sendOtp(phone);
      Alert.alert('OTP Resent', `A new OTP has been sent to ${phone}.`);
      setOtp('');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Could not resend OTP. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to {phone}</Text>

        <TextInput
          ref={inputRef}
          style={styles.otpInput}
          value={otp}
          onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          placeholder="_ _ _ _ _ _"
          placeholderTextColor="#D1D5DB"
          textAlign="center"
        />

        <Button title="Verify & Continue" onPress={handleVerify} loading={loading} style={{ marginTop: 24 }} />

        <TouchableOpacity onPress={handleResend} disabled={resending} style={{ marginTop: 16 }}>
          <Text style={styles.resend}>
            {resending ? 'Resending…' : "Didn't receive it? Resend OTP"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 80 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 8, marginBottom: 32 },
  otpInput: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 16,
    borderWidth: 2,
    borderColor: '#0EA5E9',
    borderRadius: 12,
    paddingVertical: 16,
    color: '#111827',
    backgroundColor: '#F0F9FF',
  },
  resend: { fontSize: 14, color: '#0EA5E9', textAlign: 'center', fontWeight: '600' },
});
