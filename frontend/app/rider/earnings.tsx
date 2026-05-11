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
import { logisticsApi } from '@/api/logistics';
import { useAuthStore } from '@/store/auth';

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

function BarChart({ data }: { data: EarningsDay[] }) {
  const max = Math.max(...data.map((d) => d.earnings_paise), 1);
  return (
    <View style={chartStyles.container}>
      {data.map((d, i) => (
        <View key={i} style={chartStyles.col}>
          <View style={chartStyles.barWrap}>
            <View
              style={[
                chartStyles.bar,
                { height: `${Math.max(4, (d.earnings_paise / max) * 100)}%` },
              ]}
            />
          </View>
          <Text style={chartStyles.label}>
            {d.date.slice(5).replace('-', '/')}
          </Text>
        </View>
      ))}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 },
  col: { flex: 1, alignItems: 'center' },
  barWrap: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  bar: { backgroundColor: '#0c4a6e', borderRadius: 4, width: '100%' },
  label: { fontSize: 9, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
});

export default function EarningsScreen() {
  const [period, setPeriod] = useState<Period>('7d');
  const { principalId } = useAuthStore();

  const { data: summary, isLoading } = useQuery<EarningsSummary>({
    queryKey: ['rider-earnings', principalId, period],
    queryFn: () => logisticsApi.getRiderEarnings(principalId!, period),
    enabled: !!principalId,
    placeholderData: {
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
    },
  });

  const stats = [
    { label: 'Total Earned', value: `₹${((summary?.total_earnings_paise ?? 0) / 100).toFixed(0)}`, color: '#10b981' },
    { label: 'Orders', value: String(summary?.total_orders ?? 0), color: '#0ea5e9' },
    { label: 'Avg per Order', value: `₹${((summary?.avg_per_order_paise ?? 0) / 100).toFixed(0)}`, color: '#8b5cf6' },
    { label: 'Pending Payout', value: `₹${((summary?.pending_payout_paise ?? 0) / 100).toFixed(0)}`, color: '#f59e0b' },
  ];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0c4a6e" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Earnings</Text>

      {/* Period Selector */}
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

      {/* Stat Grid */}
      <View style={styles.grid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Bar Chart */}
      {summary?.daily && summary.daily.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Daily Earnings</Text>
          <BarChart data={summary.daily} />
        </View>
      )}

      {/* Daily Breakdown Table */}
      <View style={styles.tableCard}>
        <Text style={styles.sectionTitle}>Breakdown</Text>
        {summary?.daily?.map((d, i) => (
          <View key={i} style={[styles.tableRow, i > 0 && styles.tableRowBorder]}>
            <Text style={styles.tableDate}>
              {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <View style={styles.tableRight}>
              <Text style={styles.tableOrders}>{d.orders} orders</Text>
              <Text style={styles.tableEarning}>₹{(d.earnings_paise / 100).toFixed(0)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Payout note */}
      <View style={styles.payoutNote}>
        <Text style={styles.payoutNoteText}>
          💳 Payouts are processed every Monday by 10 AM to your registered bank account.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  periodBtnActive: { backgroundColor: '#0c4a6e' },
  periodText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  periodTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 14 },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  tableRowBorder: { borderTopWidth: 1, borderColor: '#f1f5f9' },
  tableDate: { fontSize: 13, color: '#334155', fontWeight: '500' },
  tableRight: { alignItems: 'flex-end' },
  tableOrders: { fontSize: 11, color: '#94a3b8' },
  tableEarning: { fontSize: 15, fontWeight: '700', color: '#0c4a6e' },
  payoutNote: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  payoutNoteText: { fontSize: 12, color: '#1e40af', lineHeight: 18 },
});
