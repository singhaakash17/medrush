import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useCartStore } from '@/store/cart';
import { T } from '@/theme';

function CartBadge({ color, size }: { color: string; size: number }) {
  const count = useCartStore((s) => s.itemCount());
  return (
    <View>
      <Ionicons name="cart-outline" size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: T.Colors.navyMid,
        tabBarInactiveTintColor: T.Colors.textTertiary,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: T.Colors.border,
          paddingBottom: 6,
          height: 64,
          backgroundColor: T.Colors.white,
        },
        tabBarLabelStyle: { fontSize: T.FontSize.xs, fontWeight: T.FontWeight.semibold },
        headerStyle: { backgroundColor: T.Colors.white },
        headerTintColor: T.Colors.textPrimary,
        headerTitleStyle: { fontWeight: T.FontWeight.black, fontSize: T.FontSize.lg },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => <CartBadge color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: T.Colors.crimson,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: T.Colors.textInverse, fontSize: 9, fontWeight: T.FontWeight.black },
});
