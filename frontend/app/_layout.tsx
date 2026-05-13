import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/auth';

export default function RootLayout() {
  const { hydrate, isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to the login page if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect based on role
      const role = useAuthStore.getState().role;
      if (role === 'rider') {
        router.replace('/rider/tasks');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, segments, isLoading]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="medicine/[id]" options={{ headerShown: true, title: 'Medicine' }} />
          <Stack.Screen name="pharmacy/[id]" options={{ headerShown: true, title: 'Pharmacy' }} />
          <Stack.Screen name="order/[id]" options={{ headerShown: true, title: 'Order Details' }} />
          <Stack.Screen name="tracking/[id]" options={{ headerShown: true, title: 'Track Order' }} />
          <Stack.Screen name="cart" options={{ headerShown: true, title: 'Cart' }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
