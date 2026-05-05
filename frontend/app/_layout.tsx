import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/auth';

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, []);

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
