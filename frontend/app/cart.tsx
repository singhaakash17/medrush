import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { cartApi } from '@/api/cart';
import { CartItemRow } from '@/components/CartItemRow';
import { Button } from '@/components/ui/Button';
import { formatPaise } from '@/lib/money';
import { useRouter } from 'expo-router';

export default function CartScreen() {
  const router = useRouter();

  const { data: cart, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['cart-items', cart?.id],
    queryFn: () => cartApi.getItems(cart!.id),
    enabled: !!cart?.id,
  });

  const isLoading = cartLoading || itemsLoading;
  const total = items?.reduce((sum, i) => sum + i.unit_price_paise * i.qty, 0) ?? 0;

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0EA5E9" /></View>;
  }

  if (!cart || !items || items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cart-outline" size={80} color="#E5E7EB" />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>Search for medicines to add them here</Text>
        <Button
          title="Browse Medicines"
          onPress={() => router.push('/(tabs)/search')}
          style={{ marginTop: 20, width: 200 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {items.map((item) => (
            <CartItemRow key={item.id} item={item} />
          ))}
        </View>

        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({items.length} items)</Text>
            <Text style={styles.summaryValue}>{formatPaise(total)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery fee</Text>
            <Text style={styles.summaryValue}>₹0.00</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPaise(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalValue}>{formatPaise(total)}</Text>
        </View>
        <Button
          title="Proceed to Checkout"
          onPress={() => {}}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, color: '#111827' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerTotal: { alignItems: 'center' },
  footerTotalLabel: { fontSize: 12, color: '#9CA3AF' },
  footerTotalValue: { fontSize: 16, fontWeight: '800', color: '#111827' },
});
