import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { formatPaise, discountPercent } from '@/lib/money';
import type { Medicine } from '@/types';

interface Props {
  medicine: Medicine;
  inventoryPaise?: number;
  discountBps?: number;
}

export function MedicineCard({ medicine, inventoryPaise, discountBps }: Props) {
  const router = useRouter();
  const price = inventoryPaise ?? medicine.mrp_paise;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/medicine/${medicine.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.info}>
        <Text style={styles.brand} numberOfLines={1}>{medicine.brand_name}</Text>
        <Text style={styles.generic} numberOfLines={1}>{medicine.generic_name}</Text>
        <Text style={styles.form}>{medicine.form} · {medicine.pack_size} {medicine.pack_unit}</Text>
        {medicine.rx_required && (
          <View style={styles.rxBadge}>
            <Text style={styles.rxText}>Rx Required</Text>
          </View>
        )}
      </View>
      <View style={styles.pricing}>
        <Text style={styles.price}>{formatPaise(price)}</Text>
        {discountBps && discountBps > 0 && (
          <>
            <Text style={styles.mrp}>{formatPaise(medicine.mrp_paise)}</Text>
            <Text style={styles.discount}>{discountPercent(discountBps)}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  info: { flex: 1, marginRight: 12 },
  brand: { fontSize: 15, fontWeight: '700', color: '#111827' },
  generic: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  form: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  rxBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rxText: { fontSize: 11, color: '#D97706', fontWeight: '600' },
  pricing: { alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '700', color: '#111827' },
  mrp: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through', marginTop: 2 },
  discount: { fontSize: 12, color: '#10B981', fontWeight: '600' },
});
