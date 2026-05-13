import { Stack } from 'expo-router';
import { T } from '@/theme';

export default function RiderLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: T.Colors.navy },
        headerTintColor: T.Colors.white,
        headerTitleStyle: {
          fontWeight: T.FontWeight.bold as any,
          fontSize: T.FontSize.lg,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="tasks" options={{ title: 'Assignments' }} />
      <Stack.Screen name="shift" options={{ title: 'My Shift' }} />
      <Stack.Screen name="earnings" options={{ title: 'Earnings' }} />
      <Stack.Screen
        name="delivery/[id]"
        options={{ title: 'Active Delivery' }}
      />
    </Stack>
  );
}
