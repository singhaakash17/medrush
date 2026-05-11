import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { cartApi } from '@/api/cart';
import { ordersApi } from '@/api/orders';
import { rxApi } from '@/api/rx';
import { CartItemRow } from '@/components/CartItemRow';
import { Button } from '@/components/ui/Button';
import { formatPaise } from '@/lib/money';

const DELIVERY_FEE = 1900;
const PLATFORM_FEE = 200;
const PAYMENT_METHODS = [
  { key: 'upi',  label: 'UPI', icon: 'phone-portrait-outline' as const },
  { key: 'card', label: 'Card', icon: 'card-outline' as const },
  { key: 'cod',  label: 'Cash on Delivery', icon: 'cash-outline' as const },
];

export default function CartScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [address, setAddress] = useState({
    line1: '', line2: '', city: 'Bengaluru', state: 'Karnataka', pincode: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [rxId, setRxId] = useState<string | null>(null);

  const { data: cart, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['cart-items', cart?.id],
    queryFn: () => cartApi.getItems(cart!.id),
    enabled: !!cart?.id,
  });

  const { data: prescriptions } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: rxApi.list,
  });

  const placeMutation = useMutation({
    mutationFn: () => ordersApi.place({
      pharmacy_id: cart!.pharmacy_id!,
      items: items!.map((i) => ({ medicine_id: i.medicine_id, qty: i.qty })),
      delivery_address: { ...address, lat: 12.9716, lon: 77.5946 },
      rx_id: rxId ?? undefined,
      payment_method: paymentMethod,
    }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      router.replace({ pathname: '/tracking/[id]', params: { id: order.id } });
    },
    onError: (err: any) => {
      Alert.alert('Order failed', err?.response?.data?.error?.message ?? 'Please try again.');
    },
  });

  const isLoading = cartLoading || itemsLoading;
  const subtotal = items?.reduce((sum, i) => sum + i.unit_price_paise * i.qty, 0) ?? 0;
  const total = subtotal + DELIVERY_FEE + PLATFORM_FEE;
  const hasRxItems = false; // TODO: check against catalog

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

  const canCheckout = address.line1.trim().length > 0 && address.pincode.length === 6;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Items */}
        <Text style={styles.sectionTitle}>Your Items ({items.length})</Text>
        <View style={styles.card}>
          {items.map((item) => (
            <CartItemRow key={item.id} item={item} />
          ))}
        </View>

        {/* Delivery address */}
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="House / Flat No., Building"
            value={address.line1}
            onChangeText={(v) => setAddress((a) => ({ ...a, line1: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Street, Area (optional)"
            value={address.line2}
            onChangeText={(v) => setAddress((a) => ({ ...a, line2: v }))}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="City"
              value={address.city}
              onChangeText={(v) => setAddress((a) => ({ ...a, city: v }))}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Pincode"
              value={address.pincode}
              onChangeText={(v) => setAddress((a) => ({ ...a, pincode: v }))}
              keyboardType="numeric"
              maxLength={6}
            />
          </View>
        </View>

        {/* Prescription */}
        {prescriptions && prescriptions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Attach Prescription</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.rxOption}
                onPress={() => setRxId(null)}
              >
                <View style={[styles.radio, !rxId && styles.radioSelected]} />
                <Text style={styles.rxOptionText}>No prescription (OTC only)</Text>
              </TouchableOpacity>
              {prescriptions.slice(0, 3).map((rx) => (
                <TouchableOpacity
                  key={rx.id}
                  style={styles.rxOption}
                  onPress={() => setRxId(rx.id)}
                >
                  <View style={[styles.radio, rxId === rx.id && styles.radioSelected]} />
                  <Ionicons name="document-text-outline" size={16} color="#0EA5E9" />
                  <Text style={styles.rxOptionText}>
                    {rx.doctor_name ?? 'Prescription'} · {new Date(rx.created_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => router.push('/rx/upload')} style={styles.newRxBtn}>
                <Ionicons name="add-circle-outline" size={16} color="#0EA5E9" />
                <Text style={styles.newRxBtnText}>Upload new prescription</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Payment method */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.card}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.key}
              style={[styles.payRow, paymentMethod === method.key && styles.payRowSelected]}
              onPress={() => setPaymentMethod(method.key)}
            >
              <Ionicons
                name={method.icon}
                size={20}
                color={paymentMethod === method.key ? '#0EA5E9' : '#6B7280'}
              />
              <Text style={[styles.payLabel, paymentMethod === method.key && styles.payLabelSelected]}>
                {method.label}
              </Text>
              {paymentMethod === method.key && (
                <Ionicons name="checkmark-circle" size={20} color="#0EA5E9" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({items.length} items)</Text>
            <Text style={styles.summaryValue}>{formatPaise(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery fee</Text>
            <Text style={styles.summaryValue}>{formatPaise(DELIVERY_FEE)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform fee</Text>
            <Text style={styles.summaryValue}>{formatPaise(PLATFORM_FEE)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPaise(total)}</Text>
          </View>
        </View>

        {/* ETA guarantee */}
        <View style={styles.slaBox}>
          <Ionicons name="flash" size={16} color="#0EA5E9" />
          <Text style={styles.slaText}>Guaranteed delivery within 15 minutes or full refund</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Pay</Text>
          <Text style={styles.footerTotalValue}>{formatPaise(total)}</Text>
        </View>
        <Button
          title={placeMutation.isPending ? 'Placing…' : 'Place Order ⚡'}
          onPress={() => {
            if (!canCheckout) {
              Alert.alert('Complete address', 'Please enter your delivery address and pincode.');
              return;
            }
            placeMutation.mutate();
          }}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0F9FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 120 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0C4A6E', marginBottom: 8, marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#374151', marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1 },
  rxOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  rxOptionText: { flex: 1, fontSize: 14, color: '#374151' },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#D1D5DB',
  },
  radioSelected: { borderColor: '#0EA5E9', backgroundColor: '#0EA5E9' },
  newRxBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10,
  },
  newRxBtnText: { fontSize: 13, color: '#0EA5E9', fontWeight: '600' },
  payRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, marginBottom: 8,
  },
  payRowSelected: { borderColor: '#0EA5E9', backgroundColor: '#EFF6FF' },
  payLabel: { flex: 1, fontSize: 14, color: '#374151' },
  payLabelSelected: { color: '#0C4A6E', fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, color: '#111827' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  slaBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12,
  },
  slaText: { flex: 1, fontSize: 12, color: '#0C4A6E' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 8,
  },
  footerTotal: { alignItems: 'center' },
  footerTotalLabel: { fontSize: 11, color: '#9CA3AF' },
  footerTotalValue: { fontSize: 16, fontWeight: '800', color: '#0C4A6E' },
});
