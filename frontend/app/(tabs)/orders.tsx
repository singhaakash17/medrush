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
import { MOCK_ORDERS, type MockOrder } from '@/mock/data';

// ─── Types ─────────────────────────────────────────────────────────────────────

type OrderStatus = MockOrder['status'];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; icon: string }
> = {
  delivered: {
    label: 'Delivered',
    bg: '#D1FAE5',
    text: '#065F46',
    icon: 'checkmark-circle',
  },
  in_transit: {
    label: 'In Transit',
    bg: '#DBEAFE',
    text: '#1E40AF',
    icon: 'bicycle',
  },
  pending: {
    label: 'Pending',
    bg: '#FEF3C7',
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
};

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

// ─── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: MockOrder }) {
  const config = STATUS_CONFIG[order.status];

  const handleReorder = () => {
    Alert.alert(
      'Reorder',
      `Adding items from order ${order.short_code} to your cart.\n\n${order.items_summary}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Cart',
          onPress: () =>
            Alert.alert('Added!', 'Items have been added to your cart.'),
        },
      ],
    );
  };

  const handleTrack = () => {
    Alert.alert(
      'Track Order',
      `Order ${order.short_code} is currently ${config.label.toLowerCase()}.\n\nEstimated arrival: ${order.time}`,
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
            {order.date} · {order.time}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon as any} size={13} color={config.text} />
          <Text style={[styles.statusText, { color: config.text }]}>{config.label}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Pharmacy */}
      <View style={styles.pharmacyRow}>
        <Ionicons name="storefront-outline" size={16} color="#6B7280" />
        <Text style={styles.pharmacyName}>{order.pharmacy_name}</Text>
      </View>

      {/* Items */}
      <View style={styles.itemsRow}>
        <Ionicons name="medical-outline" size={16} color="#6B7280" />
        <Text style={styles.itemsSummary} numberOfLines={2}>
          {order.items_summary}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.totalLabel}>
          Total: <Text style={styles.totalAmount}>{formatPrice(order.total_paise)}</Text>
        </Text>
        <View style={styles.footerActions}>
          {order.status === 'delivered' ? (
            <TouchableOpacity style={styles.reorderBtn} onPress={handleReorder} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={14} color="#0EA5E9" />
              <Text style={styles.reorderText}>Reorder</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.trackBtn} onPress={handleTrack} activeOpacity={0.8}>
              <Ionicons name="navigate-outline" size={14} color="#fff" />
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
  // Try real API first; fall back to mock data on error
  const { data: apiOrders, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
    retry: 1,
  });

  // Build display list:
  // - Use API data if available and non-empty
  // - Otherwise show MOCK_ORDERS so the screen is never blank in dev
  const displayOrders: MockOrder[] =
    !isError && apiOrders && apiOrders.length > 0
      ? (apiOrders as unknown as MockOrder[])
      : MOCK_ORDERS;

  const ListEmpty = () => (
    <View style={styles.empty}>
      <Ionicons name="receipt-outline" size={64} color="#E5E7EB" />
      <Text style={styles.emptyTitle}>No orders yet</Text>
      <Text style={styles.emptyText}>Your order history will appear here</Text>
    </View>
  );

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderTitle}>My Orders</Text>
      <Text style={styles.listHeaderCount}>
        {displayOrders.length} order{displayOrders.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  return (
    <FlatList<MockOrder>
      data={displayOrders}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <OrderCard order={item} />}
      contentContainerStyle={[
        styles.list,
        displayOrders.length === 0 && styles.listEmpty,
      ]}
      ListHeaderComponent={displayOrders.length > 0 ? ListHeader : null}
      ListEmptyComponent={ListEmpty}
      showsVerticalScrollIndicator={false}
    />
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  listEmpty: { flex: 1 },

  // List header
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingBottom: 8,
  },
  listHeaderTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  listHeaderCount: { fontSize: 13, color: '#9CA3AF' },

  // Order card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: { fontSize: 15, fontWeight: '700', color: '#111827' },
  orderDate: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 },

  // Pharmacy & items
  pharmacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pharmacyName: { fontSize: 14, fontWeight: '600', color: '#374151' },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  itemsSummary: { flex: 1, fontSize: 13, color: '#6B7280', lineHeight: 20 },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 13, color: '#6B7280' },
  totalAmount: { fontSize: 16, fontWeight: '800', color: '#111827' },
  footerActions: { flexDirection: 'row', gap: 8 },

  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: '#0EA5E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  reorderText: { fontSize: 13, fontWeight: '700', color: '#0EA5E9' },

  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0EA5E9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  trackText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
});
