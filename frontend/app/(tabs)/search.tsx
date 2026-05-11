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
import * as Location from 'expo-location';

type Tab = 'medicines' | 'pharmacies';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('medicines');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const router = useRouter();

  // Default to Indiranagar, Bengaluru when location unavailable
  const BENGALURU_DEFAULT = { lat: 12.9784, lon: 77.6408 };

  React.useEffect(() => {
    // Set Bengaluru default immediately so pharmacies show without waiting
    setUserLat(BENGALURU_DEFAULT.lat);
    setUserLon(BENGALURU_DEFAULT.lon);
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLat(loc.coords.latitude);
          setUserLon(loc.coords.longitude);
        }
      } catch {
        // Keep Bengaluru default — location unavailable on this device/emulator
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
        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.input}
          placeholder={tab === 'medicines' ? 'Brand, generic, salt name…' : 'Find pharmacies near you'}
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          autoFocus
          clearButtonMode="while-editing"
        />
        {isFetching && <ActivityIndicator size="small" color="#0EA5E9" />}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'medicines' && styles.tabActive]}
          onPress={() => setTab('medicines')}
        >
          <Ionicons name="medical-outline" size={16} color={tab === 'medicines' ? '#fff' : '#6B7280'} />
          <Text style={[styles.tabText, tab === 'medicines' && styles.tabTextActive]}>Medicines</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'pharmacies' && styles.tabActive]}
          onPress={() => setTab('pharmacies')}
        >
          <Ionicons name="storefront-outline" size={16} color={tab === 'pharmacies' ? '#fff' : '#6B7280'} />
          <Text style={[styles.tabText, tab === 'pharmacies' && styles.tabTextActive]}>Pharmacies</Text>
        </TouchableOpacity>
      </View>

      {/* Rx Upload shortcut */}
      <TouchableOpacity style={styles.rxShortcut} onPress={() => router.push('/rx/upload')}>
        <Ionicons name="scan-outline" size={18} color="#10B981" />
        <Text style={styles.rxShortcutText}>Upload Prescription (Rx) for quick checkout</Text>
        <Ionicons name="chevron-forward" size={16} color="#10B981" />
      </TouchableOpacity>

      {/* Medicines list */}
      {tab === 'medicines' && (
        <>
          {query.trim().length < 2 && (
            <View style={styles.hint}>
              <Ionicons name="search-circle-outline" size={64} color="#E5E7EB" />
              <Text style={styles.hintText}>Type at least 2 characters to search medicines</Text>
              <Text style={styles.hintSub}>Supports brand name, generic, and salt search</Text>
            </View>
          )}
          {query.trim().length >= 2 && !medFetching && medicines?.length === 0 && (
            <View style={styles.hint}>
              <Ionicons name="alert-circle-outline" size={64} color="#E5E7EB" />
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
              <Ionicons name="location-outline" size={64} color="#E5E7EB" />
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
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 16, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  tabs: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#F3F4F6', borderRadius: 10, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 8, paddingVertical: 8,
  },
  tabActive: { backgroundColor: '#0EA5E9' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },
  rxShortcut: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ECFDF5', borderRadius: 10, marginHorizontal: 16, marginBottom: 8,
    padding: 12, borderWidth: 1, borderColor: '#A7F3D0',
  },
  rxShortcutText: { flex: 1, fontSize: 13, color: '#065F46', fontWeight: '500' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  hint: { flex: 1, alignItems: 'center', paddingTop: 60 },
  hintText: { fontSize: 14, color: '#9CA3AF', marginTop: 12, textAlign: 'center', paddingHorizontal: 32 },
  hintSub: { fontSize: 12, color: '#D1D5DB', marginTop: 6 },
  hintBtn: {
    marginTop: 16, backgroundColor: '#10B981', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  hintBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
