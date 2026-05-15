import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, KeyboardAvoidingView,
  Platform, Alert, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { T } from '@/theme';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth';

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef<TextInput>(null);

  // Countdown for resend
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit code sent to your phone.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/identity/otp/verify', {
        phone_e164: phone,
        otp,
      });
      const role = res.data.role ?? 'customer';
      await login(res.data.principal_id, role);
      router.replace((role === 'rider' ? '/rider/tasks' : '/(tabs)/') as any);
    } catch {
      Alert.alert('Incorrect OTP', 'The code you entered is wrong or has expired.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await apiClient.post('/identity/otp/send', { phone_e164: phone });
      setResendCooldown(30);
      setOtp('');
    } catch {
      Alert.alert('Error', 'Could not resend OTP.');
    }
  };

  // Render 6 individual digit boxes from single TextInput
  const digits = otp.padEnd(6, ' ').split('');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.screen}>

        {/* ── Header ─────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.iconWrap}>
            <Text style={{ fontSize: 28 }}>🔐</Text>
          </View>
          <Text style={s.title}>Enter OTP</Text>
          <Text style={s.sub}>
            Sent to{' '}
            <Text style={s.phone}>{phone}</Text>
          </Text>
        </View>

        {/* ── OTP boxes ──────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
          style={s.boxRow}
        >
          {digits.map((d, i) => (
            <View
              key={i}
              style={[
                s.box,
                i === otp.length && s.boxActive,
                otp.length > i && otp[i] !== undefined && s.boxFilled,
              ]}
            >
              <Text style={s.boxText}>{d.trim()}</Text>
            </View>
          ))}
        </TouchableOpacity>

        {/* Hidden real input */}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          style={s.hiddenInput}
          onSubmitEditing={handleVerify}
        />

        {/* ── Verify button ───────────────────────────────── */}
        <TouchableOpacity
          style={[s.cta, (otp.length < 6 || loading) && s.ctaDisabled]}
          onPress={handleVerify}
          disabled={otp.length < 6 || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.ctaText}>Verify & Continue →</Text>
          )}
        </TouchableOpacity>

        {/* ── Resend ─────────────────────────────────────── */}
        <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0} style={s.resend}>
          <Text style={[s.resendText, resendCooldown > 0 && s.resendDisabled]}>
            {resendCooldown > 0
              ? `Resend OTP in ${resendCooldown}s`
              : 'Didn\'t receive it? Resend OTP'}
          </Text>
        </TouchableOpacity>

        {/* Dev hint */}
        <View style={s.devHint}>
          <Text style={s.devHintText}>Dev mode: use OTP 000000</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const BOX_SIZE = 52;

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.Colors.white,
    padding: T.Spacing.xl,
    paddingTop: 80,
  },

  // Header
  header: { alignItems: 'center', marginBottom: T.Spacing['3xl'] },
  iconWrap: {
    width: 64, height: 64,
    borderRadius: T.Radius.xl,
    backgroundColor: T.Colors.navyLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: T.Spacing.lg,
  },
  title: {
    fontSize: T.FontSize['3xl'],
    fontWeight: T.FontWeight.black,
    color: T.Colors.textPrimary,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: T.FontSize.sm,
    color: T.Colors.textSecondary,
    marginTop: 6,
  },
  phone: {
    fontWeight: T.FontWeight.bold,
    color: T.Colors.textPrimary,
  },

  // OTP boxes
  boxRow: {
    flexDirection: 'row', gap: 10,
    justifyContent: 'center',
    marginBottom: T.Spacing['2xl'],
  },
  box: {
    width: BOX_SIZE, height: BOX_SIZE,
    borderRadius: T.Radius.md,
    borderWidth: 2, borderColor: T.Colors.border,
    backgroundColor: T.Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  boxActive: {
    borderColor: T.Colors.navyMid,
    backgroundColor: T.Colors.navyLight,
  },
  boxFilled: {
    borderColor: T.Colors.navy,
    backgroundColor: T.Colors.navyLight,
  },
  boxText: {
    fontSize: T.FontSize['2xl'],
    fontWeight: T.FontWeight.black,
    color: T.Colors.textPrimary,
  },
  hiddenInput: {
    position: 'absolute', opacity: 0, width: 1, height: 1,
  },

  // CTA
  cta: {
    backgroundColor: T.Colors.navyMid,
    borderRadius: T.Radius.lg,
    height: 52,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: T.Spacing.lg,
    ...T.Shadow.card,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: {
    fontSize: T.FontSize.md,
    fontWeight: T.FontWeight.black,
    color: T.Colors.textInverse,
    letterSpacing: 0.3,
  },

  // Resend
  resend: { alignItems: 'center', paddingVertical: T.Spacing.sm },
  resendText: { fontSize: T.FontSize.sm, color: T.Colors.navyMid, fontWeight: T.FontWeight.semibold },
  resendDisabled: { color: T.Colors.textTertiary },

  // Dev hint
  devHint: {
    position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center',
  },
  devHintText: {
    fontSize: T.FontSize.xs,
    color: T.Colors.textTertiary,
    fontWeight: T.FontWeight.medium,
  },
});
