import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '@/api/orders';
import { useAuthStore } from '@/store/auth';
import { OrderCard } from '@/components/OrderCard';

export default function HomeScreen() {
  const router = useRouter();
  const principalId = useAuthStore((s) => s.principalId);

  const { data: orders, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
    enabled: !!principalId,
  });

  const activeOrders = orders?.filter((o) =>
    ['pending', 'confirmed', 'dispatched'].includes(o.status)
  ) ?? [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {/* Search bar shortcut */}
      <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/(tabs)/search')}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        <Text style={styles.searchText}>Search medicines…</Text>
      </TouchableOpacity>

      {/* Quick actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/search')}>
          <Ionicons name="medical-outline" size={28} color="#0EA5E9" />
          <Text style={styles.actionLabel}>Medicines</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/cart')}>
          <Ionicons name="cart-outline" size={28} color="#0EA5E9" />
          <Text style={styles.actionLabel}>Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/orders')}>
          <Ionicons name="receipt-outline" size={28} color="#0EA5E9" />
          <Text style={styles.actionLabel}>Orders</Text>
        </TouchableOpacity>
      </View>

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Orders</Text>
          {activeOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </View>
      )}

      {/* Recent orders */}
      {orders && orders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {orders.slice(0, 3).map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </View>
      )}

      {!isLoading && (!orders || orders.length === 0) && (
        <View style={styles.empty}>
          <Ionicons name="bag-outline" size={64} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>Search for medicines to place your first order</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.emptyBtnText}>Browse Medicines</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchText: { fontSize: 15, color: '#9CA3AF' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  emptyBtn: {
    marginTop: 20,
    backgroundColor: '#0EA5E9',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
