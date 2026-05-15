import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { ordersApi } from '@/api/orders';
import { geoApi } from '@/api/geo';
import { catalogApi } from '@/api/catalog';
import { useAuthStore } from '@/store/auth';
import { OrderCard } from '@/components/OrderCard';
import { SlaTimer } from '@/components/SlaTimer';
import { T } from '@/theme';
import type { NearbyPharmacy, Medicine } from '@/types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: 'medical-outline' as const, label: 'Medicines', route: '/(tabs)/search', color: T.Colors.navyMid },
  { icon: 'document-text-outline' as const, label: 'Upload Rx', route: '/rx/upload', color: T.Colors.emerald },
  { icon: 'cart-outline' as const, label: 'Cart', route: '/(tabs)/cart', color: T.Colors.amber },
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

// Popular search terms — one result each gives the home screen its "Popular Medicines" row
const POPULAR_QUERIES = ['dolo', 'azithromycin', 'pantoprazole', 'cetirizine', 'shelcal', 'metformin'];

// ─── Sub-components ────────────────────────────────────────────────────────────

function PharmacyCard({ pharmacy }: { pharmacy: NearbyPharmacy }) {
  const router = useRouter();
  const distanceLabel =
    pharmacy.distance_m < 1000
      ? `${pharmacy.distance_m}m`
      : `${(pharmacy.distance_m / 1000).toFixed(1)}km`;

  return (
    <TouchableOpacity
      style={styles.pharmacyCard}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/pharmacy/[id]' as any, params: { id: pharmacy.pharmacy_id } })}
    >
      <View style={styles.pharmacyCardHeader}>
        <View
          style={[
            styles.openBadge,
            { backgroundColor: pharmacy.is_open_now ? T.Colors.emeraldLight : T.Colors.crimsonLight },
          ]}
        >
          <View
            style={[
              styles.openDot,
              { backgroundColor: pharmacy.is_open_now ? T.Colors.emerald : T.Colors.crimson },
            ]}
          />
          <Text
            style={[
              styles.openBadgeText,
              { color: pharmacy.is_open_now ? T.Colors.emeraldDark : '#991B1B' },
            ]}
          >
            {pharmacy.is_open_now ? 'Open' : 'Closed'}
          </Text>
        </View>
      </View>
      <Text style={styles.pharmacyName} numberOfLines={2}>
        {pharmacy.name}
      </Text>
      <Text style={styles.pharmacyArea} numberOfLines={1}>{pharmacy.address_line1}</Text>
      <View style={styles.pharmacyMeta}>
        <Ionicons name="location-outline" size={12} color={T.Colors.textTertiary} />
        <Text style={styles.distanceText}>{distanceLabel}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Ionicons name="flash" size={12} color={T.Colors.navyMid} />
        <Text style={styles.etaText}>{pharmacy.eta_minutes} min</Text>
      </View>
    </TouchableOpacity>
  );
}

function MedicineCard({ medicine }: { medicine: Medicine }) {
  const router = useRouter();
  const priceRupees = (medicine.mrp_paise / 100).toFixed(0);

  return (
    <TouchableOpacity
      style={styles.medicineCard}
      activeOpacity={0.8}
      onPress={() =>
        router.push({ pathname: '/medicine/[id]' as any, params: { id: medicine.id } })
      }
    >
      <View style={styles.medicineIconBox}>
        <Ionicons name="medical" size={24} color={T.Colors.navyMid} />
      </View>
      <Text style={styles.medicineBrand} numberOfLines={1}>{medicine.brand_name}</Text>
      <Text style={styles.medicineGeneric} numberOfLines={1}>{medicine.generic_name}</Text>
      <Text style={styles.medicineForm}>{medicine.form}{medicine.strength ? ` · ${medicine.strength}` : ''}</Text>
      <Text style={styles.medicinePrice}>₹{priceRupees}</Text>
      <TouchableOpacity
        style={styles.addBtn}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/medicine/[id]' as any, params: { id: medicine.id } })}
      >
        <Ionicons name="chevron-forward" size={16} color={T.Colors.textInverse} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

const BENGALURU_DEFAULT = { lat: 12.9784, lon: 77.6408 };

export default function HomeScreen() {
  const router = useRouter();
  const principalId = useAuthStore((s) => s.principalId);

  // ── Location ──────────────────────────────────────────────────────────────
  const [userLat, setUserLat] = useState(BENGALURU_DEFAULT.lat);
  const [userLon, setUserLon] = useState(BENGALURU_DEFAULT.lon);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLat(loc.coords.latitude);
          setUserLon(loc.coords.longitude);
        }
      } catch {
        // fall back to Bengaluru default
      }
    })();
  }, []);

  // ── Queries ───────────────────────────────────────────────────────────────
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
    retry: 1,
  });

  const { data: nearbyPharmacies, isLoading: pharmsLoading } = useQuery({
    queryKey: ['nearby-home', userLat, userLon],
    queryFn: () => geoApi.nearbyPharmacies({ lat: userLat, lon: userLon, radius_m: 5000 }),
    staleTime: 60_000,
  });

  const { data: popularMedicines, isLoading: medsLoading } = useQuery({
    queryKey: ['popular-medicines'],
    queryFn: async () => {
      const results = await Promise.all(
        POPULAR_QUERIES.map((q) => catalogApi.search(q).then((r) => r[0] ?? null).catch(() => null)),
      );
      return results.filter(Boolean) as Medicine[];
    },
    staleTime: 5 * 60_000,
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
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.Colors.navyMid} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={18} color={T.Colors.navyMid} />
          <View>
            <Text style={styles.locationLabel}>Deliver to</Text>
            <Text style={styles.locationValue}>Indiranagar, Bengaluru</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={T.Colors.textSecondary} />
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="person-circle-outline" size={34} color={T.Colors.navyMid} />
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/(tabs)/search')}>
        <Ionicons name="search-outline" size={20} color={T.Colors.textTertiary} />
        <Text style={styles.searchText}>Search medicines, generics, salts…</Text>
        <View style={styles.rxBadge}>
          <Text style={styles.rxBadgeText}>Rx</Text>
        </View>
      </TouchableOpacity>

      {/* ── ETA Banner ── */}
      <View style={styles.etaBanner}>
        <View style={styles.etaIconBox}>
          <Ionicons name="flash" size={22} color={T.Colors.textInverse} />
        </View>
        <View style={styles.etaContent}>
          <Text style={styles.etaTitle}>Medicines in 15 min</Text>
          <Text style={styles.etaSubtitle}>28 pharmacies live in Bengaluru</Text>
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
            <View style={[styles.actionIcon, { backgroundColor: `${a.color}18` }]}>
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
        {pharmsLoading ? (
          <ActivityIndicator color={T.Colors.navyMid} style={{ marginTop: 16 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {(nearbyPharmacies ?? []).slice(0, 5).map((pharmacy) => (
              <PharmacyCard key={pharmacy.pharmacy_id} pharmacy={pharmacy} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Popular Medicines ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Medicines</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        {medsLoading ? (
          <ActivityIndicator color={T.Colors.navyMid} style={{ marginTop: 16 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {(popularMedicines ?? []).map((medicine) => (
              <MedicineCard key={medicine.id} medicine={medicine} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Rx Vault CTA ── */}
      <TouchableOpacity style={styles.rxVault} onPress={() => router.push('/rx/vault' as any)}>
        <Ionicons name="shield-checkmark-outline" size={28} color={T.Colors.emerald} />
        <View style={styles.rxVaultText}>
          <Text style={styles.rxVaultTitle}>Rx Vault — Secure & Encrypted</Text>
          <Text style={styles.rxVaultSub}>Upload and store prescriptions safely for reuse</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={T.Colors.emerald} />
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

      {/* ── Empty state ── */}
      {!isLoading && (!orders || orders.length === 0) && (
        <View style={styles.empty}>
          <Ionicons name="bag-outline" size={64} color={T.Colors.border} />
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
  screen: { flex: 1, backgroundColor: T.Colors.surface },
  content: { paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: T.Spacing.lg,
    paddingTop: T.Spacing.lg,
    paddingBottom: T.Spacing.sm,
    backgroundColor: T.Colors.white,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationLabel: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary },
  locationValue: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  profileBtn: { padding: 4 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.lg,
    marginHorizontal: T.Spacing.lg,
    marginTop: T.Spacing.md,
    marginBottom: T.Spacing.md,
    paddingHorizontal: T.Spacing.md,
    paddingVertical: 13,
    gap: 10,
    ...T.Shadow.cardMd,
  },
  searchText: { flex: 1, fontSize: T.FontSize.base, color: T.Colors.textTertiary },
  rxBadge: {
    backgroundColor: T.Colors.emerald,
    borderRadius: T.Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rxBadgeText: { fontSize: T.FontSize['2xs'], fontWeight: T.FontWeight.black, color: T.Colors.textInverse },

  etaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.Colors.navy,
    borderRadius: T.Radius.lg,
    marginHorizontal: T.Spacing.lg,
    marginBottom: T.Spacing.lg,
    padding: T.Spacing.md,
    gap: T.Spacing.md,
  },
  etaIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaContent: { flex: 1 },
  etaTitle: { color: T.Colors.textInverse, fontWeight: T.FontWeight.black, fontSize: T.FontSize.md },
  etaSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: T.FontSize.xs, marginTop: 2 },
  etaTimePill: {
    backgroundColor: T.Colors.emerald,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  etaTimeText: { fontSize: T.FontSize.xs, fontWeight: T.FontWeight.black, color: T.Colors.textInverse },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: T.Spacing.lg,
    marginBottom: T.Spacing['2xl'],
  },
  actionCard: {
    flex: 1,
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.md,
    padding: T.Spacing.md,
    alignItems: 'center',
    gap: 6,
    ...T.Shadow.card,
  },
  actionIcon: { width: 44, height: 44, borderRadius: T.Radius.md, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: T.FontSize.xs, fontWeight: T.FontWeight.semibold, color: T.Colors.textSecondary },

  section: { marginHorizontal: T.Spacing.lg, marginBottom: T.Spacing['2xl'] },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: T.Spacing.md,
  },
  sectionTitle: { fontSize: T.FontSize.lg, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  seeAllText: { fontSize: T.FontSize.sm, fontWeight: T.FontWeight.semibold, color: T.Colors.navyMid },

  categoryScroll: { gap: 8, paddingRight: 4 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.Colors.white,
    paddingHorizontal: T.Spacing.md,
    paddingVertical: T.Spacing.sm,
    borderRadius: T.Radius.full,
    ...T.Shadow.card,
  },
  categoryEmoji: { fontSize: T.FontSize.lg },
  categoryLabel: { fontSize: T.FontSize.sm, fontWeight: T.FontWeight.semibold, color: T.Colors.textSecondary },

  horizontalScroll: { gap: 12, paddingRight: 4 },

  pharmacyCard: {
    width: 182,
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.lg,
    padding: T.Spacing.md,
    ...T.Shadow.cardMd,
  },
  pharmacyCardHeader: { marginBottom: 8 },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: T.Radius.full,
  },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openBadgeText: { fontSize: T.FontSize.xs, fontWeight: T.FontWeight.semibold },
  pharmacyName: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary, marginBottom: 2 },
  pharmacyArea: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary, marginBottom: 8 },
  pharmacyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: T.FontSize.xs, fontWeight: T.FontWeight.semibold, color: T.Colors.textSecondary },
  metaDot: { fontSize: T.FontSize.xs, color: T.Colors.border },
  distanceText: { fontSize: T.FontSize.xs, color: T.Colors.textSecondary },
  etaText: { fontSize: T.FontSize.xs, color: T.Colors.navyMid, fontWeight: T.FontWeight.semibold },

  medicineCard: {
    width: 152,
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.lg,
    padding: T.Spacing.md,
    ...T.Shadow.cardMd,
  },
  medicineIconBox: {
    width: 44,
    height: 44,
    borderRadius: T.Radius.md,
    backgroundColor: T.Colors.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  medicineBrand: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  medicineGeneric: { fontSize: T.FontSize.xs, color: T.Colors.textSecondary, marginTop: 2 },
  medicineForm: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary, marginTop: 2, marginBottom: 8 },
  medicinePrice: { fontSize: T.FontSize.md, fontWeight: T.FontWeight.black, color: T.Colors.navyMid },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.Colors.navyLight,
    borderRadius: T.Radius.sm,
    marginTop: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtn: { padding: 4 },
  qtyText: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.bold, color: T.Colors.navyMid, minWidth: 20, textAlign: 'center' },
  addBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: T.Radius.sm,
    backgroundColor: T.Colors.navyMid,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rxVault: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.Colors.emeraldLight,
    borderRadius: T.Radius.lg,
    marginHorizontal: T.Spacing.lg,
    marginBottom: T.Spacing['2xl'],
    padding: T.Spacing.lg,
    gap: T.Spacing.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rxVaultText: { flex: 1 },
  rxVaultTitle: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.bold, color: T.Colors.emeraldDark },
  rxVaultSub: { fontSize: T.FontSize.xs, color: T.Colors.emerald, marginTop: 2 },

  plusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.Colors.navy,
    borderRadius: T.Radius.lg,
    marginHorizontal: T.Spacing.lg,
    marginBottom: T.Spacing['2xl'],
    padding: T.Spacing.lg,
  },
  plusLeft: { flex: 1 },
  plusTitle: { color: T.Colors.textInverse, fontWeight: T.FontWeight.black, fontSize: T.FontSize.md },
  plusSub: { color: 'rgba(255,255,255,0.5)', fontSize: T.FontSize.xs, marginTop: 4 },
  plusCta: {
    backgroundColor: T.Colors.amber,
    borderRadius: T.Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: T.Colors.textInverse,
    fontWeight: T.FontWeight.bold,
    fontSize: T.FontSize.sm,
    overflow: 'hidden',
  },

  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  emptyTitle: { fontSize: T.FontSize.xl, fontWeight: T.FontWeight.bold, color: T.Colors.textSecondary, marginTop: 16 },
  emptyText: { fontSize: T.FontSize.base, color: T.Colors.textTertiary, marginTop: 8, textAlign: 'center' },
  emptyBtn: {
    marginTop: 20,
    backgroundColor: T.Colors.navyMid,
    borderRadius: T.Radius.md,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyBtnText: { color: T.Colors.textInverse, fontWeight: T.FontWeight.bold, fontSize: T.FontSize.md },
});
