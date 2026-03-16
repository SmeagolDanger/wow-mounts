/**
 * Root Layout — Auth init, deep link handling for Battle.net OAuth.
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme';
import api from '../services/api';

export default function RootLayout() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      await api.init();
      try { await api.getMe(); } catch {
        const deviceId = await api.getDeviceId();
        await api.deviceAuth(deviceId);
      }
    })();
  }, []);

  // Deep link listener for OAuth callback
  useEffect(() => {
    function handle(event: { url: string }) { processAuth(event.url); }
    Linking.getInitialURL().then((url) => { if (url) processAuth(url); });
    const sub = Linking.addEventListener('url', handle);
    return () => sub.remove();
  }, []);

  async function processAuth(url: string) {
    const parsed = Linking.parse(url);
    if (parsed.path !== 'auth/callback' && parsed.hostname !== 'auth') return;
    const params = parsed.queryParams || {};
    if (params.error) { Alert.alert('Login Failed', String(params.error)); return; }
    const token = params.token;
    if (!token || typeof token !== 'string') return;
    await SecureStore.setItemAsync('auth_token', token);
    api.setToken(token);
    const battletag = typeof params.battletag === 'string' ? params.battletag : '';
    Alert.alert('Battle.net Linked!', battletag ? `Welcome, ${battletag}` : 'Account linked.');
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.bg.primary} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.primary } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
