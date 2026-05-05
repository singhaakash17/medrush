import React from 'react';
import { FlatList, View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '@/api/orders';
import { OrderCard } from '@/components/OrderCard';

export default function OrdersScreen() {
  const { data: orders, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <FlatList
      data={orders ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <OrderCard order={item} />}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={64} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>Your orders will appear here</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
});
