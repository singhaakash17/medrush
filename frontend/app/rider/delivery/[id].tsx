import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import * as Location from 'expo-location';
import { logisticsApi } from '@/api/logistics';
import { ordersApi } from '@/api/orders';
import type { Assignment, Order } from '@/types';

type DeliveryStep = 'pickup' | 'delivering' | 'otp' | 'done';

function StepIndicator({ step }: { step: DeliveryStep }) {
  const steps: { id: DeliveryStep; label: string }[] = [
    { id: 'pickup', label: 'Pickup' },
    { id: 'delivering', label: 'En Route' },
    { id: 'otp', label: 'Verify OTP' },
    { id: 'done', label: 'Done' },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return (
    <View style={stepStyles.row}>
      {steps.map((s, i) => (
        <View key={s.id} style={{ flex: 1, alignItems: 'center' }}>
          <View style={[stepStyles.dot, i <= idx && stepStyles.dotActive]}>
            <Text style={[stepStyles.dotText, i <= idx && stepStyles.dotTextActive]}>
              {i < idx ? '✓' : i + 1}
            </Text>
          </View>
          <Text style={[stepStyles.label, i <= idx && stepStyles.labelActive]}>{s.label}</Text>
          {i < steps.length - 1 && (
            <View style={[stepStyles.line, i < idx && stepStyles.lineActive]} />
          )}
        </View>
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 12 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  dotActive: { borderColor: '#0c4a6e', backgroundColor: '#0c4a6e' },
  dotText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  dotTextActive: { color: '#fff' },
  label: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },
  labelActive: { color: '#0c4a6e' },
  line: {
    position: 'absolute',
    top: 14,
    right: -24,
    width: 48,
    height: 2,
    backgroundColor: '#e2e8f0',
  },
  lineActive: { backgroundColor: '#0c4a6e' },
});

export default function ActiveDeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  const { data: assignment, isLoading: assignmentLoading } = useQuery<Assignment>({
    queryKey: ['assignment', id],
    queryFn: () => logisticsApi.getAssignment(id!),
    enabled: !!id,
  });

  const { data: order } = useQuery<Order>({
    queryKey: ['order', assignment?.order_id],
    queryFn: () => ordersApi.get(assignment!.order_id),
    enabled: !!assignment?.order_id,
  });

  // Derive step from assignment status
  const step: DeliveryStep =
    !assignment ? 'pickup'
    : assignment.status === 'assigned' ? 'pickup'
    : assignment.status === 'picked_up' ? 'otp'
    : assignment.status === 'delivered' ? 'done'
    : 'pickup';

  // GPS ping every 30s
  useEffect(() => {
    let watchSub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      watchSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 50 },
        (loc) => {
          logisticsApi.pingLocation({
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            accuracy_m: loc.coords.accuracy ?? undefined,
            assignment_id: id,
          }).catch(() => {});
        },
      );
      locationWatchRef.current = watchSub;
    })();

    return () => { watchSub?.remove(); };
  }, [id]);

  const pickupMutation = useMutation({
    mutationFn: () => logisticsApi.updateAssignmentStatus(id!, 'picked_up'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignment', id] });
    },
  });

  const otpMutation = useMutation({
    mutationFn: () => logisticsApi.verifyOtp(id!, otp),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignment', id] });
      router.replace('/rider/tasks');
    },
    onError: () => {
      setOtpError('Invalid OTP. Ask the customer to share it again.');
    },
  });

  if (assignmentLoading || !assignment) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0c4a6e" size="large" />
      </View>
    );
  }

  const addr = order?.delivery_address as Record<string, string> | undefined;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Step indicator */}
      <View style={styles.card}>
        <StepIndicator step={step} />
      </View>

      {/* Order summary */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order #{assignment.order_id.slice(0, 8)}</Text>
        {addr && (
          <View style={styles.addressBox}>
            <Text style={styles.addressLabel}>📍 Drop Address</Text>
            <Text style={styles.addressText}>{addr.line1}</Text>
            {addr.line2 ? <Text style={styles.addressText}>{addr.line2}</Text> : null}
            <Text style={styles.addressText}>{addr.city} — {addr.pincode}</Text>
          </View>
        )}
        <View style={styles.metaRow}>
          {assignment.distance_m != null && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{(assignment.distance_m / 1000).toFixed(1)} km</Text>
            </View>
          )}
          {assignment.eta_seconds != null && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>ETA {Math.ceil(assignment.eta_seconds / 60)} min</Text>
            </View>
          )}
        </View>
      </View>

      {/* Action area */}
      {step === 'pickup' && (
        <View style={styles.card}>
          <Text style={styles.actionTitle}>Confirm Pickup</Text>
          <Text style={styles.actionSub}>Pick up the order from the pharmacy and confirm below.</Text>
          <Pressable
            style={[styles.primaryBtn, pickupMutation.isPending && styles.btnDisabled]}
            onPress={() => pickupMutation.mutate()}
            disabled={pickupMutation.isPending}
          >
            {pickupMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>✅ Confirm Pickup</Text>
            )}
          </Pressable>
        </View>
      )}

      {step === 'delivering' && (
        <View style={styles.card}>
          <Text style={styles.actionTitle}>En Route to Customer</Text>
          <Text style={styles.actionSub}>Navigate to the drop address. Enter OTP when you arrive.</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => {}}>
            <Text style={styles.secondaryBtnText}>🗺 Open in Maps</Text>
          </Pressable>
        </View>
      )}

      {step === 'otp' && (
        <View style={styles.card}>
          <Text style={styles.actionTitle}>Verify Delivery OTP</Text>
          <Text style={styles.actionSub}>Ask the customer for the 4-digit OTP shown in their app.</Text>
          <TextInput
            style={[styles.otpInput, otpError ? styles.otpInputError : null]}
            value={otp}
            onChangeText={(t) => { setOtp(t.replace(/\D/g, '').slice(0, 4)); setOtpError(''); }}
            keyboardType="numeric"
            maxLength={4}
            placeholder="Enter OTP"
            placeholderTextColor="#94a3b8"
            textAlign="center"
            returnKeyType="done"
            onSubmitEditing={() => { Keyboard.dismiss(); if (otp.length === 4) otpMutation.mutate(); }}
          />
          {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
          <Pressable
            style={[styles.primaryBtn, (otp.length < 4 || otpMutation.isPending) && styles.btnDisabled]}
            onPress={() => otpMutation.mutate()}
            disabled={otp.length < 4 || otpMutation.isPending}
          >
            {otpMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Verify & Complete</Text>
            )}
          </Pressable>
        </View>
      )}

      {step === 'done' && (
        <View style={[styles.card, styles.doneCard]}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Delivered!</Text>
          <Text style={styles.doneSub}>Great work. Back to tasks for your next assignment.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace('/rider/tasks')}>
            <Text style={styles.primaryBtnText}>Back to Tasks</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  addressBox: { backgroundColor: '#f0f9ff', borderRadius: 12, padding: 14, marginBottom: 12 },
  addressLabel: { fontSize: 11, fontWeight: '700', color: '#0369a1', marginBottom: 4 },
  addressText: { fontSize: 14, color: '#0c4a6e', lineHeight: 20 },
  metaRow: { flexDirection: 'row', gap: 8 },
  metaChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  metaChipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  actionTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  actionSub: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 16 },
  primaryBtn: {
    backgroundColor: '#0c4a6e',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.4 },
  secondaryBtn: {
    backgroundColor: '#f0f9ff',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  secondaryBtnText: { color: '#0369a1', fontWeight: '700', fontSize: 15 },
  otpInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: '800',
    color: '#0c4a6e',
    letterSpacing: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  otpInputError: { borderColor: '#ef4444' },
  errorText: { fontSize: 13, color: '#ef4444', marginBottom: 10, textAlign: 'center' },
  doneCard: { alignItems: 'center', paddingVertical: 36 },
  doneEmoji: { fontSize: 52, marginBottom: 12 },
  doneTitle: { fontSize: 24, fontWeight: '800', color: '#15803d', marginBottom: 6 },
  doneSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
});
