import React, { useState } from 'react';
import {
  View, FlatList, ActivityIndicator,
  Text, StyleSheet, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/api/catalog';
import { MedicineCard } from '@/components/MedicineCard';

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: () => catalogApi.search(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });

  return (
    <View style={styles.screen}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.input}
          placeholder="Search medicines, generic names…"
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          autoFocus
          clearButtonMode="while-editing"
        />
        {isFetching && <ActivityIndicator size="small" color="#0EA5E9" />}
      </View>

      {query.trim().length < 2 && (
        <View style={styles.hint}>
          <Ionicons name="search-circle-outline" size={64} color="#E5E7EB" />
          <Text style={styles.hintText}>Type at least 2 characters to search</Text>
        </View>
      )}

      {query.trim().length >= 2 && !isFetching && results?.length === 0 && (
        <View style={styles.hint}>
          <Ionicons name="alert-circle-outline" size={64} color="#E5E7EB" />
          <Text style={styles.hintText}>No medicines found for "{query}"</Text>
        </View>
      )}

      <FlatList
        data={results ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MedicineCard medicine={item} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  hint: { flex: 1, alignItems: 'center', paddingTop: 80 },
  hintText: { fontSize: 14, color: '#9CA3AF', marginTop: 12, textAlign: 'center', paddingHorizontal: 32 },
});
