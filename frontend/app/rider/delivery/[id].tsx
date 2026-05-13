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
  Linking,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { logisticsApi } from '@/api/logistics';
import { ordersApi } from '@/api/orders';
import { T } from '@/theme';
import type { Assignment, Order } from '@/types';

type DeliveryStep = 'pickup' | 'delivering' | 'otp' | 'done';

const STEPS: { id: DeliveryStep; label: string; icon: string }[] = [
  { id: 'pickup',     label: 'Pickup',    icon: 'storefront-outline' },
  { id: 'delivering', label: 'En Route',  icon: 'navigate-outline' },
  { id: 'otp',        label: 'Verify OTP', icon: 'keypad-outline' },
  { id: 'done',       label: 'Done',      icon: 'checkmark-circle' },
];

function StepIndicator({ step }: { step: DeliveryStep }) {
  const idx = STEPS.findIndex((s) => s.id === step);
  return (
    <View style={stepStyles.row}>
      {STEPS.map((s, i) => (
        <View key={s.id} style={stepStyles.col}>
          {i < STEPS.length - 1 && (
            <View style={[stepStyles.line, i < idx && stepStyles.lineDone]} />
          )}
          <View style={[stepStyles.dot, i <= idx && stepStyles.dotActive]}>
            {i < idx ? (
              <Ionicons name="checkmark" size={14} color={T.Colors.white} />
            ) : (
              <Ionicons
                name={s.icon as any}
                size={13}
                color={i === idx ? T.Colors.white : T.Colors.textTertiary}
              />
            )}
          </View>
          <Text style={[stepStyles.label, i <= idx && stepStyles.labelActive]}>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: T.Spacing.md },
  col: { flex: 1, alignItems: 'center', position: 'relative' },
  line: {
    position: 'absolute',
    top: 14,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: T.Colors.border,
    zIndex: 0,
  },
  lineDone: { backgroundColor: T.Colors.navyMid },
  dot: {
    width: 30, height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: T.Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.Colors.white,
    marginBottom: T.Spacing.xs,
    zIndex: 1,
  },
  dotActive: { borderColor: T.Colors.navyMid, backgroundColor: T.Colors.navyMid },
  label: { fontSize: 9, color: T.Colors.textTertiary, fontWeight: T.FontWeight.semibold, textAlign: 'center' },
  labelActive: { color: T.Colors.navyMid },
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
    refetchInterval: 15_000,
  });

  const { data: order } = useQuery<Order>({
    queryKey: ['order', assignment?.order_id],
    queryFn: () => ordersApi.get(assignment!.order_id),
    enabled: !!assignment?.order_id,
  });

  const step: DeliveryStep =
    !assignment            ? 'pickup'
    : assignment.status === 'assigned'  ? 'pickup'
    : assignment.status === 'picked_up' ? 'otp'
    : assignment.status === 'delivered' ? 'done'
    : 'pickup';

  // GPS ping
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignment', id] }),
    onError: () => Alert.alert('Error', 'Could not confirm pickup. Try again.'),
  });

  const otpMutation = useMutation({
    mutationFn: () => logisticsApi.verifyOtp(id!, otp),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignment', id] });
      qc.invalidateQueries({ queryKey: ['rider-assignments'] });
    },
    onError: () => {
      setOtpError('Invalid OTP. Ask the customer to share it again.');
      setOtp('');
    },
  });

  const addr = order?.delivery_address as Record<string, string> | undefined;

  const openMaps = () => {
    if (!addr) return;
    const query = encodeURIComponent(`${addr.line1}, ${addr.city} ${addr.pincode}`);
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  };

  if (assignmentLoading || !assignment) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={T.Colors.navyMid} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Progress stepper */}
      <View style={styles.card}>
        <StepIndicator step={step} />
      </View>

      {/* Order info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order #{assignment.order_id.slice(0, 8).toUpperCase()}</Text>

        {addr && (
          <Pressable style={styles.addressBox} onPress={openMaps}>
            <View style={styles.addressHeader}>
              <Ionicons name="location" size={16} color={T.Colors.navyMid} />
              <Text style={styles.addressLabel}>Drop Address</Text>
              <Ionicons name="open-outline" size={14} color={T.Colors.textTertiary} style={{ marginLeft: 'auto' }} />
            </View>
            <Text style={styles.addressText}>{addr.line1}</Text>
            {addr.line2 ? <Text style={styles.addressText}>{addr.line2}</Text> : null}
            <Text style={styles.addressText}>{addr.city} — {addr.pincode}</Text>
          </Pressable>
        )}

        <View style={styles.metaRow}>
          {assignment.distance_m != null && (
            <View style={styles.metaChip}>
              <Ionicons name="map-outline" size={13} color={T.Colors.textSecondary} />
              <Text style={styles.metaChipText}>{(assignment.distance_m / 1000).toFixed(1)} km</Text>
            </View>
          )}
          {assignment.eta_seconds != null && (
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={13} color={T.Colors.textSecondary} />
              <Text style={styles.metaChipText}>ETA {Math.ceil(assignment.eta_seconds / 60)} min</Text>
            </View>
          )}
        </View>
      </View>

      {/* Action card */}
      {step === 'pickup' && (
        <View style={styles.card}>
          <View style={styles.actionHeader}>
            <View style={[styles.actionIcon, { backgroundColor: T.Colors.amberLight }]}>
              <Ionicons name="storefront-outline" size={22} color={T.Colors.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Confirm Pickup</Text>
              <Text style={styles.actionSub}>Pick up the order from the pharmacy and tap below.</Text>
            </View>
          </View>
          <Pressable
            style={[styles.primaryBtn, pickupMutation.isPending && styles.btnDisabled]}
            onPress={() => pickupMutation.mutate()}
            disabled={pickupMutation.isPending}
          >
            {pickupMutation.isPending ? (
              <ActivityIndicator color={T.Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={T.Colors.white} />
                <Text style={styles.primaryBtnText}>Confirm Pickup</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {step === 'delivering' && (
        <View style={styles.card}>
          <View style={styles.actionHeader}>
            <View style={[styles.actionIcon, { backgroundColor: T.Colors.navyLight }]}>
              <Ionicons name="navigate-outline" size={22} color={T.Colors.navyMid} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>En Route to Customer</Text>
              <Text style={styles.actionSub}>Navigate to the drop address. Enter OTP on arrival.</Text>
            </View>
          </View>
          <Pressable style={styles.secondaryBtn} onPress={openMaps}>
            <Ionicons name="map-outline" size={17} color={T.Colors.navyMid} />
            <Text style={styles.secondaryBtnText}>Open in Maps</Text>
          </Pressable>
        </View>
      )}

      {step === 'otp' && (
        <View style={styles.card}>
          <View style={styles.actionHeader}>
            <View style={[styles.actionIcon, { backgroundColor: T.Colors.emeraldLight }]}>
              <Ionicons name="keypad-outline" size={22} color={T.Colors.emerald} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Verify Delivery OTP</Text>
              <Text style={styles.actionSub}>Ask the customer for the 4-digit OTP shown in their app.</Text>
            </View>
          </View>
          <TextInput
            style={[styles.otpInput, otpError ? styles.otpInputError : null]}
            value={otp}
            onChangeText={(t) => {
              setOtp(t.replace(/\D/g, '').slice(0, 4));
              setOtpError('');
            }}
            keyboardType="numeric"
            maxLength={4}
            placeholder="_ _ _ _"
            placeholderTextColor={T.Colors.border}
            textAlign="center"
            returnKeyType="done"
            onSubmitEditing={() => { Keyboard.dismiss(); if (otp.length === 4) otpMutation.mutate(); }}
          />
          {otpError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={15} color={T.Colors.crimson} />
              <Text style={styles.errorText}>{otpError}</Text>
            </View>
          ) : null}
          <Pressable
            style={[styles.primaryBtn, (otp.length < 4 || otpMutation.isPending) && styles.btnDisabled]}
            onPress={() => otpMutation.mutate()}
            disabled={otp.length < 4 || otpMutation.isPending}
          >
            {otpMutation.isPending ? (
              <ActivityIndicator color={T.Colors.white} />
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={18} color={T.Colors.white} />
                <Text style={styles.primaryBtnText}>Verify & Complete Delivery</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {step === 'done' && (
        <View style={[styles.card, styles.doneCard]}>
          <View style={styles.doneIconWrap}>
            <Ionicons name="checkmark-circle" size={52} color={T.Colors.emerald} />
          </View>
          <Text style={styles.doneTitle}>Delivered!</Text>
          <Text style={styles.doneSub}>Great work. Back to tasks for your next assignment.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace('/rider/tasks')}>
            <Ionicons name="bicycle-outline" size={18} color={T.Colors.white} />
            <Text style={styles.primaryBtnText}>Back to Tasks</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.Colors.surface },
  content: { padding: T.Spacing.lg, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.xl,
    padding: T.Spacing.lg,
    marginBottom: T.Spacing.md,
    borderWidth: 1,
    borderColor: T.Colors.border,
    ...T.Shadow.card,
  },
  cardTitle: { fontSize: T.FontSize.lg, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary, marginBottom: T.Spacing.md },

  addressBox: {
    backgroundColor: T.Colors.navyLight,
    borderRadius: T.Radius.lg,
    padding: T.Spacing.md,
    marginBottom: T.Spacing.md,
  },
  addressHeader: { flexDirection: 'row', alignItems: 'center', gap: T.Spacing.xs, marginBottom: T.Spacing.sm },
  addressLabel: { fontSize: T.FontSize.xs, fontWeight: T.FontWeight.bold, color: T.Colors.navyMid },
  addressText: { fontSize: T.FontSize.sm, color: T.Colors.navy, lineHeight: 20 },

  metaRow: { flexDirection: 'row', gap: T.Spacing.sm },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.Colors.surface,
    paddingHorizontal: T.Spacing.sm, paddingVertical: 4,
    borderRadius: T.Radius.full,
  },
  metaChipText: { fontSize: T.FontSize.xs, fontWeight: T.FontWeight.medium, color: T.Colors.textSecondary },

  actionHeader: { flexDirection: 'row', gap: T.Spacing.md, alignItems: 'flex-start', marginBottom: T.Spacing.lg },
  actionIcon: { width: 44, height: 44, borderRadius: T.Radius.md, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: T.FontSize.md, fontWeight: T.FontWeight.black, color: T.Colors.textPrimary, marginBottom: 2 },
  actionSub: { fontSize: T.FontSize.sm, color: T.Colors.textSecondary, lineHeight: 18 },

  primaryBtn: {
    backgroundColor: T.Colors.navy,
    borderRadius: T.Radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: T.Spacing.sm,
    ...T.Shadow.card,
  },
  primaryBtnText: { color: T.Colors.white, fontWeight: T.FontWeight.bold, fontSize: T.FontSize.base },
  btnDisabled: { opacity: 0.4 },

  secondaryBtn: {
    backgroundColor: T.Colors.navyLight,
    borderRadius: T.Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: T.Spacing.sm,
    borderWidth: 1,
    borderColor: T.Colors.navyMid,
  },
  secondaryBtnText: { color: T.Colors.navyMid, fontWeight: T.FontWeight.bold, fontSize: T.FontSize.base },

  otpInput: {
    borderWidth: 2,
    borderColor: T.Colors.border,
    borderRadius: T.Radius.lg,
    paddingVertical: 14,
    fontSize: 32,
    fontWeight: T.FontWeight.black as any,
    color: T.Colors.navy,
    letterSpacing: 12,
    marginBottom: T.Spacing.sm,
    textAlign: 'center',
  },
  otpInputError: { borderColor: T.Colors.crimson },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: T.Spacing.md },
  errorText: { fontSize: T.FontSize.sm, color: T.Colors.crimson },

  doneCard: { alignItems: 'center', paddingVertical: T.Spacing['3xl'] },
  doneIconWrap: { marginBottom: T.Spacing.lg },
  doneTitle: { fontSize: T.FontSize['3xl'], fontWeight: T.FontWeight.black, color: T.Colors.emerald, marginBottom: T.Spacing.sm },
  doneSub: { fontSize: T.FontSize.sm, color: T.Colors.textSecondary, textAlign: 'center', marginBottom: T.Spacing['2xl'], lineHeight: 20 },
});
