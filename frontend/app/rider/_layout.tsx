import { Stack } from 'expo-router';

export default function RiderLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0c4a6e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
  );
}
