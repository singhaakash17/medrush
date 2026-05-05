import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatPaise } from '@/lib/money';
import type { CartItem } from '@/types';

interface Props { item: CartItem; medicineName?: string }

export function CartItemRow({ item, medicineName }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{medicineName ?? item.medicine_id}</Text>
        <Text style={styles.unit}>{formatPaise(item.unit_price_paise)} × {item.qty}</Text>
      </View>
      <Text style={styles.total}>{formatPaise(item.unit_price_paise * item.qty)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  unit: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  total: { fontSize: 15, fontWeight: '700', color: '#111827' },
});
