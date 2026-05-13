import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Alert, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { T } from '@/theme';
import { apiClient } from '@/api/client';

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
      await apiClient.post('/identity/otp/send', { phone_e164: `+91${clean}` });
      router.push({ pathname: '/(auth)/verify', params: { phone: `+91${clean}` } });
    } catch {
      Alert.alert('Error', 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand hero ─────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.logoMark}>
            <Text style={s.logoIcon}>⚡</Text>
          </View>
          <Text style={s.brandName}>MedRush</Text>
          <Text style={s.tagline}>Medicines in 15 minutes</Text>

          {/* Pill badges */}
          <View style={s.pills}>
            {['🏥 2500+ Medicines', '📍 Indiranagar · Koramangala', '✅ Licensed Pharmacies'].map(p => (
              <View key={p} style={s.pill}>
                <Text style={s.pillText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Form card ──────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.formTitle}>Enter your mobile number</Text>
          <Text style={s.formSub}>We'll send a 6-digit OTP to verify you</Text>

          {/* Phone input */}
          <View style={s.phoneRow}>
            <View style={s.countryCode}>
              <Text style={s.countryText}>🇮🇳 +91</Text>
            </View>
            <TextInput
              style={s.phoneInput}
              placeholder="98765 43210"
              placeholderTextColor={T.Colors.textTertiary}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              returnKeyType="done"
              onSubmitEditing={handleSendOtp}
            />
          </View>

          <TouchableOpacity
            style={[s.cta, loading && s.ctaDisabled]}
            onPress={handleSendOtp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.ctaText}>Send OTP →</Text>
            )}
          </TouchableOpacity>

          {/* Demo hint */}
          <TouchableOpacity
            onPress={() => {
              setPhone('9876543210');
            }}
            style={s.demoHint}
          >
            <Text style={s.demoHintText}>Use demo number: 9876543210</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.terms}>
          By continuing, you agree to our{' '}
          <Text style={s.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={s.termsLink}>Privacy Policy</Text>
        </Text>

        {/* Rider login entry point */}
        <TouchableOpacity
          style={s.riderLink}
          onPress={() => router.push('/(auth)/rider-login')}
          activeOpacity={0.7}
        >
          <Text style={s.riderLinkText}>🛵  Are you a delivery partner?  →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: T.Colors.navy,
    padding: T.Spacing.xl,
    justifyContent: 'center',
  },

  // Hero
  hero: { alignItems: 'center', paddingVertical: T.Spacing['3xl'] },
  logoMark: {
    width: 72, height: 72,
    borderRadius: T.Radius.xl,
    backgroundColor: T.Colors.emerald,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: T.Spacing.lg,
    ...T.Shadow.cardLg,
  },
  logoIcon: { fontSize: 32 },
  brandName: {
    fontSize: T.FontSize['4xl'],
    fontWeight: T.FontWeight.black,
    color: T.Colors.textInverse,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: T.FontSize.md,
    color: 'rgba(255,255,255,0.5)',
    marginTop: T.Spacing.xs,
    fontWeight: T.FontWeight.medium,
  },
  pills: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    justifyContent: 'center', marginTop: T.Spacing.lg,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: T.Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  pillText: { fontSize: T.FontSize.xs, color: 'rgba(255,255,255,0.6)', fontWeight: T.FontWeight.medium },

  // Card
  card: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius['2xl'],
    padding: T.Spacing['2xl'],
    marginBottom: T.Spacing.xl,
    ...T.Shadow.cardLg,
  },
  formTitle: {
    fontSize: T.FontSize.xl,
    fontWeight: T.FontWeight.black,
    color: T.Colors.textPrimary,
    letterSpacing: -0.5,
  },
  formSub: {
    fontSize: T.FontSize.sm,
    color: T.Colors.textTertiary,
    marginTop: 4,
    marginBottom: T.Spacing.xl,
  },

  // Phone input
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: T.Colors.border,
    borderRadius: T.Radius.lg,
    marginBottom: T.Spacing.lg,
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: T.Colors.surface,
    paddingHorizontal: T.Spacing.md,
    paddingVertical: T.Spacing.md,
    borderRightWidth: 1.5,
    borderRightColor: T.Colors.border,
  },
  countryText: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.semibold, color: T.Colors.textPrimary },
  phoneInput: {
    flex: 1, paddingHorizontal: T.Spacing.md,
    fontSize: T.FontSize.xl,
    fontWeight: T.FontWeight.semibold,
    color: T.Colors.textPrimary,
    height: 52,
    letterSpacing: 1,
  },

  // CTA
  cta: {
    backgroundColor: T.Colors.navyMid,
    borderRadius: T.Radius.lg,
    height: 52,
    alignItems: 'center', justifyContent: 'center',
    ...T.Shadow.card,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    fontSize: T.FontSize.md,
    fontWeight: T.FontWeight.black,
    color: T.Colors.textInverse,
    letterSpacing: 0.3,
  },

  // Demo hint
  demoHint: { alignItems: 'center', marginTop: T.Spacing.md, paddingVertical: T.Spacing.sm },
  demoHintText: { fontSize: T.FontSize.xs, color: T.Colors.navyMid, fontWeight: T.FontWeight.semibold },

  // Terms
  terms: {
    fontSize: T.FontSize.xs,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 18,
    paddingBottom: T.Spacing.md,
  },
  termsLink: { color: 'rgba(255,255,255,0.5)', fontWeight: T.FontWeight.semibold },

  // Rider CTA
  riderLink: {
    alignItems: 'center',
    paddingVertical: T.Spacing.md,
    paddingBottom: T.Spacing['2xl'],
  },
  riderLinkText: {
    fontSize: T.FontSize.sm,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: T.FontWeight.medium,
  },
});
