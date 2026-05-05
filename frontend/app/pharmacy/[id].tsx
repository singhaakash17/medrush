import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import type { Pharmacy } from '@/types';

async function fetchPharmacy(id: string): Promise<Pharmacy> {
  const { data } = await apiClient.get(`/pharmacies/${id}`);
  return data;
}

export default function PharmacyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: pharmacy, isLoading } = useQuery({
    queryKey: ['pharmacy', id],
    queryFn: () => fetchPharmacy(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0EA5E9" /></View>;
  }

  if (!pharmacy) {
    return <View style={styles.center}><Text style={styles.muted}>Pharmacy not found</Text></View>;
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="medical" size={32} color="#0EA5E9" />
        </View>
        <Text style={styles.name}>{pharmacy.name}</Text>
        <View style={[styles.badge, { backgroundColor: pharmacy.is_open_now ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={{ color: pharmacy.is_open_now ? '#16A34A' : '#DC2626', fontWeight: '700', fontSize: 13 }}>
            {pharmacy.is_open_now ? 'Open Now' : 'Closed'}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.card}>
        <InfoRow icon="location-outline" text={`${pharmacy.city}, ${pharmacy.state} — ${pharmacy.pincode}`} />
        <InfoRow icon="call-outline" text={pharmacy.phone} onPress={() => Linking.openURL(`tel:${pharmacy.phone}`)} />
        <InfoRow icon="document-outline" text={`DL: ${pharmacy.dl_number}`} />
        {pharmacy.gstin && <InfoRow icon="business-outline" text={`GSTIN: ${pharmacy.gstin}`} />}
      </View>
    </View>
  );
}

function InfoRow({ icon, text, onPress }: { icon: string; text: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.infoRow} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={20} color="#0EA5E9" />
      <Text style={[styles.infoText, onPress && styles.link]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { fontSize: 16, color: '#9CA3AF' },
  header: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 10 },
  badge: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoText: { fontSize: 14, color: '#374151', flex: 1 },
  link: { color: '#0EA5E9', textDecorationLine: 'underline' },
});
