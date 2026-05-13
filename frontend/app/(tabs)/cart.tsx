import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore, type LocalCartItem } from '@/store/cart';
import { T } from '@/theme';
import { MOCK_ADDRESSES } from '@/mock/data';
import { ordersApi } from '@/api/orders';

const DELIVERY_FEE = 2500; // ₹25
const PLATFORM_FEE = 500;  // ₹5

type PaymentMethod = 'upi' | 'card' | 'cod';

function CartItemRow({ item }: { item: LocalCartItem }) {
  const updateQty = useCartStore((s) => s.updateQty);
  const subtotal = item.unit_price_paise * item.qty;
  const discount = Math.round((item.mrp_paise - item.unit_price_paise) / item.mrp_paise * 100);

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemIcon}>
        <Ionicons name="medical" size={22} color={T.Colors.navyMid} />
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
          <Ionicons name={item.qty === 1 ? 'trash-outline' : 'remove'} size={16} color={T.Colors.crimson} />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.qty}</Text>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => updateQty(item.medicine_id, item.qty + 1)}
        >
          <Ionicons name="add" size={16} color={T.Colors.navyMid} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const { items, pharmacyId, pharmacyName, totalPaise, clearCart } = useCartStore();
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

    try {
      const order = await ordersApi.place({
        pharmacy_id: pharmacyId!,
        items: items.map((i) => ({ medicine_id: i.medicine_id, qty: i.qty })),
        delivery_address: {
          line1: selectedAddress.line1,
          line2: (selectedAddress as any).area ?? undefined,
          city: selectedAddress.city,
          state: 'Karnataka',
          pincode: selectedAddress.pincode,
        },
        payment_method: paymentMethod,
      });

      clearCart();
      Alert.alert(
        '🎉 Order Placed!',
        `Order confirmed.\nEstimated delivery: 15 minutes`,
        [
          {
            text: 'Track Order',
            onPress: () =>
              router.push({ pathname: '/tracking/[id]' as any, params: { id: order.id } }),
          },
          { text: 'Continue Shopping', onPress: () => router.replace('/(tabs)/') },
        ]
      );
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? err?.message ?? 'Something went wrong. Please try again.';
      Alert.alert('Order Failed', message);
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="cart-outline" size={48} color={T.Colors.navyMid} />
        </View>
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
          <Ionicons name="storefront-outline" size={18} color={T.Colors.navyMid} />
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
            <Ionicons name="checkmark-circle" size={16} color={T.Colors.emerald} />
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
              <Ionicons name={pm.icon} size={20} color={paymentMethod === pm.id ? T.Colors.navyMid : T.Colors.textSecondary} />
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
              <Text style={[styles.billLabel, { color: T.Colors.emerald }]}>Discount savings</Text>
              <Text style={[styles.billValue, { color: T.Colors.emerald }]}>−₹{(savings / 100).toFixed(0)}</Text>
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
            <ActivityIndicator color={T.Colors.textInverse} />
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
            <View style={styles.modalHandle} />
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
  screen: { flex: 1, backgroundColor: T.Colors.surface },
  content: { padding: T.Spacing.lg },

  pharmacyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.Colors.navyLight,
    borderRadius: T.Radius.md,
    padding: T.Spacing.md,
    marginBottom: T.Spacing.md,
  },
  pharmacyName: { flex: 1, fontSize: T.FontSize.base, fontWeight: T.FontWeight.semibold, color: T.Colors.navyMid },
  changeLink: { fontSize: T.FontSize.sm, color: T.Colors.navyMid, fontWeight: T.FontWeight.semibold },

  card: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.lg,
    marginBottom: T.Spacing.md,
    ...T.Shadow.card,
  },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', padding: T.Spacing.md,
    borderBottomWidth: 1, borderBottomColor: T.Colors.borderLight,
  },
  itemIcon: {
    width: 44, height: 44, borderRadius: T.Radius.md,
    backgroundColor: T.Colors.navyLight,
    justifyContent: 'center', alignItems: 'center', marginRight: T.Spacing.md,
  },
  itemInfo: { flex: 1, marginRight: 8 },
  itemName: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  itemGeneric: { fontSize: T.FontSize.xs, color: T.Colors.textSecondary, marginTop: 1 },
  itemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  itemPrice: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  itemMrp: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary, textDecorationLine: 'line-through' },
  itemDiscount: { fontSize: T.FontSize['2xs'], color: T.Colors.emerald, fontWeight: T.FontWeight.semibold },
  rxBadge: { backgroundColor: T.Colors.amberLight, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  rxBadgeText: { fontSize: 9, fontWeight: T.FontWeight.black, color: '#92400E' },

  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: T.Radius.sm,
    borderWidth: 1.5, borderColor: T.Colors.border,
    justifyContent: 'center', alignItems: 'center', backgroundColor: T.Colors.white,
  },
  qtyText: { fontSize: T.FontSize.md, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary, minWidth: 20, textAlign: 'center' },

  savingsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.Colors.emeraldLight,
    borderRadius: T.Radius.md, padding: 10, marginBottom: T.Spacing.md,
  },
  savingsText: { fontSize: T.FontSize.sm, color: T.Colors.emerald, fontWeight: T.FontWeight.semibold },

  sectionCard: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.lg,
    padding: T.Spacing.lg,
    marginBottom: T.Spacing.md,
    ...T.Shadow.card,
  },
  sectionTitle: { fontSize: T.FontSize.md, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary, marginBottom: T.Spacing.md },

  addressRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: T.Spacing.md,
    padding: 10, borderRadius: T.Radius.md,
    borderWidth: 1.5, borderColor: T.Colors.border, marginBottom: 8,
  },
  addressRowSelected: { borderColor: T.Colors.navyMid, backgroundColor: T.Colors.navyLight },
  addrLabel: { fontSize: T.FontSize.sm, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  addrLine: { fontSize: T.FontSize.xs, color: T.Colors.textSecondary, marginTop: 2 },
  addrCity: { fontSize: T.FontSize['2xs'], color: T.Colors.textTertiary, marginTop: 1 },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: T.Colors.navyMid,
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.Colors.navyMid },

  payRow: {
    flexDirection: 'row', alignItems: 'center', gap: T.Spacing.md,
    padding: T.Spacing.md, borderRadius: T.Radius.md,
    borderWidth: 1.5, borderColor: T.Colors.border, marginBottom: 8,
  },
  payRowSelected: { borderColor: T.Colors.navyMid, backgroundColor: T.Colors.navyLight },
  payLabel: { fontSize: T.FontSize.base, color: T.Colors.textSecondary, fontWeight: T.FontWeight.medium },
  payLabelActive: { color: T.Colors.navyMid, fontWeight: T.FontWeight.bold },

  divider: { height: 1, backgroundColor: T.Colors.borderLight, marginVertical: 10 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  billLabel: { fontSize: T.FontSize.base, color: T.Colors.textSecondary },
  billValue: { fontSize: T.FontSize.base, color: T.Colors.textSecondary, fontWeight: T.FontWeight.medium },
  billTotal: { fontSize: T.FontSize.lg, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  billTotalValue: { fontSize: T.FontSize.xl, fontWeight: T.FontWeight.black, color: T.Colors.textPrimary },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: T.Colors.white,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: T.Spacing.lg,
    paddingVertical: T.Spacing.md,
    paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: T.Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  footerTotal: { fontSize: T.FontSize['2xl'], fontWeight: T.FontWeight.black, color: T.Colors.textPrimary },
  footerSub: { fontSize: T.FontSize['2xs'], color: T.Colors.textTertiary, marginTop: 2 },
  placeBtn: {
    flex: 1, marginLeft: T.Spacing.lg,
    backgroundColor: T.Colors.navyMid,
    borderRadius: T.Radius.lg,
    paddingVertical: 16, alignItems: 'center',
  },
  placeBtnText: { color: T.Colors.textInverse, fontSize: T.FontSize.lg, fontWeight: T.FontWeight.bold },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: T.Colors.surface },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: T.Colors.navyLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: T.Spacing.lg,
  },
  emptyTitle: { fontSize: T.FontSize.xl, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary, marginTop: 8 },
  emptyText: { fontSize: T.FontSize.base, color: T.Colors.textTertiary, marginTop: 6, textAlign: 'center' },
  browseBtn: {
    marginTop: T.Spacing['2xl'],
    backgroundColor: T.Colors.navyMid,
    borderRadius: T.Radius.md,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  browseBtnText: { color: T.Colors.textInverse, fontSize: T.FontSize.md, fontWeight: T.FontWeight.bold },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: T.Colors.white,
    borderTopLeftRadius: T.Radius['2xl'],
    borderTopRightRadius: T.Radius['2xl'],
    padding: T.Spacing['2xl'],
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: T.Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: T.Spacing.xl,
  },
  modalTitle: { fontSize: T.FontSize['2xl'], fontWeight: T.FontWeight.black, color: T.Colors.textPrimary, marginBottom: T.Spacing.lg, textAlign: 'center' },
  modalSubtitle: { fontSize: T.FontSize.base, color: T.Colors.textSecondary, textAlign: 'center', marginBottom: T.Spacing.xl },
  upiBox: {
    backgroundColor: T.Colors.navyLight,
    borderRadius: T.Radius.md, padding: T.Spacing.lg, alignItems: 'center', marginBottom: T.Spacing.xl,
  },
  upiLabel: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary },
  upiId: { fontSize: T.FontSize['2xl'], fontWeight: T.FontWeight.black, color: T.Colors.navyMid, marginTop: 4 },
  upiNote: { fontSize: T.FontSize.xs, color: T.Colors.textSecondary, marginTop: 4 },
  confirmBtn: {
    backgroundColor: T.Colors.navyMid,
    borderRadius: T.Radius.lg,
    paddingVertical: 16, alignItems: 'center', marginBottom: T.Spacing.md,
  },
  confirmBtnText: { color: T.Colors.textInverse, fontSize: T.FontSize.lg, fontWeight: T.FontWeight.bold },
  cancelLink: { alignItems: 'center', paddingVertical: 8 },
  cancelLinkText: { fontSize: T.FontSize.base, color: T.Colors.textTertiary },
});
