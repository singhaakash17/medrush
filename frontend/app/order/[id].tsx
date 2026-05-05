import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '@/api/orders';
import { formatPaise } from '@/lib/money';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
    enabled: !!id,
  });

  const { data: items } = useQuery({
    queryKey: ['order-items', id],
    queryFn: () => ordersApi.getItems(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0EA5E9" /></View>;
  }

  if (!order) {
    return <View style={styles.center}><Text style={styles.muted}>Order not found</Text></View>;
  }

  const isActive = ['confirmed', 'dispatched'].includes(order.status);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Status */}
      <View style={styles.statusCard}>
        <Text style={styles.code}>Order #{order.short_code}</Text>
        <Text style={styles.status}>{order.status.toUpperCase()}</Text>
        <Text style={styles.date}>
          Placed {new Date(order.placed_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </Text>
        {isActive && (
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => router.push(`/tracking/${order.id}`)}
          >
            <Ionicons name="navigate-outline" size={16} color="#fff" />
            <Text style={styles.trackBtnText}>Track Order</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Items */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items Ordered</Text>
        {items?.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.medicine_name}</Text>
              <Text style={styles.itemQty}>Qty: {item.qty}</Text>
            </View>
            <Text style={styles.itemTotal}>{formatPaise(item.total_paise)}</Text>
          </View>
        ))}
      </View>

      {/* Bill summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bill Summary</Text>
        <BillRow label="Subtotal" value={formatPaise(order.subtotal_paise)} />
        {order.discount_paise > 0 && (
          <BillRow label="Discount" value={`-${formatPaise(order.discount_paise)}`} isGreen />
        )}
        <BillRow label="Delivery Fee" value={formatPaise(order.delivery_fee_paise)} />
        <BillRow label="Platform Fee" value={formatPaise(order.platform_fee_paise)} />
        <BillRow label="Tax" value={formatPaise(order.tax_paise)} />
        <View style={styles.divider} />
        <BillRow label="Total Paid" value={formatPaise(order.total_paise)} isBold />
      </View>

      {/* Delivery address */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Delivery Address</Text>
        {order.delivery_address && (
          <Text style={styles.address}>
            {String((order.delivery_address as any).line1 ?? '')}
            {(order.delivery_address as any).line2 ? `\n${(order.delivery_address as any).line2}` : ''}
            {`\n${(order.delivery_address as any).city ?? ''}, ${(order.delivery_address as any).pincode ?? ''}`}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function BillRow({ label, value, isBold, isGreen }: {
  label: string; value: string; isBold?: boolean; isGreen?: boolean;
}) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, isBold && styles.bold]}>{label}</Text>
      <Text style={[styles.billValue, isBold && styles.bold, isGreen && styles.green]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  muted: { color: '#6B7280', fontSize: 16 },
  statusCard: {
    backgroundColor: '#0EA5E9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  },
  code: { fontSize: 18, fontWeight: '800', color: '#fff' },
  status: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '600' },
  date: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  trackBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  itemQty: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  billLabel: { fontSize: 14, color: '#6B7280' },
  billValue: { fontSize: 14, color: '#111827' },
  bold: { fontWeight: '700', color: '#111827' },
  green: { color: '#10B981' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  address: { fontSize: 14, color: '#374151', lineHeight: 22 },
});
