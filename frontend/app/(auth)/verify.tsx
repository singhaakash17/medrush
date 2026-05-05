import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit OTP sent to your phone.');
      return;
    }
    setLoading(true);
    try {
      // In production: POST /api/v1/identity/otp/verify → returns { principal_id, role }
      // Mocked: treat any 6-digit OTP as valid and use phone as principal_id
      const mockPrincipalId = `principal_${phone?.replace('+91', '')}`;
      await login(mockPrincipalId, 'customer');
      router.replace('/(tabs)/');
    } catch {
      Alert.alert('Error', 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
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

        <Text style={styles.resend}>Didn't receive it? Resend OTP</Text>
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
  resend: { fontSize: 14, color: '#0EA5E9', textAlign: 'center', marginTop: 24, fontWeight: '600' },
});
