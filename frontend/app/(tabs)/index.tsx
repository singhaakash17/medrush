import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '@/api/orders';
import { useAuthStore } from '@/store/auth';
import { OrderCard } from '@/components/OrderCard';
import { SlaTimer } from '@/components/SlaTimer';

const QUICK_ACTIONS = [
  { icon: 'medical-outline' as const, label: 'Medicines', route: '/(tabs)/search', color: '#0EA5E9' },
  { icon: 'document-text-outline' as const, label: 'Upload Rx', route: '/rx/upload', color: '#10B981' },
  { icon: 'cart-outline' as const, label: 'Cart', route: '/cart', color: '#F59E0B' },
  { icon: 'receipt-outline' as const, label: 'Orders', route: '/(tabs)/orders', color: '#8B5CF6' },
];

export default function HomeScreen() {
  const router = useRouter();
  const principalId = useAuthStore((s) => s.principalId);

  const { data: orders, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
    enabled: !!principalId,
    refetchInterval: 30_000,
  });

  const activeOrders = orders?.filter((o) =>
    ['pending', 'confirmed', 'packed', 'dispatched'].includes(o.status)
  ) ?? [];
  const recentOrders = orders?.filter((o) => o.status === 'delivered').slice(0, 3) ?? [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.tagline}>MedRush</Text>
          <Text style={styles.subtitle}>Medicines in 15 minutes · Bengaluru</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="person-circle-outline" size={32} color="#0EA5E9" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/(tabs)/search')}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        <Text style={styles.searchText}>Search medicines, generics, salts…</Text>
        <View style={styles.rxBadge}>
          <Text style={styles.rxBadgeText}>Rx</Text>
        </View>
      </TouchableOpacity>

      {/* ETA Banner */}
      <View style={styles.etaBanner}>
        <View style={styles.etaIcon}>
          <Ionicons name="flash" size={20} color="#fff" />
        </View>
        <View style={styles.etaText}>
          <Text style={styles.etaTitle}>⚡ 12–15 min delivery</Text>
          <Text style={styles.etaSubtitle}>80+ pharmacies live in Bengaluru</Text>
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.actions}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={styles.actionCard}
            onPress={() => router.push(a.route as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${a.color}15` }]}>
              <Ionicons name={a.icon} size={24} color={a.color} />
            </View>
            <Text style={styles.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Active orders with SLA countdown */}
      {activeOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Orders</Text>
          {activeOrders.map((order) => (
            <View key={order.id}>
              <SlaTimer slaTargetAt={order.sla_target_at} status={order.status} />
              <OrderCard order={order} />
            </View>
          ))}
        </View>
      )}

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.label}
              style={styles.catCard}
              onPress={() => router.push({ pathname: '/(tabs)/search', params: { q: cat.query } })}
            >
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={styles.catLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Rx Vault CTA */}
      <TouchableOpacity style={styles.rxVault} onPress={() => router.push('/rx/vault')}>
        <Ionicons name="shield-checkmark-outline" size={28} color="#10B981" />
        <View style={styles.rxVaultText}>
          <Text style={styles.rxVaultTitle}>Rx Vault — Secure & Encrypted</Text>
          <Text style={styles.rxVaultSub}>Upload and store prescriptions safely for reuse</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#10B981" />
      </TouchableOpacity>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {recentOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </View>
      )}

      {/* MedRush Plus CTA */}
      <TouchableOpacity style={styles.plusCard} onPress={() => router.push('/subscription')}>
        <View style={styles.plusLeft}>
          <Text style={styles.plusTitle}>MedRush Plus ⚡</Text>
          <Text style={styles.plusSub}>Free delivery · Priority Rx · ₹99/month</Text>
        </View>
        <Text style={styles.plusCta}>Try Free</Text>
      </TouchableOpacity>

      {!isLoading && (!orders || orders.length === 0) && (
        <View style={styles.empty}>
          <Ionicons name="bag-outline" size={64} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>Your first order awaits</Text>
          <Text style={styles.emptyText}>Search for medicines or upload a prescription</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.emptyBtnText}>Browse Medicines</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const CATEGORIES = [
  { label: 'Diabetes', emoji: '💉', query: 'metformin' },
  { label: 'Heart', emoji: '❤️', query: 'atorvastatin' },
  { label: 'Fever', emoji: '🌡️', query: 'paracetamol' },
  { label: 'Antibiotics', emoji: '💊', query: 'amoxicillin' },
  { label: 'Vitamins', emoji: '🌿', query: 'vitamin' },
  { label: 'Eye Care', emoji: '👁️', query: 'eye drops' },
  { label: 'Skincare', emoji: '🧴', query: 'derma' },
];

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0F9FF' },
  content: { paddingBottom: 32 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  tagline: { fontSize: 22, fontWeight: '800', color: '#0C4A6E', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: '#0EA5E9', marginTop: 2 },
  profileBtn: { padding: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 13, gap: 10,
    shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  searchText: { flex: 1, fontSize: 14, color: '#9CA3AF' },
  rxBadge: { backgroundColor: '#10B981', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  rxBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  etaBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0C4A6E', borderRadius: 14, marginHorizontal: 16, marginBottom: 16,
    padding: 12, gap: 12,
  },
  etaIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#0EA5E9', alignItems: 'center', justifyContent: 'center',
  },
  etaText: { flex: 1 },
  etaTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  etaSubtitle: { color: '#BAE6FD', fontSize: 12, marginTop: 2 },
  actions: {
    flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 24,
  },
  actionCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#374151' },
  section: { marginHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0C4A6E', marginBottom: 12 },
  catScroll: { marginHorizontal: -4 },
  catCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', marginHorizontal: 4, minWidth: 72,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  catEmoji: { fontSize: 24, marginBottom: 6 },
  catLabel: { fontSize: 11, fontWeight: '600', color: '#374151' },
  rxVault: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', borderRadius: 14, marginHorizontal: 16,
    marginBottom: 24, padding: 16, gap: 12,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  rxVaultText: { flex: 1 },
  rxVaultTitle: { fontSize: 14, fontWeight: '700', color: '#065F46' },
  rxVaultSub: { fontSize: 12, color: '#059669', marginTop: 2 },
  plusCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0C4A6E', borderRadius: 14, marginHorizontal: 16,
    marginBottom: 24, padding: 16,
  },
  plusLeft: { flex: 1 },
  plusTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  plusSub: { color: '#BAE6FD', fontSize: 12, marginTop: 4 },
  plusCta: {
    backgroundColor: '#F59E0B', borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 8, color: '#fff', fontWeight: '700', fontSize: 13,
  },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  emptyBtn: {
    marginTop: 20, backgroundColor: '#0EA5E9', borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
