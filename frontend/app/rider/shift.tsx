import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { logisticsApi } from '@/api/logistics';
import { T } from '@/theme';
import type { RiderShift } from '@/types';

function elapsed(startedAt: string) {
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function ShiftScreen() {
  const qc = useQueryClient();
  const [tick, setTick] = useState(0);

  const { data: shift, isLoading } = useQuery<RiderShift | null>({
    queryKey: ['active-shift'],
    queryFn: logisticsApi.getActiveShift,
    refetchInterval: 60_000,
  });

  // Tick every 30s to update elapsed time
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const startMutation = useMutation({
    mutationFn: logisticsApi.startShift,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-shift'] }),
    onError: () => Alert.alert('Error', 'Could not start shift. Try again.'),
  });

  const endMutation = useMutation({
    mutationFn: logisticsApi.endShift,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-shift'] }),
    onError: () => Alert.alert('Error', 'Complete all active deliveries before ending shift.'),
  });

  const isOnShift = !!shift && !shift.ended_at;
  const isNightShift = new Date().getHours() >= 22 || new Date().getHours() < 6;

  const handleToggle = () => {
    if (isOnShift) {
      Alert.alert('End Shift', 'Are you sure you want to end your shift?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Shift', style: 'destructive', onPress: () => endMutation.mutate() },
      ]);
    } else {
      startMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={T.Colors.navyMid} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Status hero card */}
      <View style={[styles.heroCard, isOnShift ? styles.heroActive : styles.heroInactive]}>
        <View style={styles.heroIconWrap}>
          <Ionicons
            name={isOnShift ? 'radio-button-on' : 'radio-button-off'}
            size={32}
            color={isOnShift ? T.Colors.emerald : T.Colors.textTertiary}
          />
        </View>
        <Text style={[styles.heroTitle, isOnShift && styles.heroTitleActive]}>
          {isOnShift ? 'On Shift' : 'Off Duty'}
        </Text>
        {isOnShift && shift && (
          <Text style={styles.heroSub}>Active for {elapsed(shift.started_at)}</Text>
        )}
        {isNightShift && isOnShift && (
          <View style={styles.nightBadge}>
            <Ionicons name="moon-outline" size={13} color={T.Colors.amberLight} />
            <Text style={styles.nightText}>Night Shift</Text>
          </View>
        )}
      </View>

      {/* Stats (when on shift) */}
      {isOnShift && shift && (
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: T.Colors.navyMid }]}>{shift.orders_completed}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: T.Colors.emerald }]}>
              ₹{(shift.earnings_paise / 100).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statCol}>
            <Text style={[styles.statValue, { color: T.Colors.navy }]}>{elapsed(shift.started_at)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>
      )}

      {/* Toggle */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleLeft}>
          <Text style={styles.toggleTitle}>{isOnShift ? 'Go Offline' : 'Go Online'}</Text>
          <Text style={styles.toggleSub}>
            {isOnShift
              ? 'Stop receiving new delivery assignments'
              : 'Start receiving delivery assignments'}
          </Text>
        </View>
        <Switch
          value={isOnShift}
          onValueChange={handleToggle}
          trackColor={{ false: T.Colors.border, true: T.Colors.navyMid }}
          thumbColor={T.Colors.white}
          disabled={startMutation.isPending || endMutation.isPending}
        />
      </View>

      {/* View assignments */}
      {isOnShift && (
        <Pressable style={styles.assignmentsBtn} onPress={() => router.push('/rider/tasks')}>
          <Ionicons name="bicycle-outline" size={18} color={T.Colors.white} />
          <Text style={styles.assignmentsBtnText}>View Assignments</Text>
          <Ionicons name="chevron-forward" size={16} color={T.Colors.white} style={{ marginLeft: 'auto' }} />
        </Pressable>
      )}

      {/* Safety reminder */}
      {isNightShift && isOnShift && (
        <View style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={T.Colors.amber} />
            <Text style={styles.safetyTitle}>Night Safety Reminder</Text>
          </View>
          <Text style={styles.safetyText}>
            Share your live location with your emergency contact. Check in every 2 hours and stay safe.
          </Text>
        </View>
      )}

      {/* Earnings shortcut */}
      <Pressable style={styles.earningsLink} onPress={() => router.push('/rider/earnings')}>
        <Ionicons name="wallet-outline" size={18} color={T.Colors.navyMid} />
        <Text style={styles.earningsLinkText}>View Earnings & Payouts</Text>
        <Ionicons name="chevron-forward" size={16} color={T.Colors.textTertiary} style={{ marginLeft: 'auto' }} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.Colors.surface },
  content: { padding: T.Spacing.lg, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  heroCard: {
    borderRadius: T.Radius.xl,
    padding: T.Spacing['2xl'],
    alignItems: 'center',
    marginBottom: T.Spacing.md,
  },
  heroActive: { backgroundColor: T.Colors.navy },
  heroInactive: { backgroundColor: T.Colors.white, borderWidth: 1, borderColor: T.Colors.border, ...T.Shadow.card },
  heroIconWrap: {
    width: 64, height: 64, borderRadius: T.Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: T.Spacing.lg,
  },
  heroTitle: { fontSize: T.FontSize['3xl'], fontWeight: T.FontWeight.black, color: T.Colors.textTertiary },
  heroTitleActive: { color: T.Colors.white },
  heroSub: { fontSize: T.FontSize.sm, color: 'rgba(255,255,255,0.65)', marginTop: T.Spacing.xs },
  nightBadge: {
    flexDirection: 'row', alignItems: 'center', gap: T.Spacing.xs,
    marginTop: T.Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: T.Spacing.md, paddingVertical: T.Spacing.xs,
    borderRadius: T.Radius.full,
  },
  nightText: { color: T.Colors.white, fontSize: T.FontSize.sm, fontWeight: T.FontWeight.semibold },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.xl,
    borderWidth: 1, borderColor: T.Colors.border,
    marginBottom: T.Spacing.md,
    overflow: 'hidden',
    ...T.Shadow.card,
  },
  statCol: { flex: 1, alignItems: 'center', paddingVertical: T.Spacing.lg },
  statDivider: { width: 1, backgroundColor: T.Colors.border },
  statValue: { fontSize: T.FontSize['2xl'], fontWeight: T.FontWeight.black },
  statLabel: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary, marginTop: 2, fontWeight: T.FontWeight.medium },

  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.xl,
    borderWidth: 1, borderColor: T.Colors.border,
    paddingHorizontal: T.Spacing.lg, paddingVertical: T.Spacing.lg,
    marginBottom: T.Spacing.md,
    ...T.Shadow.card,
  },
  toggleLeft: { flex: 1, marginRight: T.Spacing.lg },
  toggleTitle: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  toggleSub: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary, marginTop: 2 },

  assignmentsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: T.Spacing.sm,
    backgroundColor: T.Colors.navyMid,
    borderRadius: T.Radius.lg,
    paddingVertical: T.Spacing.md,
    paddingHorizontal: T.Spacing.lg,
    marginBottom: T.Spacing.md,
    ...T.Shadow.card,
  },
  assignmentsBtnText: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.bold, color: T.Colors.white },

  safetyCard: {
    backgroundColor: T.Colors.amberLight,
    borderRadius: T.Radius.lg,
    padding: T.Spacing.lg,
    borderWidth: 1, borderColor: T.Colors.amber,
    marginBottom: T.Spacing.md,
  },
  safetyHeader: { flexDirection: 'row', alignItems: 'center', gap: T.Spacing.sm, marginBottom: T.Spacing.sm },
  safetyTitle: { fontWeight: T.FontWeight.bold, color: '#92400e', fontSize: T.FontSize.sm },
  safetyText: { fontSize: T.FontSize.sm, color: '#78350f', lineHeight: 18 },

  earningsLink: {
    flexDirection: 'row', alignItems: 'center', gap: T.Spacing.md,
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.lg,
    paddingVertical: T.Spacing.md,
    paddingHorizontal: T.Spacing.lg,
    borderWidth: 1, borderColor: T.Colors.border,
    ...T.Shadow.card,
  },
  earningsLinkText: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.medium, color: T.Colors.navyMid },
});
