import React, { useState } from 'react';
import {
  View, FlatList, ActivityIndicator,
  Text, StyleSheet, TextInput, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/api/catalog';
import { geoApi } from '@/api/geo';
import { MedicineCard } from '@/components/MedicineCard';
import { NearbyPharmacyCard } from '@/components/NearbyPharmacyCard';
import { T } from '@/theme';
import { Platform } from 'react-native';

type Tab = 'medicines' | 'pharmacies';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('medicines');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const router = useRouter();

  const BENGALURU_DEFAULT = { lat: 12.9784, lon: 77.6408 };

  React.useEffect(() => {
    // Always set Bengaluru default first
    setUserLat(BENGALURU_DEFAULT.lat);
    setUserLon(BENGALURU_DEFAULT.lon);

    // expo-location is native-only; skip GPS on web
    if (Platform.OS === 'web') return;

    (async () => {
      try {
        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLat(loc.coords.latitude);
          setUserLon(loc.coords.longitude);
        }
      } catch {
        // Keep Bengaluru default
      }
    })();
  }, []);

  const { data: medicines, isFetching: medFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: () => catalogApi.search(query),
    enabled: query.trim().length >= 2 && tab === 'medicines',
    staleTime: 30_000,
  });

  const { data: nearbyPharmacies, isFetching: geoFetching } = useQuery({
    queryKey: ['nearby', userLat, userLon, query],
    queryFn: () => geoApi.nearbyPharmacies({
      lat: userLat!,
      lon: userLon!,
      medicine_id: undefined,
    }),
    enabled: tab === 'pharmacies' && !!userLat && !!userLon,
    staleTime: 60_000,
  });

  const isFetching = tab === 'medicines' ? medFetching : geoFetching;

  return (
    <View style={styles.screen}>
      {/* Search Box */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={T.Colors.textTertiary} />
        <TextInput
          style={styles.input}
          placeholder={tab === 'medicines' ? 'Brand, generic, salt name…' : 'Find pharmacies near you'}
          placeholderTextColor={T.Colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus
          clearButtonMode="while-editing"
        />
        {isFetching && <ActivityIndicator size="small" color={T.Colors.navyMid} />}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'medicines' && styles.tabActive]}
          onPress={() => setTab('medicines')}
        >
          <Ionicons name="medical-outline" size={16} color={tab === 'medicines' ? T.Colors.textInverse : T.Colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'medicines' && styles.tabTextActive]}>Medicines</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'pharmacies' && styles.tabActive]}
          onPress={() => setTab('pharmacies')}
        >
          <Ionicons name="storefront-outline" size={16} color={tab === 'pharmacies' ? T.Colors.textInverse : T.Colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'pharmacies' && styles.tabTextActive]}>Pharmacies</Text>
        </TouchableOpacity>
      </View>

      {/* Rx Upload shortcut */}
      <TouchableOpacity style={styles.rxShortcut} onPress={() => router.push('/rx/upload')}>
        <Ionicons name="scan-outline" size={18} color={T.Colors.emerald} />
        <Text style={styles.rxShortcutText}>Upload Prescription (Rx) for quick checkout</Text>
        <Ionicons name="chevron-forward" size={16} color={T.Colors.emerald} />
      </TouchableOpacity>

      {/* Medicines list */}
      {tab === 'medicines' && (
        <>
          {query.trim().length < 2 && (
            <View style={styles.hint}>
              <Ionicons name="search-circle-outline" size={64} color={T.Colors.border} />
              <Text style={styles.hintText}>Type at least 2 characters to search medicines</Text>
              <Text style={styles.hintSub}>Supports brand name, generic, and salt search</Text>
            </View>
          )}
          {query.trim().length >= 2 && !medFetching && medicines?.length === 0 && (
            <View style={styles.hint}>
              <Ionicons name="alert-circle-outline" size={64} color={T.Colors.border} />
              <Text style={styles.hintText}>No medicines found for "{query}"</Text>
              <TouchableOpacity style={styles.hintBtn} onPress={() => router.push('/rx/upload')}>
                <Text style={styles.hintBtnText}>Upload Prescription instead</Text>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            data={medicines ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MedicineCard medicine={item} />}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
          />
        </>
      )}

      {/* Pharmacies list */}
      {tab === 'pharmacies' && (
        <>
          {!userLat && (
            <View style={styles.hint}>
              <Ionicons name="location-outline" size={64} color={T.Colors.border} />
              <Text style={styles.hintText}>Allow location access to see nearby pharmacies</Text>
            </View>
          )}
          <FlatList
            data={nearbyPharmacies ?? []}
            keyExtractor={(item) => item.pharmacy_id}
            renderItem={({ item }) => <NearbyPharmacyCard pharmacy={item} />}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.Colors.surface },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.Colors.white,
    margin: T.Spacing.lg,
    borderRadius: T.Radius.lg,
    paddingHorizontal: T.Spacing.md,
    paddingVertical: T.Spacing.md,
    gap: 10,
    ...T.Shadow.card,
  },
  input: { flex: 1, fontSize: T.FontSize.md, color: T.Colors.textPrimary },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: T.Spacing.lg,
    marginBottom: T.Spacing.sm,
    backgroundColor: T.Colors.borderLight,
    borderRadius: T.Radius.md,
    padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: T.Radius.sm, paddingVertical: T.Spacing.sm,
  },
  tabActive: { backgroundColor: T.Colors.navyMid },
  tabText: { fontSize: T.FontSize.sm, fontWeight: T.FontWeight.semibold, color: T.Colors.textSecondary },
  tabTextActive: { color: T.Colors.textInverse },
  rxShortcut: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.Colors.emeraldLight,
    borderRadius: T.Radius.md,
    marginHorizontal: T.Spacing.lg,
    marginBottom: T.Spacing.sm,
    padding: T.Spacing.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rxShortcutText: { flex: 1, fontSize: T.FontSize.sm, color: T.Colors.emeraldDark, fontWeight: T.FontWeight.medium },
  list: { paddingHorizontal: T.Spacing.lg, paddingBottom: 32 },
  hint: { flex: 1, alignItems: 'center', paddingTop: 60 },
  hintText: { fontSize: T.FontSize.base, color: T.Colors.textTertiary, marginTop: 12, textAlign: 'center', paddingHorizontal: 32 },
  hintSub: { fontSize: T.FontSize.xs, color: T.Colors.border, marginTop: 6 },
  hintBtn: {
    marginTop: 16, backgroundColor: T.Colors.emerald, borderRadius: T.Radius.md,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  hintBtnText: { color: T.Colors.textInverse, fontWeight: T.FontWeight.bold, fontSize: T.FontSize.sm },
});
