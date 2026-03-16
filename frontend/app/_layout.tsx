import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme';
import api from '../services/api';

export default function RootLayout() {
  const init = useRef(false);

  useEffect(() => {
    if (init.current) return;
    init.current = true;
    (async () => {
      await api.init();
      try {
        await api.getMe();
      } catch {
        const deviceId = await api.getDeviceId();
        await api.deviceAuth(deviceId);
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.bg.primary} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.primary } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/callback" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
