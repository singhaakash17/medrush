import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  slaTargetAt: string;
  status: string;
}

export function SlaTimer({ slaTargetAt, status }: Props) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const target = new Date(slaTargetAt).getTime();
    const tick = () => setRemaining(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [slaTargetAt]);

  if (['delivered', 'cancelled'].includes(status)) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining < 180; // < 3 min remaining → red
  const isBreach = remaining === 0;

  const label: Record<string, string> = {
    pending: 'Awaiting pharmacy confirmation',
    confirmed: 'Pharmacy confirmed · packing',
    packed: 'Ready for pickup',
    dispatched: 'Rider on the way',
  };

  return (
    <View style={[styles.container, isUrgent && styles.urgentContainer]}>
      <Ionicons
        name={isBreach ? 'warning-outline' : 'time-outline'}
        size={16}
        color={isBreach ? '#EF4444' : isUrgent ? '#F59E0B' : '#0EA5E9'}
      />
      <Text style={[styles.status, isUrgent && styles.urgentText]}>
        {label[status] ?? status}
      </Text>
      <View style={[styles.badge, isUrgent && styles.urgentBadge]}>
        <Text style={[styles.time, isUrgent && styles.urgentTimeText]}>
          {isBreach ? 'SLA Breach' : `${minutes}:${String(seconds).padStart(2, '0')}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', borderRadius: 8, padding: 8,
    marginBottom: 6,
  },
  urgentContainer: { backgroundColor: '#FEF3C7' },
  status: { flex: 1, fontSize: 12, color: '#374151' },
  urgentText: { color: '#92400E' },
  badge: {
    backgroundColor: '#DBEAFE', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  urgentBadge: { backgroundColor: '#FDE68A' },
  time: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  urgentTimeText: { color: '#92400E' },
});
