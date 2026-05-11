import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { logisticsApi } from '@/api/logistics';
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

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const startMutation = useMutation({
    mutationFn: logisticsApi.startShift,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-shift'] }),
  });

  const endMutation = useMutation({
    mutationFn: logisticsApi.endShift,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-shift'] }),
    onError: () => Alert.alert('Error', 'Failed to end shift. Complete all active deliveries first.'),
  });

  const isOnShift = !!shift && !shift.ended_at;
  const isNightShift = shift
    ? new Date(shift.started_at).getHours() >= 22 || new Date(shift.started_at).getHours() < 6
    : new Date().getHours() >= 22 || new Date().getHours() < 6;

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
        <ActivityIndicator color="#0c4a6e" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header status */}
      <View style={[styles.statusCard, isOnShift ? styles.activeCard : styles.inactiveCard]}>
        <Text style={styles.statusEmoji}>{isOnShift ? '🟢' : '⚪'}</Text>
        <Text style={styles.statusTitle}>{isOnShift ? 'On Shift' : 'Off Duty'}</Text>
        {isOnShift && shift && (
          <Text style={styles.statusSub}>Active for {elapsed(shift.started_at)}</Text>
        )}
        {isNightShift && isOnShift && (
          <View style={styles.nightBadge}>
            <Text style={styles.nightText}>🌙 Night Shift</Text>
          </View>
        )}
      </View>

      {/* Shift stats (if active) */}
      {isOnShift && shift && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{shift.orders_completed}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMid]}>
            <Text style={[styles.statValue, { color: '#10b981' }]}>
              ₹{(shift.earnings_paise / 100).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{elapsed(shift.started_at)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>
      )}

      {/* Toggle */}
      <View style={styles.toggleSection}>
        <Text style={styles.toggleLabel}>{isOnShift ? 'Go Offline' : 'Go Online'}</Text>
        <Switch
          value={isOnShift}
          onValueChange={handleToggle}
          trackColor={{ false: '#e2e8f0', true: '#0c4a6e' }}
          thumbColor="#fff"
          disabled={startMutation.isPending || endMutation.isPending}
        />
      </View>

      {/* Navigate to tasks */}
      {isOnShift && (
        <Pressable
          style={styles.tasksBtn}
          onPress={() => router.push('/rider/tasks')}
        >
          <Text style={styles.tasksBtnText}>View Assignments →</Text>
        </Pressable>
      )}

      {/* Safety check-in reminder */}
      {isOnShift && isNightShift && (
        <View style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>🛡️ Night Safety Reminder</Text>
          <Text style={styles.safetyText}>
            Share your live location with emergency contact. Check in every 2 hours.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  activeCard: { backgroundColor: '#0c4a6e' },
  inactiveCard: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  statusEmoji: { fontSize: 36, marginBottom: 8 },
  statusTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statusSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  nightBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  nightText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e2e8f0' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0c4a6e' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '500' },
  toggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 12,
  },
  toggleLabel: { fontSize: 16, fontWeight: '600', color: '#334155' },
  tasksBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  tasksBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  safetyCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  safetyTitle: { fontWeight: '700', color: '#92400e', marginBottom: 4 },
  safetyText: { fontSize: 13, color: '#78350f', lineHeight: 18 },
});
