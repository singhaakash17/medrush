import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const clean = phone.trim().replace(/\s/g, '');
    if (!/^[6-9]\d{9}$/.test(clean)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    try {
      // In production, POST /api/v1/identity/otp/send
      // For now navigate directly to verify
      router.push({ pathname: '/(auth)/verify', params: { phone: `+91${clean}` } });
    } catch {
      Alert.alert('Error', 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>💊 MedRush</Text>
          <Text style={styles.tagline}>Medicines delivered fast</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Enter your mobile number</Text>
          <Text style={styles.subtitle}>We'll send you a one-time password</Text>

          <Input
            label="Mobile Number"
            placeholder="98765 43210"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
          />

          <Button title="Send OTP" onPress={handleSendOtp} loading={loading} />
        </View>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 36, fontWeight: '800', color: '#0EA5E9' },
  tagline: { fontSize: 16, color: '#6B7280', marginTop: 6 },
  form: { marginBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  terms: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
});
