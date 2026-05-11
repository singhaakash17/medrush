import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore, type LocalCartItem } from '@/store/cart';
import { MOCK_ADDRESSES } from '@/mock/data';

const DELIVERY_FEE = 2500; // ₹25
const PLATFORM_FEE = 500;  // ₹5

type PaymentMethod = 'upi' | 'card' | 'cod';

function CartItemRow({ item }: { item: LocalCartItem }) {
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = item.unit_price_paise * item.qty;
  const discount = Math.round((item.mrp_paise - item.unit_price_paise) / item.mrp_paise * 100);

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemIcon}>
        <Ionicons name="medical" size={22} color="#0EA5E9" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.medicine_name}</Text>
        <Text style={styles.itemGeneric} numberOfLines={1}>{item.generic_name} · {item.form}</Text>
        <View style={styles.itemPriceRow}>
          <Text style={styles.itemPrice}>₹{(item.unit_price_paise / 100).toFixed(0)}</Text>
          <Text style={styles.itemMrp}>₹{(item.mrp_paise / 100).toFixed(0)}</Text>
          {discount > 0 && <Text style={styles.itemDiscount}>{discount}% off</Text>}
          {item.rx_required && (
            <View style={styles.rxBadge}>
              <Text style={styles.rxBadgeText}>Rx</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.qtyControls}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => updateQty(item.medicine_id, item.qty - 1)}
        >
          <Ionicons name={item.qty === 1 ? 'trash-outline' : 'remove'} size={16} color="#EF4444" />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.qty}</Text>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => updateQty(item.medicine_id, item.qty + 1)}
        >
          <Ionicons name="add" size={16} color="#0EA5E9" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const { items, pharmacyName, totalPaise, clearCart } = useCartStore();
  const [selectedAddress, setSelectedAddress] = useState(MOCK_ADDRESSES[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [placing, setPlacing] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  const subtotal = totalPaise();
  const total = subtotal + DELIVERY_FEE + PLATFORM_FEE;
  const savings = items.reduce((s, i) => s + (i.mrp_paise - i.unit_price_paise) * i.qty, 0);

  const handlePlaceOrder = async () => {
    setShowPayModal(false);
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 1800));
    setPlacing(false);

    const mockOrderId = `MR-${Date.now().toString().slice(-6)}`;
    clearCart();

    Alert.alert(
      '🎉 Order Placed!',
      `Order ${mockOrderId} confirmed.\nEstimated delivery: 15 minutes`,
      [
        {
          text: 'Track Order',
          onPress: () =>
            router.push({ pathname: '/tracking/[id]' as any, params: { id: mockOrderId } }),
        },
        { text: 'Continue Shopping', onPress: () => router.replace('/(tabs)/') },
      ]
    );
  };

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cart-outline" size={80} color="#E5E7EB" />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>Add medicines from Home or Search</Text>
        <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/search')}>
          <Text style={styles.browseBtnText}>Browse Medicines</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pharmacy header */}
        <View style={styles.pharmacyRow}>
          <Ionicons name="storefront-outline" size={18} color="#0EA5E9" />
          <Text style={styles.pharmacyName}>{pharmacyName}</Text>
          <TouchableOpacity onPress={() => Alert.alert('Change Pharmacy', 'Clear cart to choose a different pharmacy.', [
            { text: 'Clear & Change', style: 'destructive', onPress: () => { clearCart(); router.push('/(tabs)/search'); } },
            { text: 'Keep Cart', style: 'cancel' },
          ])}>
            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Items */}
        <View style={styles.card}>
          {items.map((item) => (
            <CartItemRow key={item.medicine_id} item={item} />
          ))}
        </View>

        {/* Savings banner */}
        {savings > 0 && (
          <View style={styles.savingsBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.savingsText}>You save ₹{(savings / 100).toFixed(0)} on this order</Text>
          </View>
        )}

        {/* Delivery Address */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Deliver to</Text>
          {MOCK_ADDRESSES.map((addr) => (
            <TouchableOpacity
              key={addr.id}
              style={[styles.addressRow, selectedAddress.id === addr.id && styles.addressRowSelected]}
              onPress={() => setSelectedAddress(addr)}
            >
              <View style={styles.radioOuter}>
                {selectedAddress.id === addr.id && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addrLabel}>{addr.label}</Text>
                <Text style={styles.addrLine}>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</Text>
                <Text style={styles.addrCity}>{addr.city} — {addr.pincode}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Method */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment method</Text>
          {([
            { id: 'upi', icon: 'phone-portrait-outline', label: 'UPI / GPay / PhonePe' },
            { id: 'card', icon: 'card-outline', label: 'Credit / Debit Card' },
            { id: 'cod', icon: 'cash-outline', label: 'Cash on Delivery' },
          ] as const).map((pm) => (
            <TouchableOpacity
              key={pm.id}
              style={[styles.payRow, paymentMethod === pm.id && styles.payRowSelected]}
              onPress={() => setPaymentMethod(pm.id)}
            >
              <View style={styles.radioOuter}>
                {paymentMethod === pm.id && <View style={styles.radioInner} />}
              </View>
              <Ionicons name={pm.icon} size={20} color={paymentMethod === pm.id ? '#0EA5E9' : '#6B7280'} />
              <Text style={[styles.payLabel, paymentMethod === pm.id && styles.payLabelActive]}>
                {pm.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bill summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Bill summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Subtotal ({items.length} items)</Text>
            <Text style={styles.billValue}>₹{(subtotal / 100).toFixed(0)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery fee</Text>
            <Text style={styles.billValue}>₹{(DELIVERY_FEE / 100).toFixed(0)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Platform fee</Text>
            <Text style={styles.billValue}>₹{(PLATFORM_FEE / 100).toFixed(0)}</Text>
          </View>
          {savings > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: '#10B981' }]}>Discount savings</Text>
              <Text style={[styles.billValue, { color: '#10B981' }]}>−₹{(savings / 100).toFixed(0)}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.billRow}>
            <Text style={styles.billTotal}>Total</Text>
            <Text style={styles.billTotalValue}>₹{(total / 100).toFixed(0)}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Checkout footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerTotal}>₹{(total / 100).toFixed(0)}</Text>
          <Text style={styles.footerSub}>{items.length} item{items.length > 1 ? 's' : ''} · {pharmacyName}</Text>
        </View>
        <TouchableOpacity
          style={styles.placeBtn}
          onPress={() => setShowPayModal(true)}
          disabled={placing}
        >
          {placing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeBtnText}>
              {paymentMethod === 'upi' ? 'Pay via UPI' : paymentMethod === 'card' ? 'Pay via Card' : 'Place Order'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Mock payment modal */}
      <Modal visible={showPayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {paymentMethod === 'cod' ? 'Confirm Order' : `Pay ₹${(total / 100).toFixed(0)}`}
            </Text>
            {paymentMethod === 'upi' && (
              <View style={styles.upiBox}>
                <Text style={styles.upiLabel}>UPI ID</Text>
                <Text style={styles.upiId}>medrush@ybl</Text>
                <Text style={styles.upiNote}>Scan or pay to proceed</Text>
              </View>
            )}
            {paymentMethod === 'card' && (
              <Text style={styles.modalSubtitle}>Redirecting to secure payment gateway…</Text>
            )}
            {paymentMethod === 'cod' && (
              <Text style={styles.modalSubtitle}>
                Pay ₹{(total / 100).toFixed(0)} in cash when your order arrives.
              </Text>
            )}
            <TouchableOpacity style={styles.confirmBtn} onPress={handlePlaceOrder}>
              <Text style={styles.confirmBtnText}>
                {paymentMethod === 'cod' ? 'Confirm Order' : 'Payment Done — Confirm'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLink} onPress={() => setShowPayModal(false)}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },

  pharmacyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 12,
  },
  pharmacyName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1D4ED8' },
  changeLink: { fontSize: 13, color: '#0EA5E9', fontWeight: '600' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  itemIcon: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: '#F0F9FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  itemInfo: { flex: 1, marginRight: 8 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  itemGeneric: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  itemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#111827' },
  itemMrp: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through' },
  itemDiscount: { fontSize: 11, color: '#10B981', fontWeight: '600' },
  rxBadge: { backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  rxBadgeText: { fontSize: 9, fontWeight: '700', color: '#92400E' },

  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff',
  },
  qtyText: { fontSize: 15, fontWeight: '700', color: '#111827', minWidth: 20, textAlign: 'center' },

  savingsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ECFDF5', borderRadius: 10, padding: 10, marginBottom: 12,
  },
  savingsText: { fontSize: 13, color: '#10B981', fontWeight: '600' },

  sectionCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },

  addressRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 8,
  },
  addressRowSelected: { borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' },
  addrLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
  addrLine: { fontSize: 12, color: '#374151', marginTop: 2 },
  addrCity: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#0EA5E9',
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0EA5E9' },

  payRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 8,
  },
  payRowSelected: { borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' },
  payLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  payLabelActive: { color: '#0EA5E9', fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  billLabel: { fontSize: 14, color: '#6B7280' },
  billValue: { fontSize: 14, color: '#374151', fontWeight: '500' },
  billTotal: { fontSize: 16, fontWeight: '700', color: '#111827' },
  billTotalValue: { fontSize: 18, fontWeight: '800', color: '#111827' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  footerTotal: { fontSize: 20, fontWeight: '800', color: '#111827' },
  footerSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  placeBtn: {
    flex: 1, marginLeft: 16, backgroundColor: '#0EA5E9', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  placeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F9FAFB' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  browseBtn: {
    marginTop: 24, backgroundColor: '#0EA5E9', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14,
  },
  browseBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  upiBox: {
    backgroundColor: '#F0F9FF', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20,
  },
  upiLabel: { fontSize: 12, color: '#9CA3AF' },
  upiId: { fontSize: 22, fontWeight: '800', color: '#0EA5E9', marginTop: 4 },
  upiNote: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  confirmBtn: {
    backgroundColor: '#0EA5E9', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelLink: { alignItems: 'center', paddingVertical: 8 },
  cancelLinkText: { fontSize: 14, color: '#9CA3AF' },
});
