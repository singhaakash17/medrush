import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, Alert, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { T } from '@/theme';
import { apiClient } from '@/api/client';

export default function RiderLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const clean = phone.trim().replace(/\s/g, '');
    if (!/^[6-9]\d{9}$/.test(clean)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit mobile number.');
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
        {/* Back */}
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={s.backText}>Customer Login</Text>
        </TouchableOpacity>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.logoMark}>
            <Ionicons name="bicycle" size={36} color={T.Colors.white} />
          </View>
          <Text style={s.brandName}>MedRush Partner</Text>
          <Text style={s.tagline}>Delivery Partner Login</Text>

          <View style={s.pills}>
            {['🛵 Flexible hours', '💰 Daily earnings', '📍 Indiranagar · Koramangala'].map((p) => (
              <View key={p} style={s.pill}>
                <Text style={s.pillText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Form */}
        <View style={s.card}>
          <Text style={s.formTitle}>Enter your mobile number</Text>
          <Text style={s.formSub}>We'll send a 6-digit OTP to verify you</Text>

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
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[s.cta, loading && s.ctaDisabled]}
            onPress={handleSendOtp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={T.Colors.white} />
            ) : (
              <Text style={s.ctaText}>Send OTP →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setPhone('9999999999')} style={s.demoHint}>
            <Text style={s.demoHintText}>Use demo rider: 9999999999</Text>
          </TouchableOpacity>
        </View>

        {/* Info strip */}
        <View style={s.infoStrip}>
          {[
            { icon: 'shield-checkmark-outline', text: 'Background verified' },
            { icon: 'wallet-outline',            text: 'Weekly payouts' },
            { icon: 'headset-outline',           text: '24/7 support' },
          ].map((item) => (
            <View key={item.icon} style={s.infoItem}>
              <Ionicons name={item.icon as any} size={18} color="rgba(255,255,255,0.6)" />
              <Text style={s.infoText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: '#0f2942',   // darker navy for rider
    padding: T.Spacing.xl,
    justifyContent: 'center',
  },

  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.Spacing.xs,
    marginBottom: T.Spacing.lg,
  },
  backText: { fontSize: T.FontSize.sm, color: 'rgba(255,255,255,0.6)', fontWeight: T.FontWeight.medium },

  hero: { alignItems: 'center', paddingVertical: T.Spacing['2xl'] },
  logoMark: {
    width: 80, height: 80,
    borderRadius: T.Radius.xl,
    backgroundColor: T.Colors.navyMid,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: T.Spacing.lg,
    ...T.Shadow.cardLg,
  },
  brandName: {
    fontSize: T.FontSize['3xl'],
    fontWeight: T.FontWeight.black,
    color: T.Colors.white,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: T.FontSize.base,
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

  card: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius['2xl'],
    padding: T.Spacing['2xl'],
    marginBottom: T.Spacing.xl,
    ...T.Shadow.cardLg,
  },
  formTitle: {
    fontSize: T.FontSize.xl, fontWeight: T.FontWeight.black,
    color: T.Colors.textPrimary, letterSpacing: -0.5,
  },
  formSub: {
    fontSize: T.FontSize.sm, color: T.Colors.textTertiary,
    marginTop: 4, marginBottom: T.Spacing.xl,
  },

  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: T.Colors.border,
    borderRadius: T.Radius.lg, marginBottom: T.Spacing.lg,
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: T.Colors.surface,
    paddingHorizontal: T.Spacing.md, paddingVertical: T.Spacing.md,
    borderRightWidth: 1.5, borderRightColor: T.Colors.border,
  },
  countryText: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.semibold, color: T.Colors.textPrimary },
  phoneInput: {
    flex: 1, paddingHorizontal: T.Spacing.md,
    fontSize: T.FontSize.xl, fontWeight: T.FontWeight.semibold,
    color: T.Colors.textPrimary, height: 52, letterSpacing: 1,
  },

  cta: {
    backgroundColor: T.Colors.navy,
    borderRadius: T.Radius.lg, height: 52,
    alignItems: 'center', justifyContent: 'center',
    ...T.Shadow.card,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    fontSize: T.FontSize.md, fontWeight: T.FontWeight.black,
    color: T.Colors.white, letterSpacing: 0.3,
  },

  demoHint: { alignItems: 'center', marginTop: T.Spacing.md, paddingVertical: T.Spacing.sm },
  demoHintText: { fontSize: T.FontSize.xs, color: T.Colors.navyMid, fontWeight: T.FontWeight.semibold },

  infoStrip: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: T.Spacing.lg,
  },
  infoItem: { alignItems: 'center', gap: T.Spacing.sm },
  infoText: { fontSize: T.FontSize.xs, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
});
