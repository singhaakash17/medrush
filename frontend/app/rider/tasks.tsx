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
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { logisticsApi } from '@/api/logistics';
import { useAuthStore } from '@/store/auth';
import { T } from '@/theme';
import type { Assignment } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  assigned:  { label: 'Pickup',     bg: T.Colors.amberLight,   color: T.Colors.amber,   icon: 'bicycle-outline' },
  picked_up: { label: 'Delivering', bg: T.Colors.navyLight,    color: T.Colors.navyMid, icon: 'navigate-outline' },
  delivered: { label: 'Done',       bg: T.Colors.emeraldLight, color: T.Colors.emerald, icon: 'checkmark-circle-outline' },
  failed:    { label: 'Failed',     bg: T.Colors.crimsonLight, color: T.Colors.crimson, icon: 'close-circle-outline' },
};

function AssignmentCard({ item }: { item: Assignment }) {
  const cfg = STATUS_CONFIG[item.status] ?? { label: item.status, bg: T.Colors.surface, color: T.Colors.textSecondary, icon: 'ellipse-outline' };
  const isActive = item.status === 'assigned' || item.status === 'picked_up';

  return (
    <Pressable
      style={[styles.card, isActive && styles.cardActive]}
      onPress={() => router.push(`/rider/delivery/${item.id}`)}
    >
      <View style={styles.cardRow}>
        <View style={styles.orderIdRow}>
          <View style={[styles.statusDot, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
          </View>
          <Text style={styles.orderId}>Order #{item.order_id.slice(0, 8).toUpperCase()}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {item.distance_m != null && (
          <View style={styles.metaChip}>
            <Ionicons name="map-outline" size={12} color={T.Colors.textTertiary} />
            <Text style={styles.metaText}>{(item.distance_m / 1000).toFixed(1)} km</Text>
          </View>
        )}
        {item.eta_seconds != null && (
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={12} color={T.Colors.textTertiary} />
            <Text style={styles.metaText}>ETA {Math.ceil(item.eta_seconds / 60)} min</Text>
          </View>
        )}
        <View style={styles.metaChip}>
          <Ionicons name="calendar-outline" size={12} color={T.Colors.textTertiary} />
          <Text style={styles.metaText}>
            {new Date(item.assigned_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>

      {isActive && (
        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>
            {item.status === 'assigned' ? 'Go to pharmacy & confirm pickup' : 'Deliver & verify OTP'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={T.Colors.navyMid} />
        </View>
      )}
    </Pressable>
  );
}

export default function TasksScreen() {
  const { principalId } = useAuthStore();

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
        <ActivityIndicator color={T.Colors.navyMid} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={[...active, ...history]}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={T.Colors.navyMid}
        />
      }
      ListHeaderComponent={
        <View>
          {/* Quick nav bar */}
          <View style={styles.quickNav}>
            <Pressable style={styles.quickBtn} onPress={() => router.push('/rider/shift')}>
              <Ionicons name="power-outline" size={20} color={T.Colors.navyMid} />
              <Text style={styles.quickBtnText}>Shift</Text>
            </Pressable>
            <Pressable style={styles.quickBtn} onPress={() => router.push('/rider/earnings')}>
              <Ionicons name="wallet-outline" size={20} color={T.Colors.emerald} />
              <Text style={styles.quickBtnText}>Earnings</Text>
            </Pressable>
          </View>

          {/* Active count pill */}
          {active.length > 0 && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>ACTIVE</Text>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{active.length}</Text>
              </View>
            </View>
          )}

          {active.length === 0 && (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="bicycle-outline" size={36} color={T.Colors.navyMid} />
              </View>
              <Text style={styles.emptyTitle}>No active deliveries</Text>
              <Text style={styles.emptySub}>New orders will appear here automatically</Text>
            </View>
          )}
        </View>
      }
      ListFooterComponent={
        history.length > 0 ? (
          <View style={{ marginTop: T.Spacing.lg }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>TODAY'S HISTORY</Text>
            </View>
            {history.map((item) => (
              <AssignmentCard key={item.id} item={item} />
            ))}
          </View>
        ) : null
      }
      renderItem={({ item }) =>
        item.status === 'assigned' || item.status === 'picked_up'
          ? <AssignmentCard item={item} />
          : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: T.Colors.surface },
  content: { padding: T.Spacing.lg, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  quickNav: {
    flexDirection: 'row',
    gap: T.Spacing.md,
    marginBottom: T.Spacing.lg,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: T.Spacing.sm,
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.lg,
    paddingVertical: T.Spacing.md,
    borderWidth: 1,
    borderColor: T.Colors.border,
    ...T.Shadow.card,
  },
  quickBtnText: { fontSize: T.FontSize.sm, fontWeight: T.FontWeight.semibold, color: T.Colors.textPrimary },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: T.Spacing.sm, marginBottom: T.Spacing.sm },
  sectionLabel: {
    fontSize: T.FontSize.xs,
    fontWeight: T.FontWeight.bold,
    color: T.Colors.textTertiary,
    letterSpacing: 0.8,
  },
  countPill: {
    backgroundColor: T.Colors.navyMid,
    borderRadius: T.Radius.full,
    width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  countText: { fontSize: 10, fontWeight: T.FontWeight.black, color: T.Colors.white },

  card: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.xl,
    padding: T.Spacing.lg,
    marginBottom: T.Spacing.sm,
    borderWidth: 1,
    borderColor: T.Colors.border,
    ...T.Shadow.card,
  },
  cardActive: { borderColor: T.Colors.navyMid, borderWidth: 1.5 },

  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: T.Spacing.sm },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: T.Spacing.sm },
  statusDot: {
    width: 28, height: 28, borderRadius: T.Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  orderId: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },

  badge: {
    paddingHorizontal: T.Spacing.sm, paddingVertical: 3,
    borderRadius: T.Radius.full,
  },
  badgeText: { fontSize: T.FontSize.xs, fontWeight: T.FontWeight.bold },

  metaRow: { flexDirection: 'row', gap: T.Spacing.sm, flexWrap: 'wrap', marginBottom: T.Spacing.sm },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.Colors.surface,
    paddingHorizontal: T.Spacing.sm, paddingVertical: 3,
    borderRadius: T.Radius.full,
  },
  metaText: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary, fontWeight: T.FontWeight.medium },

  ctaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: T.Spacing.sm,
    borderTopWidth: 1, borderColor: T.Colors.border,
  },
  ctaText: { fontSize: T.FontSize.sm, fontWeight: T.FontWeight.semibold, color: T.Colors.navyMid },

  emptyCard: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.xl,
    padding: T.Spacing['2xl'],
    alignItems: 'center',
    marginBottom: T.Spacing.lg,
    borderWidth: 1, borderColor: T.Colors.border,
    ...T.Shadow.card,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: T.Radius.xl,
    backgroundColor: T.Colors.navyLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: T.Spacing.lg,
  },
  emptyTitle: { fontSize: T.FontSize.lg, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary, marginBottom: T.Spacing.xs },
  emptySub: { fontSize: T.FontSize.sm, color: T.Colors.textTertiary, textAlign: 'center' },
});
