import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/auth';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)/' : '/(auth)/login'} />;
}
