import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/api/orders';
import { logisticsApi } from '@/api/logistics';
import { SlaTimer } from '@/components/SlaTimer';
import { formatPaise } from '@/lib/money';
import type { Order, OrderItem, Assignment } from '@/types';
import { useCartStore } from '@/store/cart';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

// Status steps for the tracking display
const STATUS_STEPS = [
  { key: 'pending',    label: 'Order Placed',       icon: 'receipt-outline' as const },
  { key: 'confirmed',  label: 'Pharmacy Confirmed',  icon: 'storefront-outline' as const },
  { key: 'packed',     label: 'Packed & Ready',      icon: 'cube-outline' as const },
  { key: 'dispatched', label: 'Rider Picked Up',     icon: 'bicycle-outline' as const },
  { key: 'delivered',  label: 'Delivered',           icon: 'checkmark-circle-outline' as const },
];

function StatusStepper({ currentStatus }: { currentStatus: string }) {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === currentStatus);
  if (currentStatus === 'cancelled') {
    return (
      <View style={styles.cancelledBanner}>
        <Ionicons name="close-circle" size={20} color="#EF4444" />
        <Text style={styles.cancelledText}>Order Cancelled</Text>
      </View>
    );
  }
  return (
    <View style={styles.stepper}>
      {STATUS_STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={styles.stepLeft}>
              <View style={[styles.stepCircle, done && styles.stepCircleDone, active && styles.stepCircleActive]}>
                <Ionicons name={step.icon} size={16} color={done ? '#fff' : '#D1D5DB'} />
              </View>
              {idx < STATUS_STEPS.length - 1 && (
                <View style={[styles.stepLine, done && styles.stepLineDone]} />
              )}
            </View>
            <Text style={[styles.stepLabel, done && styles.stepLabelDone, active && styles.stepLabelActive]}>
              {step.label}{active ? ' ···' : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function TrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lon: number } | null>(null);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!).catch(() => null as any),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  const { data: items } = useQuery<OrderItem[]>({
    queryKey: ['order-items', id],
    queryFn: () => ordersApi.getItems(id!).catch(() => []),
    enabled: !!id,
  });

  const { data: assignment } = useQuery<Assignment | null>({
    queryKey: ['assignment', id],
    queryFn: () => logisticsApi.getAssignment(id!).catch(() => null),
    enabled: !!order && ['dispatched', 'delivered'].includes(order.status),
  });

  // Real-time WebSocket
  useEffect(() => {
    if (!id) return;
    const ws = new WebSocket(`${WS_BASE}/ws/orders/${id}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'status_update') {
          queryClient.invalidateQueries({ queryKey: ['order', id] });
        }
        if (msg.type === 'rider_location') {
          setRiderLocation({ lat: msg.data.lat, lon: msg.data.lon });
        }
        if (msg.type === 'rider_assigned') {
          queryClient.invalidateQueries({ queryKey: ['assignment', id] });
        }
      } catch (_) {}
    };

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping');
    }, 25_000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [id]);


  if (isLoading || !order) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#0EA5E9" /></View>;
  }

  const isActive = !['delivered', 'cancelled'].includes(order.status);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0C4A6E" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Track Order #{order.short_code}</Text>
          <Text style={styles.subtitle}>
            {order.status === 'delivered' ? '✓ Delivered' :
             order.status === 'cancelled' ? 'Cancelled' :
             `ETA: ${assignment?.eta_seconds ? `~${Math.ceil(assignment.eta_seconds / 60)} min` : '15 min'}`}
          </Text>
        </View>
      </View>

      {/* SLA Timer */}
      {isActive && (
        <SlaTimer slaTargetAt={order.sla_target_at} status={order.status} />
      )}

      {/* Rider live indicator */}
      {riderLocation && order.status === 'dispatched' && (
        <View style={styles.liveCard}>
          <View style={styles.livePulse} />
          <Text style={styles.liveText}>Rider location updating live</Text>
          <Text style={styles.liveCoords}>
            {riderLocation.lat.toFixed(4)}, {riderLocation.lon.toFixed(4)}
          </Text>
        </View>
      )}

      {/* Status stepper */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Status</Text>
        <StatusStepper currentStatus={order.status} />
      </View>

      {/* Rider card when dispatched */}
      {assignment && order.status === 'dispatched' && (
        <View style={styles.riderCard}>
          <View style={styles.riderAvatar}>
            <Ionicons name="bicycle" size={24} color="#0EA5E9" />
          </View>
          <View style={styles.riderInfo}>
            <Text style={styles.riderName}>Rider is on the way</Text>
            <Text style={styles.riderEta}>
              {assignment.eta_seconds
                ? `~${Math.ceil(assignment.eta_seconds / 60)} min to reach you`
                : 'Calculating ETA…'}
            </Text>
          </View>
          <View style={styles.liveDot} />
        </View>
      )}

      {/* OTP notice */}
      {order.status === 'dispatched' && (
        <View style={styles.otpCard}>
          <Ionicons name="key-outline" size={22} color="#F59E0B" />
          <View style={styles.otpInfo}>
            <Text style={styles.otpTitle}>Delivery OTP Required</Text>
            <Text style={styles.otpSub}>Share the 4-digit OTP with the rider to confirm receipt</Text>
          </View>
        </View>
      )}

      {/* Order items */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items Ordered</Text>
        {(items ?? []).map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.qtyBadge}><Text style={styles.qtyText}>{item.qty}×</Text></View>
            <Text style={styles.itemName} numberOfLines={1}>{item.medicine_name}</Text>
            {item.is_rx_item && <View style={styles.rxTag}><Text style={styles.rxTagText}>Rx</Text></View>}
            <Text style={styles.itemPrice}>{formatPaise(item.total_paise)}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        {[
          ['Subtotal', order.subtotal_paise],
          ['Delivery', order.delivery_fee_paise],
          ['Platform fee', order.platform_fee_paise],
          ['GST', order.tax_paise],
        ].map(([label, val]) => (
          <View key={label as string} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={styles.summaryValue}>{formatPaise(val as number)}</Text>
          </View>
        ))}
        {order.discount_paise > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Discount</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>-{formatPaise(order.discount_paise)}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPaise(order.total_paise)}</Text>
        </View>
      </View>

      {/* Delivery address */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Delivery Address</Text>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={18} color="#0EA5E9" />
          <View>
            <Text style={styles.addressLine}>{(order.delivery_address as any).line1}</Text>
            <Text style={styles.addressSub}>
              {(order.delivery_address as any).city}, {(order.delivery_address as any).pincode}
            </Text>
          </View>
        </View>
      </View>

      {/* Rate button */}
      {order.status === 'delivered' && (
        <TouchableOpacity style={styles.rateBtn}>
          <Ionicons name="star-outline" size={18} color="#F59E0B" />
          <Text style={styles.rateBtnText}>Rate this delivery</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0F9FF' },
  content: { padding: 16, paddingBottom: 40 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: '#0C4A6E' },
  subtitle: { fontSize: 13, color: '#0EA5E9', marginTop: 2 },
  liveCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ECFDF5', borderRadius: 10, padding: 10, marginBottom: 12,
  },
  livePulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  liveText: { flex: 1, fontSize: 12, color: '#065F46', fontWeight: '600' },
  liveCoords: { fontSize: 11, color: '#6B7280' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0C4A6E', marginBottom: 14 },
  stepper: {},
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  stepLeft: { alignItems: 'center', width: 32, marginRight: 12 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  stepCircleDone: { backgroundColor: '#0EA5E9' },
  stepCircleActive: { backgroundColor: '#0C4A6E' },
  stepLine: { width: 2, minHeight: 20, backgroundColor: '#E5E7EB', marginVertical: 4 },
  stepLineDone: { backgroundColor: '#0EA5E9' },
  stepLabel: { flex: 1, fontSize: 13, color: '#9CA3AF', paddingVertical: 6 },
  stepLabelDone: { color: '#374151' },
  stepLabelActive: { color: '#0C4A6E', fontWeight: '700' },
  cancelledBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
  },
  cancelledText: { fontSize: 15, fontWeight: '600', color: '#991B1B' },
  riderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#BAE6FD',
  },
  riderAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 15, fontWeight: '700', color: '#0C4A6E' },
  riderEta: { fontSize: 13, color: '#0EA5E9', marginTop: 2 },
  liveDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981',
  },
  otpCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  otpInfo: { flex: 1 },
  otpTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  otpSub: { fontSize: 12, color: '#78350F', marginTop: 2 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  qtyBadge: {
    backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 6,
    paddingVertical: 2, minWidth: 28, alignItems: 'center',
  },
  qtyText: { fontSize: 12, fontWeight: '700', color: '#0EA5E9' },
  itemName: { flex: 1, fontSize: 13, color: '#374151' },
  rxTag: { backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  rxTagText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  itemPrice: { fontSize: 13, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 13, color: '#374151' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#0C4A6E' },
  totalValue: { fontSize: 15, fontWeight: '700', color: '#0C4A6E' },
  addressRow: { flexDirection: 'row', gap: 10 },
  addressLine: { fontSize: 14, fontWeight: '600', color: '#374151' },
  addressSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FDE68A', marginBottom: 12,
  },
  rateBtnText: { fontSize: 15, fontWeight: '600', color: '#92400E' },
});
