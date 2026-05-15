import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { userApi } from '@/api/user';
import { useAuthStore } from '@/store/auth';
import { T } from '@/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  badge?: string;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MenuItem({ icon, label, onPress, badge }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon as any} size={20} color={T.Colors.navyMid} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={T.Colors.border} />
    </TouchableOpacity>
  );
}

function AvatarInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials || 'MR'}</Text>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const principalId = useAuthStore((s) => s.principalId);
  const [plusModalVisible, setPlusModalVisible] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getProfile,
    enabled: !!principalId,
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: userApi.getAddresses,
    enabled: !!principalId,
  });

  const displayName = profile?.full_name ?? 'MedRush User';
  const displayPhone = principalId ?? '+91 98765 43210';

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleEditProfile = () => {
    Alert.alert(
      'Profile Updated',
      'Your profile details have been saved successfully.',
      [{ text: 'OK' }],
    );
  };

  const handleSavedAddresses = () => {
    if (addresses.length === 0) {
      Alert.alert('Saved Addresses', 'No addresses saved yet.', [{ text: 'OK' }]);
      return;
    }
    const addressLines = addresses.map(
      (a, i) =>
        `${i + 1}. ${a.label}${a.is_default ? ' (Default)' : ''}\n   ${a.line1}${a.line2 ? `, ${a.line2}` : ''}, ${a.city} - ${a.pincode}`,
    ).join('\n\n');
    Alert.alert('Saved Addresses', addressLines, [{ text: 'Close' }]);
  };

  const handleFamilyMembers = () => {
    Alert.alert('Family Members', 'No family members added yet.', [{ text: 'OK' }]);
  };

  const handleNotifications = () => {
    Alert.alert('Notifications', "You're all caught up! No new notifications.", [{ text: 'OK' }]);
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'MedRush collects your name, phone number, and delivery address solely to fulfill medicine orders. Your health data is encrypted and never shared with third parties without your explicit consent. You may request data deletion at any time by contacting support@medrush.in.',
      [{ text: 'OK' }],
    );
  };

  const handleHelpSupport = () => {
    Alert.alert(
      'Help & Support',
      'Need help?\n\nCall us: 1800-123-4567 (Toll-free)\nEmail: support@medrush.in\nChat: Available in-app 8 AM – 10 PM\n\nFor urgent medication queries, call us directly.',
      [{ text: 'OK' }],
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About MedRush',
      'MedRush v1.0.0\nBuilt with ❤️ in Bengaluru\n\nMedRush delivers medicines from local pharmacies in 15 minutes. Licensed under CDSCO regulations.\n\n© 2026 MedRush Technologies Pvt. Ltd.',
      [{ text: 'OK' }],
    );
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero header ── */}
        <View style={styles.heroSection}>
          <AvatarInitials name={displayName} />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.phone}>{displayPhone}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile}>
            <Ionicons name="pencil-outline" size={15} color={T.Colors.navyMid} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats bar ── */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Rx Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={14} color={T.Colors.navyMid} />
            <Text style={styles.statLabel}>Indiranagar</Text>
          </View>
        </View>

        {/* ── Wallet & MedRush Plus ── */}
        <View style={styles.card}>
          <View style={styles.walletRow}>
            <View style={styles.walletLeft}>
              <View style={styles.walletIcon}>
                <Ionicons name="wallet-outline" size={20} color={T.Colors.navyMid} />
              </View>
              <View>
                <Text style={styles.walletTitle}>MedRush Wallet</Text>
                <Text style={styles.walletBalance}>₹0.00</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.addMoneyBtn}>
              <Text style={styles.addMoneyText}>Add Money</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.plusRow} onPress={() => setPlusModalVisible(true)}>
            <View style={styles.plusIconWrap}>
              <Ionicons name="flash-outline" size={20} color={T.Colors.amber} />
            </View>
            <View style={styles.plusInfo}>
              <Text style={styles.plusTitle}>MedRush Plus</Text>
              <Text style={styles.plusSubtitle}>Not subscribed · ₹99/month</Text>
            </View>
            <View style={styles.plusBadge}>
              <Text style={styles.plusBadgeText}>Try Free</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Orders & Account ── */}
        <View style={styles.card}>
          <MenuItem
            icon="receipt-outline"
            label="My Orders"
            onPress={() => router.push('/(tabs)/orders')}
            badge="3"
          />
          <MenuItem
            icon="location-outline"
            label="Saved Addresses"
            onPress={handleSavedAddresses}
          />
          <MenuItem
            icon="people-outline"
            label="Family Members"
            onPress={handleFamilyMembers}
          />
          <MenuItem
            icon="document-text-outline"
            label="Prescriptions"
            onPress={() => router.push('/rx/vault' as any)}
          />
        </View>

        {/* ── Settings & Info ── */}
        <View style={styles.card}>
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={handleNotifications}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={handlePrivacyPolicy}
          />
          <MenuItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={handleHelpSupport}
          />
          <MenuItem
            icon="information-circle-outline"
            label="About MedRush"
            onPress={handleAbout}
          />
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={T.Colors.crimson} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>MedRush v1.0.0 · Bengaluru</Text>
      </ScrollView>

      {/* ── MedRush Plus Modal ── */}
      <Modal
        visible={plusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPlusModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPlusModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>MedRush Plus ⚡</Text>
            <Text style={styles.modalSubtitle}>₹99/month — Cancel anytime</Text>
            <View style={styles.benefitsList}>
              {PLUS_BENEFITS.map((b) => (
                <View key={b.text} style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name={b.icon as any} size={18} color={T.Colors.navyMid} />
                  </View>
                  <Text style={styles.benefitText}>{b.text}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.trialBtn}
              onPress={() => {
                setPlusModalVisible(false);
                Alert.alert(
                  'Coming Soon',
                  'MedRush Plus subscriptions will be available shortly. You will be notified!',
                );
              }}
            >
              <Text style={styles.trialBtnText}>Start 14-Day Free Trial</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPlusModalVisible(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Maybe later</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const PLUS_BENEFITS = [
  { icon: 'bicycle-outline', text: 'Free delivery on every order' },
  { icon: 'flash-outline', text: 'Priority 10-minute express delivery' },
  { icon: 'document-text-outline', text: 'Unlimited Rx uploads & vault storage' },
  { icon: 'people-outline', text: 'Up to 5 family member profiles' },
  { icon: 'pricetag-outline', text: 'Exclusive 5% cashback on medicines' },
  { icon: 'call-outline', text: '24/7 pharmacist consultation hotline' },
];

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.Colors.surface },
  content: { paddingBottom: 40 },

  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: T.Spacing.lg,
    paddingTop: T.Spacing.xl,
    paddingBottom: T.Spacing.lg,
    backgroundColor: T.Colors.white,
    gap: T.Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: T.Colors.borderLight,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: T.Colors.navyMid,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: T.FontSize['2xl'], fontWeight: T.FontWeight.bold, color: T.Colors.textInverse, letterSpacing: 1 },
  headerInfo: { flex: 1 },
  name: { fontSize: T.FontSize.xl, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  phone: { fontSize: T.FontSize.sm, color: T.Colors.textTertiary, marginTop: 2 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.Colors.navyLight,
    paddingHorizontal: T.Spacing.md,
    paddingVertical: 6,
    borderRadius: T.Radius.full,
  },
  editBtnText: { fontSize: T.FontSize.sm, fontWeight: T.FontWeight.semibold, color: T.Colors.navyMid },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: T.Colors.white,
    marginHorizontal: T.Spacing.lg,
    marginTop: T.Spacing.md,
    borderRadius: T.Radius.lg,
    paddingVertical: T.Spacing.md,
    marginBottom: T.Spacing.md,
    ...T.Shadow.card,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: T.FontSize.xl, fontWeight: T.FontWeight.black, color: T.Colors.navyMid },
  statLabel: { fontSize: T.FontSize['2xs'], color: T.Colors.textTertiary, fontWeight: T.FontWeight.medium },
  statDivider: { width: 1, backgroundColor: T.Colors.borderLight },

  card: {
    backgroundColor: T.Colors.white,
    borderRadius: T.Radius.lg,
    marginHorizontal: T.Spacing.lg,
    marginBottom: T.Spacing.md,
    overflow: 'hidden',
    ...T.Shadow.card,
  },

  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: T.Spacing.lg,
    gap: T.Spacing.md,
  },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: T.Spacing.md },
  walletIcon: {
    width: 40, height: 40, borderRadius: T.Radius.md,
    backgroundColor: T.Colors.navyLight,
    justifyContent: 'center', alignItems: 'center',
  },
  walletTitle: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary },
  walletBalance: { fontSize: T.FontSize.xl, fontWeight: T.FontWeight.black, color: T.Colors.textPrimary, marginTop: 2 },
  addMoneyBtn: {
    backgroundColor: T.Colors.navyLight,
    paddingHorizontal: T.Spacing.md,
    paddingVertical: 6,
    borderRadius: T.Radius.full,
  },
  addMoneyText: { fontSize: T.FontSize.sm, fontWeight: T.FontWeight.semibold, color: T.Colors.navyMid },
  menuDivider: { height: 1, backgroundColor: T.Colors.borderLight },

  plusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: T.Spacing.lg,
    gap: T.Spacing.md,
  },
  plusIconWrap: {
    width: 40, height: 40, borderRadius: T.Radius.md,
    backgroundColor: T.Colors.amberLight,
    justifyContent: 'center', alignItems: 'center',
  },
  plusInfo: { flex: 1 },
  plusTitle: { fontSize: T.FontSize.md, fontWeight: T.FontWeight.bold, color: T.Colors.textPrimary },
  plusSubtitle: { fontSize: T.FontSize.xs, color: T.Colors.textTertiary, marginTop: 2 },
  plusBadge: {
    backgroundColor: T.Colors.amberLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: T.Radius.full,
  },
  plusBadgeText: { fontSize: T.FontSize.xs, fontWeight: T.FontWeight.bold, color: '#D97706' },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: T.Spacing.lg,
    gap: T.Spacing.md,
    borderBottomWidth: 1,
    borderColor: T.Colors.borderLight,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: T.Radius.sm,
    backgroundColor: T.Colors.navyLight,
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { flex: 1, fontSize: T.FontSize.md, color: T.Colors.textSecondary },
  badge: {
    backgroundColor: T.Colors.navyMid,
    borderRadius: T.Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { fontSize: T.FontSize['2xs'], fontWeight: T.FontWeight.black, color: T.Colors.textInverse },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginHorizontal: T.Spacing.lg,
    padding: T.Spacing.lg,
    backgroundColor: T.Colors.crimsonLight,
    borderRadius: T.Radius.lg,
    justifyContent: 'center',
  },
  logoutText: { fontSize: T.FontSize.md, fontWeight: T.FontWeight.semibold, color: T.Colors.crimson },
  version: {
    textAlign: 'center',
    fontSize: T.FontSize.xs,
    color: T.Colors.border,
    marginTop: T.Spacing.xl,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: T.Colors.white,
    borderTopLeftRadius: T.Radius['2xl'],
    borderTopRightRadius: T.Radius['2xl'],
    padding: T.Spacing['2xl'],
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: T.Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: T.Spacing.xl,
  },
  modalTitle: { fontSize: T.FontSize['2xl'], fontWeight: T.FontWeight.black, color: T.Colors.textPrimary, textAlign: 'center' },
  modalSubtitle: { fontSize: T.FontSize.base, color: T.Colors.textTertiary, textAlign: 'center', marginTop: 4, marginBottom: T.Spacing['2xl'] },
  benefitsList: { gap: T.Spacing.md, marginBottom: T.Spacing['3xl'] },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: T.Spacing.md },
  benefitIcon: {
    width: 36, height: 36, borderRadius: T.Radius.sm,
    backgroundColor: T.Colors.navyLight,
    justifyContent: 'center', alignItems: 'center',
  },
  benefitText: { fontSize: T.FontSize.md, color: T.Colors.textSecondary, flex: 1 },
  trialBtn: {
    backgroundColor: T.Colors.navyMid,
    borderRadius: T.Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: T.Spacing.md,
  },
  trialBtnText: { color: T.Colors.textInverse, fontWeight: T.FontWeight.bold, fontSize: T.FontSize.lg },
  modalClose: { alignItems: 'center', paddingVertical: 8 },
  modalCloseText: { fontSize: T.FontSize.base, color: T.Colors.textTertiary },
});
