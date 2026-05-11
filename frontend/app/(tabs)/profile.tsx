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
import { MOCK_ADDRESSES } from '@/mock/data';

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
      <Ionicons name={icon as any} size={22} color="#0EA5E9" />
      <Text style={styles.menuLabel}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
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

  const displayName = profile?.full_name ?? 'Aakash Singh';
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
    const addressLines = MOCK_ADDRESSES.map(
      (a, i) =>
        `${i + 1}. ${a.label}${a.is_default ? ' (Default)' : ''}\n   ${a.line1}, ${a.area}, ${a.city} - ${a.pincode}`,
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
        {/* ── Avatar + Name ── */}
        <View style={styles.headerSection}>
          <AvatarInitials name={displayName} />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.phone}>{displayPhone}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile}>
            <Ionicons name="pencil-outline" size={16} color="#0EA5E9" />
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
            <Ionicons name="location-outline" size={14} color="#0EA5E9" />
            <Text style={styles.statLabel}>Indiranagar</Text>
          </View>
        </View>

        {/* ── Wallet & MedRush Plus ── */}
        <View style={styles.card}>
          <View style={styles.walletRow}>
            <View style={styles.walletLeft}>
              <Ionicons name="wallet-outline" size={22} color="#0EA5E9" />
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
            <Ionicons name="flash-outline" size={22} color="#F59E0B" />
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
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
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
                  <Ionicons name={b.icon as any} size={20} color="#0EA5E9" />
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
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 40 },

  // Header
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  headerInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: '#111827' },
  phone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#0EA5E9' },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: '#0EA5E9' },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: '#F3F4F6' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  // Wallet
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 14,
  },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletTitle: { fontSize: 13, color: '#6B7280' },
  walletBalance: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 2 },
  addMoneyBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addMoneyText: { fontSize: 13, fontWeight: '600', color: '#0EA5E9' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6' },

  // MedRush Plus row
  plusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  plusInfo: { flex: 1 },
  plusTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  plusSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  plusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  plusBadgeText: { fontSize: 12, fontWeight: '700', color: '#D97706' },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  menuLabel: { flex: 1, fontSize: 15, color: '#374151' },
  badge: {
    backgroundColor: '#0EA5E9',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    justifyContent: 'center',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  benefitsList: { gap: 16, marginBottom: 28 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  benefitText: { fontSize: 15, color: '#374151' },
  trialBtn: {
    backgroundColor: '#0EA5E9',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  trialBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalClose: { alignItems: 'center', paddingVertical: 8 },
  modalCloseText: { fontSize: 14, color: '#9CA3AF' },
});
