import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { logisticsApi } from '@/api/logistics';
import { useAuthStore } from '@/store/auth';
import type { Assignment } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  assigned: 'Pickup',
  picked_up: 'Delivering',
  delivered: 'Done',
  failed: 'Failed',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  assigned: { bg: '#fef3c7', text: '#92400e' },
  picked_up: { bg: '#dbeafe', text: '#1d4ed8' },
  delivered: { bg: '#dcfce7', text: '#15803d' },
  failed: { bg: '#fee2e2', text: '#b91c1c' },
};

function AssignmentCard({ item }: { item: Assignment }) {
  const color = STATUS_COLOR[item.status] ?? { bg: '#f1f5f9', text: '#334155' };
  const isActive = item.status === 'assigned' || item.status === 'picked_up';

  return (
    <Pressable
      style={[styles.card, isActive && styles.cardActive]}
      onPress={() => router.push(`/rider/delivery/${item.id}`)}
    >
      <View style={styles.cardRow}>
        <Text style={styles.orderId}>Order #{item.order_id.slice(0, 8)}</Text>
        <View style={[styles.badge, { backgroundColor: color.bg }]}>
          <Text style={[styles.badgeText, { color: color.text }]}>{STATUS_LABEL[item.status] ?? item.status}</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        {item.distance_m != null && (
          <Text style={styles.meta}>{(item.distance_m / 1000).toFixed(1)} km</Text>
        )}
        {item.eta_seconds != null && (
          <Text style={styles.meta}>ETA {Math.ceil(item.eta_seconds / 60)} min</Text>
        )}
        <Text style={styles.meta}>
          {new Date(item.assigned_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      {isActive && (
        <View style={styles.arrowRow}>
          <Text style={styles.arrowText}>
            {item.status === 'assigned' ? 'Go to pickup →' : 'Complete delivery →'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function TasksScreen() {
  const { principalId } = useAuthStore();
  const qc = useQueryClient();

  const { data: assignments = [], isLoading, refetch, isRefetching } = useQuery<Assignment[]>({
    queryKey: ['rider-assignments', principalId],
    queryFn: () => logisticsApi.getRiderAssignments(principalId!),
    enabled: !!principalId,
    refetchInterval: 30_000,
  });

  const active = assignments.filter((a) => a.status === 'assigned' || a.status === 'picked_up');
  const history = assignments.filter((a) => a.status === 'delivered' || a.status === 'failed');

  const onRefresh = useCallback(() => refetch(), [refetch]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0c4a6e" size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={[...active, ...history]}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#0c4a6e" />}
      ListHeaderComponent={
        <View>
          <Text style={styles.heading}>Assignments</Text>
          {active.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No active deliveries</Text>
              <Text style={styles.emptySub}>New orders will appear here automatically</Text>
            </View>
          )}
          {active.length > 0 && <Text style={styles.sectionLabel}>Active</Text>}
        </View>
      }
      ListFooterComponent={
        history.length > 0 ? (
          <View>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Today's History</Text>
            {history.map((item) => (
              <AssignmentCard key={item.id} item={item} />
            ))}
          </View>
        ) : null
      }
      renderItem={({ item }) =>
        item.status === 'assigned' || item.status === 'picked_up' ? <AssignmentCard item={item} /> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardActive: { borderColor: '#0ea5e9', borderWidth: 1.5 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  orderId: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 12, color: '#64748b', marginRight: 12 },
  arrowRow: { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderColor: '#f1f5f9' },
  arrowText: { fontSize: 13, fontWeight: '600', color: '#0ea5e9' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
