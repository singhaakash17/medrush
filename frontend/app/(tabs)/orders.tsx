import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '@/api/orders';
import type { Order } from '@/types';
import { T } from '@/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

type OrderStatus = 'pending' | 'confirmed' | 'packed' | 'dispatched' | 'delivered' | 'cancelled';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; icon: string }
> = {
  delivered: {
    label: 'Delivered',
    bg: T.Colors.emeraldLight,
    text: T.Colors.emeraldDark,
    icon: 'checkmark-circle',
  },
  dispatched: {
    label: 'In Transit',
    bg: T.Colors.navyLight,
    text: T.Colors.navyMid,
    icon: 'bicycle',
  },
  pending: {
    label: 'Pending',
    bg: T.Colors.amberLight,
    text: '#92400E',
    icon: 'time',
  },
  confirmed: {
    label: 'Confirmed',
    bg: '#EDE9FE',
    text: '#5B21B6',
    icon: 'checkmark-done',
  },
  packed: {
    label: 'Packed',
    bg: '#F0FDF4',
    text: '#166534',
    icon: 'cube',
  },
  cancelled: {
    label: 'Cancelled',
    bg: T.Colors.crimsonLight,
    text: T.Colors.crimson,
    icon: 'close-circle',
  },
};

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function formatDate(placed_at: string): string {
  return new Date(placed_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(placed_at: string): string {
  return new Date(placed_at).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
}

/** Safely map any string status to our known OrderStatus enum. */
function toOrderStatus(raw: string): OrderStatus {
  return (raw in STATUS_CONFIG ? raw : 'pending') as OrderStatus;
}

// ─── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const status = toOrderStatus(order.status);
  const config = STATUS_CONFIG[status];

  const handleTrack = () => {
    Alert.alert(
      'Track Order',
      `Order ${order.short_code} is currently ${config.label.toLowerCase()}.`,
      [{ text: 'OK' }],
    );
  };

  return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderId}>{order.short_code}</Text>
          <Text style={styles.orderDate}>
            {formatDate(order.placed_at)} · {formatTime(order.placed_at)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon as any} size={13} color={config.text} />
          <Text style={[styles.statusText, { color: config.text }]}>{config.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Pharmacy */}
      <View style={styles.pharmacyRow}>
        <Ionicons name="storefront-outline" size={16} color={T.Colors.textTertiary} />
        <Text style={styles.pharmacyName}>{order.pharmacy_id}</Text>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.totalLabel}>
          Total: <Text style={styles.totalAmount}>{formatPrice(order.total_paise)}</Text>
        </Text>
        <View style={styles.footerActions}>
          {status !== 'delivered' && status !== 'cancelled' && (
            <TouchableOpacity style={styles.trackBtn} onPress={handleTrack} activeOpacity={0.8}>
              <Ionicons name="navigate-outline" size={14} color={T.Colors.textInverse} />
              <Text style={styles.trackText}>Track</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
    retry: 1,
  });

  const ListEmpty = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="receipt-outline" size={40} color={T.Colors.navyMid} />
      </View>
      <Text style={styles.emptyTitle}>
        {isLoading ? 'Loading orders…' : 'No orders yet'}
      </Text>
      <Text style={styles.emptyText}>Your order history will appear here</Text>
    </View>
  );

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderTitle}>My Orders</Text>
      <View style={styles.listHeaderBadge}>
        <Text style={styles.listHeaderCount}>{orders.length}</Text>
      </View>
    </View>
  );

  return (
    <FlatList<Order>
      data={orders}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <OrderCard order={item} />}
      contentContainerStyle={[
        styles.list,
        orders.length === 0 && styles.listEmpty,
      ]}
      ListHeaderComponent={orders.length > 0 ? ListHeader : null}
      ListEmptyComponent={ListEmpty}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    />
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.Colors.surface },
  list: { padding: T.Spacing.lg, gap: 12 },
  listEmpty: { flex: 1 },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingBottom: 8,
  },
  listHeaderTitle: { fontSize: T.FontSize['2xl'], fontWeight: T.FontWeight.black, color: T.Colors.textPrimary },
  listHeaderBadge: {
    backgroundColor: T.Colors.navyLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: T.Radius.full,
  },
  listHeaderCount: { fontSize: T.FontSize.sm, fontWeight: T.FontWeight.bold, color: T.Colors.navyMid },

  card: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.lg,
    padding: T.Spacing.lg,
    ...T.Shadow.cardMd,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: T.Spacing.md,
  },
  orderId: { fontSize: T.FontSize.md, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  orderDate: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary, marginTop: 3 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: T.Radius.full,
  },
  statusText: { fontSize: T.FontSize.xs, fontWeight: T.FontWeight.bold },
  divider: { height: 1, backgroundColor: T.Colors.borderLight, marginBottom: T.Spacing.md },

  pharmacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: T.Spacing.md,
  },
  pharmacyName: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.semibold, color: T.Colors.textSecondary },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: T.FontSize.sm, color: T.Colors.textTertiary },
  totalAmount: { fontSize: T.FontSize.lg, fontWeight: T.FontWeight.black, color: T.Colors.textPrimary },
  footerActions: { flexDirection: 'row', gap: 8 },

  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: T.Colors.navyMid,
    borderRadius: T.Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  trackText: { fontSize: T.FontSize.sm, fontWeight: T.FontWeight.bold, color: T.Colors.textInverse },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: T.Colors.navyLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: T.Spacing.lg,
  },
  emptyTitle: { fontSize: T.FontSize.xl, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary, marginTop: 8 },
  emptyText: { fontSize: T.FontSize.base, color: T.Colors.textTertiary, marginTop: 8 },
});
