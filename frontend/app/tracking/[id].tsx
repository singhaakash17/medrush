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
import { T } from '@/theme';
import type { Order, OrderItem, Assignment } from '@/types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

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
        <Ionicons name="close-circle" size={20} color={T.Colors.crimson} />
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
                <Ionicons name={step.icon} size={16} color={done ? T.Colors.textInverse : T.Colors.border} />
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
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={T.Colors.navyMid} />
      </View>
    );
  }

  const isActive = !['delivered', 'cancelled'].includes(order.status);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={T.Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Order #{order.short_code}</Text>
          <Text style={styles.subtitle}>
            {order.status === 'delivered' ? '✓ Delivered' :
             order.status === 'cancelled' ? 'Cancelled' :
             `⚡ ETA: ${assignment?.eta_seconds ? `~${Math.ceil(assignment.eta_seconds / 60)} min` : '15 min'}`}
          </Text>
        </View>
      </View>

      {isActive && (
        <SlaTimer slaTargetAt={order.sla_target_at} status={order.status} />
      )}

      {riderLocation && order.status === 'dispatched' && (
        <View style={styles.liveCard}>
          <View style={styles.livePulse} />
          <Text style={styles.liveText}>Rider location updating live</Text>
          <Text style={styles.liveCoords}>
            {riderLocation.lat.toFixed(4)}, {riderLocation.lon.toFixed(4)}
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Status</Text>
        <StatusStepper currentStatus={order.status} />
      </View>

      {assignment && order.status === 'dispatched' && (
        <View style={styles.riderCard}>
          <View style={styles.riderAvatar}>
            <Ionicons name="bicycle" size={24} color={T.Colors.navyMid} />
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

      {order.status === 'dispatched' && (
        <View style={styles.otpCard}>
          <Ionicons name="key-outline" size={22} color={T.Colors.amber} />
          <View style={styles.otpInfo}>
            <Text style={styles.otpTitle}>Delivery OTP Required</Text>
            <Text style={styles.otpSub}>Share the 4-digit OTP with the rider to confirm receipt</Text>
          </View>
        </View>
      )}

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
            <Text style={[styles.summaryLabel, { color: T.Colors.emerald }]}>Discount</Text>
            <Text style={[styles.summaryValue, { color: T.Colors.emerald }]}>-{formatPaise(order.discount_paise)}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPaise(order.total_paise)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Delivery Address</Text>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={18} color={T.Colors.navyMid} />
          <View>
            <Text style={styles.addressLine}>{(order.delivery_address as any).line1}</Text>
            <Text style={styles.addressSub}>
              {(order.delivery_address as any).city}, {(order.delivery_address as any).pincode}
            </Text>
          </View>
        </View>
      </View>

      {order.status === 'delivered' && (
        <TouchableOpacity style={styles.rateBtn}>
          <Ionicons name="star-outline" size={18} color={T.Colors.amber} />
          <Text style={styles.rateBtnText}>Rate this delivery</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.Colors.surface },
  content: { padding: T.Spacing.lg, paddingBottom: 40 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: T.Spacing.md, marginBottom: T.Spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: T.Radius.sm,
    backgroundColor: T.Colors.white,
    alignItems: 'center', justifyContent: 'center',
    ...T.Shadow.card,
  },
  headerText: { flex: 1 },
  title: { fontSize: T.FontSize.lg, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  subtitle: { fontSize: T.FontSize.sm, color: T.Colors.navyMid, marginTop: 2, fontWeight: T.FontWeight.semibold },

  liveCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.Colors.emeraldLight,
    borderRadius: T.Radius.md, padding: 10, marginBottom: T.Spacing.md,
  },
  livePulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.Colors.emerald },
  liveText: { flex: 1, fontSize: T.FontSize.xs, color: T.Colors.emeraldDark, fontWeight: T.FontWeight.semibold },
  liveCoords: { fontSize: T.FontSize['2xs'], color: T.Colors.textTertiary },

  card: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.lg,
    padding: T.Spacing.lg,
    marginBottom: T.Spacing.md,
    ...T.Shadow.card,
  },
  cardTitle: { fontSize: T.FontSize.md, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary, marginBottom: T.Spacing.md },

  stepper: {},
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  stepLeft: { alignItems: 'center', width: 32, marginRight: T.Spacing.md },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.Colors.borderLight, alignItems: 'center', justifyContent: 'center',
  },
  stepCircleDone: { backgroundColor: T.Colors.navyMid },
  stepCircleActive: { backgroundColor: T.Colors.navy },
  stepLine: { width: 2, minHeight: 20, backgroundColor: T.Colors.border, marginVertical: 4 },
  stepLineDone: { backgroundColor: T.Colors.navyMid },
  stepLabel: { flex: 1, fontSize: T.FontSize.sm, color: T.Colors.textTertiary, paddingVertical: 6 },
  stepLabelDone: { color: T.Colors.textSecondary },
  stepLabelActive: { color: T.Colors.textPrimary, fontWeight: T.FontWeight.bold },

  cancelledBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.Colors.crimsonLight, borderRadius: T.Radius.md, padding: T.Spacing.md,
  },
  cancelledText: { fontSize: T.FontSize.md, fontWeight: T.FontWeight.semibold, color: '#991B1B' },

  riderCard: {
    flexDirection: 'row', alignItems: 'center', gap: T.Spacing.md,
    backgroundColor: T.Colors.white, borderRadius: T.Radius.lg, padding: T.Spacing.md, marginBottom: T.Spacing.md,
    borderWidth: 1, borderColor: T.Colors.navyLight,
    ...T.Shadow.card,
  },
  riderAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: T.Colors.navyLight, alignItems: 'center', justifyContent: 'center',
  },
  riderInfo: { flex: 1 },
  riderName: { fontSize: T.FontSize.md, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  riderEta: { fontSize: T.FontSize.sm, color: T.Colors.navyMid, marginTop: 2, fontWeight: T.FontWeight.semibold },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.Colors.emerald },

  otpCard: {
    flexDirection: 'row', alignItems: 'center', gap: T.Spacing.md,
    backgroundColor: T.Colors.amberLight, borderRadius: T.Radius.md, padding: T.Spacing.md, marginBottom: T.Spacing.md,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  otpInfo: { flex: 1 },
  otpTitle: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.bold, color: '#92400E' },
  otpSub: { fontSize: T.FontSize.xs, color: '#78350F', marginTop: 2 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  qtyBadge: {
    backgroundColor: T.Colors.navyLight, borderRadius: T.Radius.sm,
    paddingHorizontal: 6, paddingVertical: 2, minWidth: 28, alignItems: 'center',
  },
  qtyText: { fontSize: T.FontSize.xs, fontWeight: T.FontWeight.bold, color: T.Colors.navyMid },
  itemName: { flex: 1, fontSize: T.FontSize.sm, color: T.Colors.textSecondary },
  rxTag: { backgroundColor: T.Colors.amberLight, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  rxTagText: { fontSize: 10, fontWeight: T.FontWeight.black, color: '#92400E' },
  itemPrice: { fontSize: T.FontSize.sm, fontWeight: T.FontWeight.semibold, color: T.Colors.textPrimary },

  divider: { height: 1, backgroundColor: T.Colors.borderLight, marginVertical: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: T.FontSize.sm, color: T.Colors.textTertiary },
  summaryValue: { fontSize: T.FontSize.sm, color: T.Colors.textSecondary },
  totalRow: { borderTopWidth: 1, borderTopColor: T.Colors.border, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: T.FontSize.md, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  totalValue: { fontSize: T.FontSize.md, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },

  addressRow: { flexDirection: 'row', gap: 10 },
  addressLine: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.semibold, color: T.Colors.textSecondary },
  addressSub: { fontSize: T.FontSize.sm, color: T.Colors.textTertiary, marginTop: 2 },

  rateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: T.Colors.amberLight, borderRadius: T.Radius.md, padding: T.Spacing.md,
    borderWidth: 1, borderColor: '#FDE68A', marginBottom: T.Spacing.md,
  },
  rateBtnText: { fontSize: T.FontSize.md, fontWeight: T.FontWeight.semibold, color: '#92400E' },
});
