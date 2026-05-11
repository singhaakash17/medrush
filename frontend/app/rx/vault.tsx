import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { rxApi } from '@/api/rx';
import type { Prescription } from '@/types';

function RxCard({ rx }: { rx: Prescription }) {
  const router = useRouter();
  const date = new Date(rx.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/rx/[id]', params: { id: rx.id } })}
    >
      <View style={styles.cardIcon}>
        <Ionicons name="document-text" size={28} color="#0EA5E9" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>
          {rx.doctor_name ?? 'Prescription'}
        </Text>
        <Text style={styles.cardSub}>{rx.hospital_name ?? 'Uploaded'} · {date}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.ocrBadge, rx.ocr_status === 'done' && styles.doneBadge]}>
            <Text style={[styles.ocrText, rx.ocr_status === 'done' && styles.doneText]}>
              {rx.ocr_status === 'done' ? '✓ Scanned' : 'Processing'}
            </Text>
          </View>
          {rx.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#065F46" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function RxVaultScreen() {
  const router = useRouter();
  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: rxApi.list,
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0C4A6E" />
        </TouchableOpacity>
        <Text style={styles.title}>Rx Vault</Text>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => router.push('/rx/upload')}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBar}>
        <Ionicons name="lock-closed-outline" size={16} color="#6B7280" />
        <Text style={styles.infoText}>
          All prescriptions are encrypted with AES-256 and retained for 5 years per CDSCO guidelines.
        </Text>
      </View>

      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#0EA5E9" />
        </View>
      )}

      <FlatList
        data={prescriptions ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RxCard rx={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={64} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No prescriptions yet</Text>
              <Text style={styles.emptyText}>Upload your first Rx to get started</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/rx/upload')}>
                <Text style={styles.emptyBtnText}>Upload Prescription</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#0C4A6E' },
  uploadBtn: {
    backgroundColor: '#0EA5E9', borderRadius: 10, width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  infoBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F3F4F6', borderRadius: 10, marginHorizontal: 16,
    marginBottom: 12, padding: 10,
  },
  infoText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardIcon: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  ocrBadge: {
    backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  doneBadge: { backgroundColor: '#ECFDF5' },
  ocrText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  doneText: { color: '#065F46' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  verifiedText: { fontSize: 11, fontWeight: '600', color: '#065F46' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  emptyBtn: {
    marginTop: 20, backgroundColor: '#0EA5E9', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
