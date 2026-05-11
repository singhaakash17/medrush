import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { NearbyPharmacy } from '@/types';

interface Props {
  pharmacy: NearbyPharmacy;
}

export function NearbyPharmacyCard({ pharmacy }: Props) {
  const router = useRouter();
  const distanceKm = (pharmacy.distance_m / 1000).toFixed(1);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/pharmacy/[id]', params: { id: pharmacy.pharmacy_id } })}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name}>{pharmacy.name}</Text>
          <Text style={styles.address} numberOfLines={1}>{pharmacy.address_line1}</Text>
        </View>
        <View style={styles.etaBadge}>
          <Ionicons name="flash" size={12} color="#0EA5E9" />
          <Text style={styles.etaText}>{pharmacy.eta_minutes} min</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.chip}>
          <Ionicons name="location-outline" size={12} color="#6B7280" />
          <Text style={styles.chipText}>{distanceKm} km</Text>
        </View>
        <View style={[styles.chip, pharmacy.is_open_now ? styles.openChip : styles.closedChip]}>
          <View style={[styles.dot, pharmacy.is_open_now ? styles.openDot : styles.closedDot]} />
          <Text style={[styles.chipText, pharmacy.is_open_now ? styles.openText : styles.closedText]}>
            {pharmacy.is_open_now ? 'Open Now' : 'Closed'}
          </Text>
        </View>
        {pharmacy.qty_available != null && (
          <View style={styles.chip}>
            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
            <Text style={[styles.chipText, { color: '#065F46' }]}>In Stock</Text>
          </View>
        )}
      </View>

      {pharmacy.selling_price_paise != null && (
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{(pharmacy.selling_price_paise / 100).toFixed(0)}</Text>
          {pharmacy.mrp_paise != null && pharmacy.mrp_paise > pharmacy.selling_price_paise && (
            <Text style={styles.mrp}>₹{(pharmacy.mrp_paise / 100).toFixed(0)}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  info: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  address: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  etaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  etaText: { fontSize: 12, fontWeight: '700', color: '#0EA5E9' },
  meta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F9FAFB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  openChip: { backgroundColor: '#ECFDF5' },
  closedChip: { backgroundColor: '#FEF2F2' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  openDot: { backgroundColor: '#10B981' },
  closedDot: { backgroundColor: '#EF4444' },
  chipText: { fontSize: 11, color: '#6B7280' },
  openText: { color: '#065F46' },
  closedText: { color: '#991B1B' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  price: { fontSize: 16, fontWeight: '700', color: '#0C4A6E' },
  mrp: { fontSize: 13, color: '#9CA3AF', textDecorationLine: 'line-through' },
});
