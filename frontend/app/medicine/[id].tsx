import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { catalogApi } from '@/api/catalog';
import { geoApi } from '@/api/geo';
import { Button } from '@/components/ui/Button';
import { formatPaise } from '@/lib/money';
import { useCartStore } from '@/store/cart';
import { T } from '@/theme';

/** Default coords (Koramangala, Bengaluru) used when device location is unavailable. */
const BENGALURU_DEFAULT = { lat: 12.9352, lon: 77.6245 };

const SCHEDULE_INFO: Record<string, { label: string; color: string }> = {
  H: { label: 'Schedule H — Prescription required', color: T.Colors.amber },
  H1: { label: 'Schedule H1 — Strict prescription required', color: T.Colors.crimson },
  X: { label: 'Schedule X — Controlled substance', color: '#7C3AED' },
  OTC: { label: 'Over the counter', color: T.Colors.emerald },
  GENERAL: { label: 'General medicine', color: T.Colors.emerald },
  G: { label: 'General medicine', color: T.Colors.emerald },
};

export default function MedicineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  const { data: apiMedicine, isLoading } = useQuery({
    queryKey: ['medicine', id],
    queryFn: () => catalogApi.getMedicine(id!).catch(() => null),
    enabled: !!id,
  });

  const { data: warnings } = useQuery({
    queryKey: ['warnings', id],
    queryFn: () => catalogApi.getWarnings(id!).catch(() => []),
    enabled: !!id,
  });

  /** Fetch pharmacies near the user that stock this specific medicine. */
  const { data: nearbyPharmacies } = useQuery({
    queryKey: ['nearby-pharmacies-for-medicine', id],
    queryFn: () =>
      geoApi
        .nearbyPharmacies({
          lat: BENGALURU_DEFAULT.lat,
          lon: BENGALURU_DEFAULT.lon,
          radius_m: 5000,
          medicine_id: id,
        })
        .catch(() => []),
    enabled: !!id,
  });

  const nearestPharmacy = nearbyPharmacies?.[0] ?? null;

  // `isRealMedicine` is true only when the catalog API returned data.
  const isRealMedicine = !!apiMedicine;
  const medicine = apiMedicine ?? null;

  const qtyInCart = cartItems.find((i) => i.medicine_id === id)?.qty ?? 0;

  const handleAddToCart = () => {
    if (!medicine) return;
    if (!isRealMedicine) {
      Alert.alert(
        'Not Available',
        'This medicine is not currently available for online ordering at nearby pharmacies. Try searching for an alternative.',
      );
      return;
    }
    if (!nearestPharmacy) {
      Alert.alert(
        'No Nearby Pharmacy',
        'No pharmacy near you currently stocks this medicine. Try again in a moment.',
      );
      return;
    }
    addItem({
      medicine_id: medicine.id,
      medicine_name: medicine.brand_name,
      generic_name: medicine.generic_name,
      form: medicine.form,
      unit_price_paise: nearestPharmacy.selling_price_paise ?? medicine.mrp_paise,
      mrp_paise: nearestPharmacy.mrp_paise ?? medicine.mrp_paise,
      rx_required: medicine.rx_required ?? false,
      pharmacy_id: nearestPharmacy.pharmacy_id,
      pharmacy_name: nearestPharmacy.name,
    });
    Alert.alert('Added to cart', `${medicine.brand_name} added to your cart.`);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={T.Colors.navyMid} />
      </View>
    );
  }

  if (!medicine) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={T.Colors.border} />
        <Text style={styles.errorText}>Medicine not found</Text>
      </View>
    );
  }

  const scheduleInfo = medicine.schedule ? SCHEDULE_INFO[medicine.schedule] : null;
  // Use pharmacy's selling price if available; otherwise fall back to 15% off MRP.
  const sellingPrice =
    nearestPharmacy?.selling_price_paise ??
    Math.round(medicine.mrp_paise * 0.85);
  const displayMrp = nearestPharmacy?.mrp_paise ?? medicine.mrp_paise;
  const discountPct = displayMrp > 0
    ? Math.round(((displayMrp - sellingPrice) / displayMrp) * 100)
    : 15;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Medicine icon + header */}
        <View style={styles.heroCard}>
          <View style={styles.medicineIcon}>
            <Ionicons name="medical" size={36} color={T.Colors.navyMid} />
          </View>
          <Text style={styles.brand}>{medicine.brand_name}</Text>
          <Text style={styles.generic}>{medicine.generic_name}</Text>
          <Text style={styles.form}>{medicine.form} · {medicine.strength} · {medicine.pack_size} {medicine.pack_unit}</Text>
          {nearestPharmacy && (
            <Text style={styles.manufacturer}>
              📍 {nearestPharmacy.name} · {Math.round(nearestPharmacy.distance_m / 100) / 10} km away
            </Text>
          )}
        </View>

        {/* Price card */}
        <View style={styles.priceBox}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPaise(sellingPrice)}</Text>
            <Text style={styles.mrp}>{formatPaise(displayMrp)}</Text>
            {discountPct > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discountPct}% off</Text>
              </View>
            )}
          </View>
          <Text style={styles.priceLabel}>MRP incl. all taxes · per pack</Text>
          {qtyInCart > 0 && (
            <View style={styles.inCartBadge}>
              <Ionicons name="cart" size={14} color={T.Colors.navyMid} />
              <Text style={styles.inCartText}>{qtyInCart} in cart</Text>
            </View>
          )}
        </View>

        {/* Schedule badge */}
        {scheduleInfo && (
          <View style={[styles.infoBadge, { backgroundColor: `${scheduleInfo.color}15` }]}>
            <Ionicons name="information-circle-outline" size={18} color={scheduleInfo.color} />
            <Text style={[styles.infoBadgeText, { color: scheduleInfo.color }]}>
              {scheduleInfo.label}
            </Text>
          </View>
        )}

        {medicine.rx_required && (
          <View style={styles.rxBox}>
            <Ionicons name="document-text-outline" size={18} color="#D97706" />
            <Text style={styles.rxText}>
              A valid prescription is required to purchase this medicine.
            </Text>
          </View>
        )}

        {medicine.is_discontinued && (
          <View style={[styles.infoBadge, { backgroundColor: T.Colors.crimsonLight }]}>
            <Ionicons name="close-circle-outline" size={18} color={T.Colors.crimson} />
            <Text style={[styles.infoBadgeText, { color: T.Colors.crimson }]}>This medicine is discontinued</Text>
          </View>
        )}

        {/* Delivery info */}
        <View style={styles.deliveryCard}>
          <View style={styles.deliveryRow}>
            <Ionicons name="flash" size={18} color={T.Colors.emerald} />
            <Text style={styles.deliveryText}>Delivered in 15 minutes</Text>
          </View>
          <View style={styles.deliveryRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={T.Colors.navyMid} />
            <Text style={styles.deliveryText}>Licensed pharmacy · Genuine medicines</Text>
          </View>
        </View>

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Warnings & Precautions</Text>
            {warnings.map((w) => (
              <View key={w.id} style={styles.warningRow}>
                <Ionicons
                  name="warning-outline"
                  size={16}
                  color={w.severity === 'critical' ? T.Colors.crimson : T.Colors.amber}
                />
                <Text style={styles.warningText}>{w.description}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add to cart CTA */}
      {!medicine.is_discontinued && (
        <View style={styles.footer}>
          <Button
            title={
              !isRealMedicine
                ? 'Not Available for Online Order'
                : qtyInCart > 0
                  ? `In Cart (${qtyInCart}) — Add More`
                  : (medicine.rx_required ? 'Upload Rx & Add to Cart' : 'Add to Cart')
            }
            onPress={handleAddToCart}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: T.Spacing.md },
  errorText: { fontSize: T.FontSize.lg, color: T.Colors.textTertiary },
  content: { padding: T.Spacing.lg, paddingBottom: 100 },

  heroCard: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.xl,
    padding: T.Spacing['2xl'],
    alignItems: 'center',
    marginBottom: T.Spacing.md,
    ...T.Shadow.cardMd,
  },
  medicineIcon: {
    width: 72, height: 72, borderRadius: T.Radius.xl,
    backgroundColor: T.Colors.navyLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: T.Spacing.lg,
  },
  brand: { fontSize: T.FontSize['2xl'], fontWeight: T.FontWeight.black, color: T.Colors.textPrimary, textAlign: 'center' },
  generic: { fontSize: T.FontSize.base, color: T.Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  form: { fontSize: T.FontSize.sm, color: T.Colors.textTertiary, marginTop: 6, textAlign: 'center' },
  manufacturer: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary, marginTop: 4 },

  priceBox: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.lg,
    padding: T.Spacing.lg,
    marginBottom: T.Spacing.md,
    ...T.Shadow.card,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: T.Spacing.sm, marginBottom: 4 },
  price: { fontSize: T.FontSize['3xl'], fontWeight: T.FontWeight.black, color: T.Colors.textPrimary },
  mrp: { fontSize: T.FontSize.base, color: T.Colors.textTertiary, textDecorationLine: 'line-through' },
  discountBadge: {
    backgroundColor: T.Colors.emeraldLight,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: T.Radius.full,
  },
  discountText: { fontSize: T.FontSize.xs, fontWeight: T.FontWeight.bold, color: T.Colors.emeraldDark },
  priceLabel: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary },
  inCartBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.Colors.navyLight,
    borderRadius: T.Radius.full,
    paddingHorizontal: T.Spacing.md, paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: T.Spacing.sm,
  },
  inCartText: { fontSize: T.FontSize.xs, fontWeight: T.FontWeight.semibold, color: T.Colors.navyMid },

  infoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: T.Spacing.md, borderRadius: T.Radius.md, marginBottom: 10,
  },
  infoBadgeText: { fontSize: T.FontSize.sm, fontWeight: T.FontWeight.semibold, flex: 1 },

  rxBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: T.Spacing.md, borderRadius: T.Radius.md,
    backgroundColor: T.Colors.amberLight, marginBottom: 10,
  },
  rxText: { fontSize: T.FontSize.sm, color: '#D97706', flex: 1, lineHeight: 18 },

  deliveryCard: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.lg,
    padding: T.Spacing.lg,
    gap: T.Spacing.md,
    marginBottom: T.Spacing.md,
    ...T.Shadow.card,
  },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: T.Spacing.md },
  deliveryText: { fontSize: T.FontSize.sm, color: T.Colors.textSecondary, fontWeight: T.FontWeight.medium },

  section: { marginTop: T.Spacing.md },
  sectionTitle: { fontSize: T.FontSize.lg, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary, marginBottom: T.Spacing.md },
  warningRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  warningText: { fontSize: T.FontSize.base, color: T.Colors.textSecondary, flex: 1, lineHeight: 20 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: T.Spacing.lg, backgroundColor: T.Colors.white,
    borderTopWidth: 1, borderTopColor: T.Colors.border,
    ...T.Shadow.cardMd,
  },
});
