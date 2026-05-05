import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { logisticsApi } from '@/api/logistics';

const STEPS = [
  { key: 'assigned', label: 'Rider Assigned', icon: 'person-outline' },
  { key: 'picked_up', label: 'Picked Up', icon: 'bag-outline' },
  { key: 'delivered', label: 'Delivered', icon: 'checkmark-circle-outline' },
];

function stepIndex(status: string) {
  if (status === 'delivered') return 2;
  if (status === 'picked_up') return 1;
  return 0;
}

export default function TrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: assignment, isLoading } = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => logisticsApi.getAssignment(id!),
    enabled: !!id,
    refetchInterval: 15_000, // poll every 15s
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0EA5E9" /></View>;
  }

  if (!assignment) {
    return (
      <View style={styles.center}>
        <Ionicons name="navigate-circle-outline" size={64} color="#E5E7EB" />
        <Text style={styles.muted}>No rider assigned yet</Text>
      </View>
    );
  }

  const current = stepIndex(assignment.status);

  return (
    <View style={styles.screen}>
      {/* ETA */}
      <View style={styles.etaCard}>
        <Text style={styles.etaLabel}>Estimated Arrival</Text>
        <Text style={styles.etaValue}>
          {assignment.eta_seconds
            ? `${Math.ceil(assignment.eta_seconds / 60)} mins`
            : '—'}
        </Text>
        {assignment.distance_m && (
          <Text style={styles.distance}>{(assignment.distance_m / 1000).toFixed(1)} km away</Text>
        )}
      </View>

      {/* Step tracker */}
      <View style={styles.steps}>
        {STEPS.map((step, idx) => {
          const done = idx <= current;
          return (
            <View key={step.key} style={styles.step}>
              <View style={[styles.stepIcon, done && styles.stepIconDone]}>
                <Ionicons name={step.icon as any} size={20} color={done ? '#fff' : '#9CA3AF'} />
              </View>
              {idx < STEPS.length - 1 && (
                <View style={[styles.stepLine, idx < current && styles.stepLineDone]} />
              )}
              <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Rider info */}
      <View style={styles.riderCard}>
        <View style={styles.riderAvatar}>
          <Ionicons name="bicycle-outline" size={28} color="#0EA5E9" />
        </View>
        <View>
          <Text style={styles.riderLabel}>Your Rider</Text>
          <Text style={styles.riderId}>{assignment.rider_id}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
          <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 12 }}>
            {assignment.status.toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  muted: { fontSize: 16, color: '#9CA3AF' },
  etaCard: {
    backgroundColor: '#0EA5E9',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  etaLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  etaValue: { fontSize: 48, fontWeight: '800', color: '#fff', marginTop: 4 },
  distance: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  steps: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  step: { alignItems: 'center', flex: 1 },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconDone: { backgroundColor: '#0EA5E9' },
  stepLine: { position: 'absolute', top: 22, left: '60%', right: '-60%', height: 2, backgroundColor: '#E5E7EB' },
  stepLineDone: { backgroundColor: '#0EA5E9' },
  stepLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  stepLabelDone: { color: '#0EA5E9', fontWeight: '600' },
  riderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  riderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderLabel: { fontSize: 12, color: '#9CA3AF' },
  riderId: { fontSize: 15, fontWeight: '700', color: '#111827' },
  badge: { marginLeft: 'auto', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
});
