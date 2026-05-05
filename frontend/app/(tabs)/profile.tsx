import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { userApi } from '@/api/user';
import { useAuthStore } from '@/store/auth';

interface MenuItemProps { icon: string; label: string; onPress: () => void }

function MenuItem({ icon, label, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={22} color="#0EA5E9" />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const logout = useAuthStore((s) => s.logout);
  const principalId = useAuthStore((s) => s.principalId);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: userApi.getProfile,
    enabled: !!principalId,
  });

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Ionicons name="person" size={40} color="#fff" />
      </View>
      <Text style={styles.name}>{profile?.full_name ?? 'MedRush User'}</Text>
      <Text style={styles.id}>{principalId}</Text>

      {/* Menu */}
      <View style={styles.card}>
        <MenuItem icon="location-outline" label="My Addresses" onPress={() => {}} />
        <MenuItem icon="people-outline" label="Family Members" onPress={() => {}} />
        <MenuItem icon="document-text-outline" label="Prescriptions" onPress={() => {}} />
        <MenuItem icon="notifications-outline" label="Notifications" onPress={() => {}} />
      </View>

      <View style={styles.card}>
        <MenuItem icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => {}} />
        <MenuItem icon="help-circle-outline" label="Help & Support" onPress={() => {}} />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { alignItems: 'center', padding: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  id: { fontSize: 12, color: '#9CA3AF', marginBottom: 24 },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  menuLabel: { flex: 1, fontSize: 15, color: '#374151' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});
