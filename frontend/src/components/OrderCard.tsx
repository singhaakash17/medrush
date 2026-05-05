import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { formatPaise } from '@/lib/money';
import type { Order } from '@/types';

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  dispatched: '#8B5CF6',
  delivered: '#10B981',
  cancelled: '#EF4444',
};

interface Props { order: Order }

export function OrderCard({ order }: Props) {
  const router = useRouter();
  const color = STATUS_COLOR[order.status] ?? '#6B7280';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/order/${order.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <Text style={styles.code}>#{order.short_code}</Text>
        <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
          <Text style={[styles.badgeText, { color }]}>{order.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.date}>{new Date(order.placed_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })}</Text>
      <Text style={styles.total}>{formatPaise(order.total_paise)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 15, fontWeight: '700', color: '#111827' },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  date: { fontSize: 13, color: '#6B7280', marginTop: 6 },
  total: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 8 },
});
