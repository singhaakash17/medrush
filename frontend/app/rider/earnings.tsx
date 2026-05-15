import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { logisticsApi } from '@/api/logistics';
import { useAuthStore } from '@/store/auth';
import { T } from '@/theme';

type Period = '7d' | '30d';

interface EarningsDay {
  date: string;
  orders: number;
  earnings_paise: number;
}

interface EarningsSummary {
  total_earnings_paise: number;
  total_orders: number;
  avg_per_order_paise: number;
  pending_payout_paise: number;
  daily: EarningsDay[];
}

const PLACEHOLDER: EarningsSummary = {
  total_earnings_paise: 4_20000,
  total_orders: 42,
  avg_per_order_paise: 10_000,
  pending_payout_paise: 1_40000,
  daily: Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().slice(0, 10),
      orders: Math.floor(Math.random() * 8) + 2,
      earnings_paise: Math.floor(Math.random() * 80_000) + 30_000,
    };
  }),
};

function BarChart({ data }: { data: EarningsDay[] }) {
  const max = Math.max(...data.map((d) => d.earnings_paise), 1);
  return (
    <View style={chartStyles.container}>
      {data.map((d, i) => {
        const pct = Math.max(4, (d.earnings_paise / max) * 100);
        return (
          <View key={i} style={chartStyles.col}>
            <View style={chartStyles.barWrap}>
              <View style={[chartStyles.bar, { height: `${pct}%` as any }]} />
            </View>
            <Text style={chartStyles.label}>{d.date.slice(5).replace('-', '/')}</Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 },
  col: { flex: 1, alignItems: 'center' },
  barWrap: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  bar: { backgroundColor: T.Colors.navyMid, borderRadius: T.Radius.sm, width: '100%' },
  label: { fontSize: 9, color: T.Colors.textTertiary, marginTop: 4, fontWeight: T.FontWeight.semibold },
});

const STAT_CARDS = (s: EarningsSummary) => [
  { label: 'Total Earned',  value: `₹${(s.total_earnings_paise / 100).toFixed(0)}`,     color: T.Colors.emerald,  icon: 'cash-outline' },
  { label: 'Orders',        value: String(s.total_orders),                                color: T.Colors.navyMid,  icon: 'bicycle-outline' },
  { label: 'Avg/Order',     value: `₹${(s.avg_per_order_paise / 100).toFixed(0)}`,       color: '#8b5cf6',         icon: 'stats-chart-outline' },
  { label: 'Pending Payout',value: `₹${(s.pending_payout_paise / 100).toFixed(0)}`,      color: T.Colors.amber,    icon: 'wallet-outline' },
];

export default function EarningsScreen() {
  const [period, setPeriod] = useState<Period>('7d');
  const { principalId } = useAuthStore();

  const { data: summary, isLoading } = useQuery<EarningsSummary>({
    queryKey: ['rider-earnings', principalId, period],
    queryFn: () => logisticsApi.getRiderEarnings(principalId!, period),
    enabled: !!principalId,
    placeholderData: PLACEHOLDER,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={T.Colors.navyMid} size="large" />
      </View>
    );
  }

  const stats = STAT_CARDS(summary ?? PLACEHOLDER);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {(['7d', '30d'] as Period[]).map((p) => (
          <Pressable
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === '7d' ? 'Last 7 days' : 'Last 30 days'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Stat grid */}
      <View style={styles.grid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: `${s.color}18` }]}>
              <Ionicons name={s.icon as any} size={18} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Bar chart */}
      {summary?.daily && summary.daily.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Earnings</Text>
          <BarChart data={summary.daily} />
        </View>
      )}

      {/* Daily breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Breakdown</Text>
        {summary?.daily?.map((d, i) => (
          <View key={i} style={[styles.tableRow, i > 0 && styles.tableRowBorder]}>
            <Text style={styles.tableDate}>
              {new Date(d.date).toLocaleDateString('en-IN', {
                weekday: 'short', month: 'short', day: 'numeric',
              })}
            </Text>
            <View style={styles.tableRight}>
              <Text style={styles.tableOrders}>{d.orders} orders</Text>
              <Text style={styles.tableEarning}>₹{(d.earnings_paise / 100).toFixed(0)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Payout info */}
      <View style={styles.payoutCard}>
        <Ionicons name="card-outline" size={18} color={T.Colors.navyMid} />
        <Text style={styles.payoutText}>
          Payouts are processed every Monday by 10 AM to your registered bank account.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.Colors.surface },
  content: { padding: T.Spacing.lg, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  periodRow: {
    flexDirection: 'row',
    gap: T.Spacing.sm,
    marginBottom: T.Spacing.lg,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: T.Spacing.sm,
    borderRadius: T.Radius.lg,
    alignItems: 'center',
    backgroundColor: T.Colors.white,
    borderWidth: 1, borderColor: T.Colors.border,
  },
  periodBtnActive: { backgroundColor: T.Colors.navyMid, borderColor: T.Colors.navyMid },
  periodText: { fontSize: T.FontSize.sm, fontWeight: T.FontWeight.semibold, color: T.Colors.textSecondary },
  periodTextActive: { color: T.Colors.white },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: T.Spacing.sm, marginBottom: T.Spacing.md },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.xl,
    padding: T.Spacing.lg,
    borderWidth: 1, borderColor: T.Colors.border,
    ...T.Shadow.card,
  },
  statIconWrap: {
    width: 36, height: 36, borderRadius: T.Radius.md,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: T.Spacing.sm,
  },
  statValue: { fontSize: T.FontSize['2xl'], fontWeight: T.FontWeight.black, marginBottom: 2 },
  statLabel: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary, fontWeight: T.FontWeight.medium },

  card: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.xl,
    padding: T.Spacing.lg,
    marginBottom: T.Spacing.md,
    borderWidth: 1, borderColor: T.Colors.border,
    ...T.Shadow.card,
  },
  cardTitle: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary, marginBottom: T.Spacing.lg },

  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: T.Spacing.sm },
  tableRowBorder: { borderTopWidth: 1, borderColor: T.Colors.border },
  tableDate: { fontSize: T.FontSize.sm, color: T.Colors.textSecondary, fontWeight: T.FontWeight.medium },
  tableRight: { alignItems: 'flex-end' },
  tableOrders: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary },
  tableEarning: { fontSize: T.FontSize.base, fontWeight: T.FontWeight.bold, color: T.Colors.navyMid },

  payoutCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: T.Spacing.sm,
    backgroundColor: T.Colors.navyLight,
    borderRadius: T.Radius.lg,
    padding: T.Spacing.md,
    borderWidth: 1, borderColor: T.Colors.navyMid,
  },
  payoutText: { fontSize: T.FontSize.sm, color: T.Colors.navy, lineHeight: 18, flex: 1 },
});
