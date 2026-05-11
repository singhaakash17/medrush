import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '@/api/orders';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { OrderCard } from '@/components/OrderCard';
import { SlaTimer } from '@/components/SlaTimer';
import {
  PHARMACIES,
  MEDICINES,
  type MockPharmacy,
  type MockMedicine,
} from '@/mock/data';

// ─── Constants ─────────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: 'medical-outline' as const, label: 'Medicines', route: '/(tabs)/search', color: '#0EA5E9' },
  { icon: 'document-text-outline' as const, label: 'Upload Rx', route: '/rx/upload', color: '#10B981' },
  { icon: 'cart-outline' as const, label: 'Cart', route: '/(tabs)/cart', color: '#F59E0B' },
  { icon: 'receipt-outline' as const, label: 'Orders', route: '/(tabs)/orders', color: '#8B5CF6' },
];

const CATEGORY_FILTERS = [
  { label: 'Fever & Pain', emoji: '🌡️', query: 'paracetamol' },
  { label: 'Antibiotics', emoji: '💊', query: 'antibiotic' },
  { label: 'Diabetes', emoji: '💉', query: 'metformin' },
  { label: 'Cardiac', emoji: '❤️', query: 'cardiac' },
  { label: 'Vitamins', emoji: '🌿', query: 'vitamin' },
  { label: 'Topical', emoji: '🧴', query: 'topical' },
  { label: 'Allergy', emoji: '🤧', query: 'allergy' },
  { label: 'Eye Care', emoji: '👁️', query: 'eye' },
];

// Top 4 nearby pharmacies sorted by distance
const NEARBY_PHARMACIES = [...PHARMACIES]
  .sort((a, b) => a.distance_m - b.distance_m)
  .slice(0, 4);

// 6 popular medicines for the home screen
const POPULAR_MEDICINE_IDS = ['med_001', 'med_007', 'med_013', 'med_028', 'med_032', 'med_019'];
const POPULAR_MEDICINES = MEDICINES.filter((m) => POPULAR_MEDICINE_IDS.includes(m.id));

// ─── Sub-components ────────────────────────────────────────────────────────────

function PharmacyCard({ pharmacy }: { pharmacy: MockPharmacy }) {
  const router = useRouter();
  const distanceLabel =
    pharmacy.distance_m < 1000
      ? `${pharmacy.distance_m}m`
      : `${(pharmacy.distance_m / 1000).toFixed(1)}km`;

  return (
    <TouchableOpacity
      style={styles.pharmacyCard}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/pharmacy/[id]' as any, params: { id: pharmacy.id } })}
    >
      <View style={styles.pharmacyCardHeader}>
        <View
          style={[
            styles.openBadge,
            { backgroundColor: pharmacy.is_open_now ? '#D1FAE5' : '#FEE2E2' },
          ]}
        >
          <View
            style={[
              styles.openDot,
              { backgroundColor: pharmacy.is_open_now ? '#10B981' : '#EF4444' },
            ]}
          />
          <Text
            style={[
              styles.openBadgeText,
              { color: pharmacy.is_open_now ? '#065F46' : '#991B1B' },
            ]}
          >
            {pharmacy.is_open_now ? 'Open' : 'Closed'}
          </Text>
        </View>
      </View>
      <Text style={styles.pharmacyName} numberOfLines={2}>
        {pharmacy.name}
      </Text>
      <Text style={styles.pharmacyArea}>{pharmacy.area}</Text>
      <View style={styles.pharmacyMeta}>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.ratingText}>{pharmacy.rating.toFixed(1)}</Text>
        </View>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.distanceText}>{distanceLabel}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Ionicons name="flash" size={12} color="#0EA5E9" />
        <Text style={styles.etaText}>{pharmacy.eta_minutes} min</Text>
      </View>
    </TouchableOpacity>
  );
}

function MedicineCard({ medicine }: { medicine: MockMedicine }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const qty = items.find((i) => i.medicine_id === medicine.id)?.qty ?? 0;
  const priceRupees = (medicine.mrp_paise / 100).toFixed(0);
  const DEFAULT_PHARMACY = PHARMACIES[0];

  const handleAdd = () => {
    addItem({
      medicine_id: medicine.id,
      medicine_name: medicine.brand_name,
      generic_name: medicine.generic_name,
      form: medicine.form,
      unit_price_paise: Math.round(medicine.mrp_paise * 0.85),
      mrp_paise: medicine.mrp_paise,
      rx_required: medicine.rx_required,
      pharmacy_id: DEFAULT_PHARMACY.id,
      pharmacy_name: DEFAULT_PHARMACY.name,
    });
  };

  return (
    <TouchableOpacity
      style={styles.medicineCard}
      activeOpacity={0.8}
      onPress={() =>
        router.push({ pathname: '/medicine/[id]' as any, params: { id: medicine.id } })
      }
    >
      <View style={styles.medicineIconBox}>
        <Ionicons name="medical" size={24} color="#0EA5E9" />
      </View>
      <Text style={styles.medicineBrand} numberOfLines={1}>{medicine.brand_name}</Text>
      <Text style={styles.medicineGeneric} numberOfLines={1}>{medicine.generic_name}</Text>
      <Text style={styles.medicineForm}>{medicine.form} · {medicine.strength}</Text>
      <Text style={styles.medicinePrice}>₹{priceRupees}</Text>
      {qty === 0 ? (
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={handleAdd}>
          <Ionicons name="add" size={16} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => useCartStore.getState().updateQty(medicine.id, qty - 1)}>
            <Ionicons name="remove" size={14} color="#0EA5E9" />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{qty}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={handleAdd}>
            <Ionicons name="add" size={14} color="#0EA5E9" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const principalId = useAuthStore((s) => s.principalId);

  const {
    data: orders,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
    enabled: !!principalId,
    refetchInterval: 30_000,
    // Fall back gracefully — real API may not be available
    retry: 1,
  });

  const activeOrders =
    orders?.filter((o) =>
      ['pending', 'confirmed', 'packed', 'dispatched'].includes(o.status),
    ) ?? [];

  const recentOrders = orders?.filter((o) => o.status === 'delivered').slice(0, 3) ?? [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={18} color="#0EA5E9" />
          <View>
            <Text style={styles.locationLabel}>Deliver to</Text>
            <Text style={styles.locationValue}>Indiranagar, Bengaluru</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color="#6B7280" />
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="person-circle-outline" size={32} color="#0EA5E9" />
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/(tabs)/search')}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        <Text style={styles.searchText}>Search medicines, generics, salts…</Text>
        <View style={styles.rxBadge}>
          <Text style={styles.rxBadgeText}>Rx</Text>
        </View>
      </TouchableOpacity>

      {/* ── ETA Banner ── */}
      <View style={styles.etaBanner}>
        <View style={styles.etaIconBox}>
          <Ionicons name="flash" size={22} color="#fff" />
        </View>
        <View style={styles.etaContent}>
          <Text style={styles.etaTitle}>Medicines in 15 min</Text>
          <Text style={styles.etaSubtitle}>80+ pharmacies live in Bengaluru</Text>
        </View>
        <View style={styles.etaTimePill}>
          <Text style={styles.etaTimeText}>⚡ 15 min</Text>
        </View>
      </View>

      {/* ── Quick actions ── */}
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

      {/* ── Category quick filters ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORY_FILTERS.map((cat) => (
            <TouchableOpacity
              key={cat.label}
              style={styles.categoryPill}
              onPress={() =>
                router.push({ pathname: '/(tabs)/search', params: { q: cat.query } })
              }
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Active orders ── */}
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

      {/* ── Nearby Pharmacies ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Pharmacies</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search' as any)}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {NEARBY_PHARMACIES.map((pharmacy) => (
            <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
          ))}
        </ScrollView>
      </View>

      {/* ── Popular Medicines ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Medicines</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {POPULAR_MEDICINES.map((medicine) => (
            <MedicineCard key={medicine.id} medicine={medicine} />
          ))}
        </ScrollView>
      </View>

      {/* ── Rx Vault CTA ── */}
      <TouchableOpacity style={styles.rxVault} onPress={() => router.push('/rx/vault' as any)}>
        <Ionicons name="shield-checkmark-outline" size={28} color="#10B981" />
        <View style={styles.rxVaultText}>
          <Text style={styles.rxVaultTitle}>Rx Vault — Secure & Encrypted</Text>
          <Text style={styles.rxVaultSub}>Upload and store prescriptions safely for reuse</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#10B981" />
      </TouchableOpacity>

      {/* ── Recent orders ── */}
      {recentOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {recentOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </View>
      )}

      {/* ── MedRush Plus CTA ── */}
      <TouchableOpacity
        style={styles.plusCard}
        onPress={() => router.push('/subscription' as any)}
      >
        <View style={styles.plusLeft}>
          <Text style={styles.plusTitle}>MedRush Plus ⚡</Text>
          <Text style={styles.plusSub}>Free delivery · Priority Rx · ₹99/month</Text>
        </View>
        <Text style={styles.plusCta}>Try Free</Text>
      </TouchableOpacity>

      {/* ── Empty state (only when API returned nothing and not loading) ── */}
      {!isLoading && (!orders || orders.length === 0) && (
        <View style={styles.empty}>
          <Ionicons name="bag-outline" size={64} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>Your first order awaits</Text>
          <Text style={styles.emptyText}>Search for medicines or upload a prescription</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Text style={styles.emptyBtnText}>Browse Medicines</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationLabel: { fontSize: 11, color: '#9CA3AF' },
  locationValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  profileBtn: { padding: 4 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchText: { flex: 1, fontSize: 14, color: '#9CA3AF' },
  rxBadge: { backgroundColor: '#10B981', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  rxBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // ETA Banner
  etaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    gap: 12,
  },
  etaIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaContent: { flex: 1 },
  etaTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  etaSubtitle: { color: '#BAE6FD', fontSize: 12, marginTop: 2 },
  etaTimePill: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  etaTimeText: { fontSize: 12, fontWeight: '800', color: '#0EA5E9' },

  // Quick actions
  actions: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 24 },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#374151' },

  // Sections
  section: { marginHorizontal: 16, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  seeAllText: { fontSize: 13, fontWeight: '600', color: '#0EA5E9' },

  // Category pills
  categoryScroll: { gap: 8, paddingRight: 4 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },

  // Horizontal scroll container
  horizontalScroll: { gap: 12, paddingRight: 4 },

  // Pharmacy card
  pharmacyCard: {
    width: 180,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  pharmacyCardHeader: { marginBottom: 8 },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openBadgeText: { fontSize: 11, fontWeight: '600' },
  pharmacyName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  pharmacyArea: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  pharmacyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  metaDot: { fontSize: 12, color: '#D1D5DB' },
  distanceText: { fontSize: 12, color: '#6B7280' },
  etaText: { fontSize: 12, color: '#0EA5E9', fontWeight: '600' },

  // Medicine card
  medicineCard: {
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  medicineIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  medicineBrand: { fontSize: 14, fontWeight: '700', color: '#111827' },
  medicineGeneric: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  medicineForm: { fontSize: 11, color: '#9CA3AF', marginTop: 2, marginBottom: 8 },
  medicinePrice: { fontSize: 15, fontWeight: '800', color: '#0EA5E9' },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtn: { padding: 4 },
  qtyText: { fontSize: 14, fontWeight: '700', color: '#0EA5E9', minWidth: 20, textAlign: 'center' },
  addBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Rx Vault
  rxVault: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rxVaultText: { flex: 1 },
  rxVaultTitle: { fontSize: 14, fontWeight: '700', color: '#065F46' },
  rxVaultSub: { fontSize: 12, color: '#059669', marginTop: 2 },

  // MedRush Plus card
  plusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0C4A6E',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
  },
  plusLeft: { flex: 1 },
  plusTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  plusSub: { color: '#BAE6FD', fontSize: 12, marginTop: 4 },
  plusCta: {
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    overflow: 'hidden',
  },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  emptyBtn: {
    marginTop: 20,
    backgroundColor: '#0EA5E9',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
