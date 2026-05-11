import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { catalogApi } from '@/api/catalog';
import { Button } from '@/components/ui/Button';
import { formatPaise } from '@/lib/money';
import { useCartStore } from '@/store/cart';
import { MEDICINES, PHARMACIES } from '@/mock/data';

const SCHEDULE_INFO: Record<string, { label: string; color: string }> = {
  H: { label: 'Schedule H — Prescription required', color: '#F59E0B' },
  H1: { label: 'Schedule H1 — Strict prescription required', color: '#EF4444' },
  X: { label: 'Schedule X — Controlled substance', color: '#7C3AED' },
  OTC: { label: 'Over the counter', color: '#10B981' },
  GENERAL: { label: 'General medicine', color: '#10B981' },
  G: { label: 'General medicine', color: '#10B981' },
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

  // Fall back to local mock data when API returns 404 / null
  const mockMed = MEDICINES.find((m) => m.id === id);
  const medicine = apiMedicine ?? (mockMed ? {
    id: mockMed.id,
    brand_name: mockMed.brand_name,
    generic_name: mockMed.generic_name,
    form: mockMed.form,
    strength: mockMed.strength,
    mrp_paise: mockMed.mrp_paise,
    pack_size: mockMed.pack_size,
    pack_unit: mockMed.pack_unit,
    rx_required: mockMed.rx_required,
    schedule: mockMed.rx_required ? 'H' : 'OTC',
    is_discontinued: false,
    manufacturer_id: mockMed.manufacturer,
  } : null);

  const qtyInCart = cartItems.find((i) => i.medicine_id === id)?.qty ?? 0;
  const DEFAULT_PHARMACY = PHARMACIES[0];

  const handleAddToCart = () => {
    if (!medicine) return;
    addItem({
      medicine_id: medicine.id,
      medicine_name: medicine.brand_name,
      generic_name: medicine.generic_name,
      form: medicine.form,
      qty: 1,
      unit_price_paise: medicine.mrp_paise,
      mrp_paise: medicine.mrp_paise,
      rx_required: medicine.rx_required ?? false,
      pharmacy_id: DEFAULT_PHARMACY.pharmacy_id,
      pharmacy_name: DEFAULT_PHARMACY.name,
    });
    Alert.alert('Added to cart', `${medicine.brand_name} added to your cart.`);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (!medicine) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Medicine not found</Text>
      </View>
    );
  }

  const scheduleInfo = medicine.schedule ? SCHEDULE_INFO[medicine.schedule] : null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>{medicine.brand_name}</Text>
          <Text style={styles.generic}>{medicine.generic_name}</Text>
          <Text style={styles.form}>{medicine.form} · {medicine.pack_size} {medicine.pack_unit}</Text>
        </View>

        {/* Price */}
        <View style={styles.priceBox}>
          <Text style={styles.price}>{formatPaise(medicine.mrp_paise)}</Text>
          <Text style={styles.priceLabel}>MRP (incl. all taxes)</Text>
        </View>

        {/* Schedule badge */}
        {scheduleInfo && (
          <View style={[styles.scheduleBox, { backgroundColor: `${scheduleInfo.color}15` }]}>
            <Ionicons name="information-circle-outline" size={18} color={scheduleInfo.color} />
            <Text style={[styles.scheduleText, { color: scheduleInfo.color }]}>
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
          <View style={[styles.scheduleBox, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
            <Text style={[styles.scheduleText, { color: '#EF4444' }]}>This medicine is discontinued</Text>
          </View>
        )}

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Warnings & Precautions</Text>
            {warnings.map((w) => (
              <View key={w.id} style={styles.warningRow}>
                <Ionicons
                  name="warning-outline"
                  size={16}
                  color={w.severity === 'critical' ? '#EF4444' : '#F59E0B'}
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
            title={qtyInCart > 0
              ? `In Cart (${qtyInCart}) — Add More`
              : (medicine.rx_required ? 'Upload Rx & Add to Cart' : 'Add to Cart')}
            onPress={handleAddToCart}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6B7280' },
  content: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 20 },
  brand: { fontSize: 24, fontWeight: '800', color: '#111827' },
  generic: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  form: { fontSize: 14, color: '#9CA3AF', marginTop: 6 },
  priceBox: {
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
  price: { fontSize: 28, fontWeight: '800', color: '#111827' },
  priceLabel: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  scheduleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  scheduleText: { fontSize: 13, fontWeight: '600', flex: 1 },
  rxBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    marginBottom: 10,
  },
  rxText: { fontSize: 13, color: '#D97706', flex: 1, lineHeight: 18 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  warningRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  warningText: { fontSize: 14, color: '#374151', flex: 1, lineHeight: 20 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
});
