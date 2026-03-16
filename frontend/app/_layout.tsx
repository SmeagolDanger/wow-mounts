/**
 * Root Layout — Auth initialization and deep link handling for Battle.net OAuth.
 *
 * Deep link flow:
 *   1. User taps "Link Battle.net" → opens system browser
 *   2. User logs in on Battle.net
 *   3. Battle.net redirects to our backend callback
 *   4. Backend redirects to wowmounts://auth/callback?token=xxx&battletag=yyy
 *   5. This layout catches the deep link, stores the token, refreshes state
 */

import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme';
import api from '../services/api';

const DEVICE_ID_KEY = 'device_id';

/** Get or create a stable device ID persisted in SecureStore. */
async function getOrCreateDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export default function RootLayout() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      // Initialize API client (loads persisted token)
      await api.init();

      // Check if we already have a valid session
      try {
        await api.getMe();
      } catch {
        // No valid token — register with device ID
        const deviceId = await getOrCreateDeviceId();
        await api.deviceAuth(deviceId);
      }
    })();
  }, []);

  // ── Deep Link Listener ──────────────────────────────────────
  useEffect(() => {
    function handleDeepLink(event: { url: string }) {
      processAuthCallback(event.url);
    }

    // Handle deep link that opened the app
    Linking.getInitialURL().then((url) => {
      if (url) processAuthCallback(url);
    });

    // Handle deep link while app is running
    const sub = Linking.addEventListener('url', handleDeepLink);
    return () => sub.remove();
  }, []);

  async function processAuthCallback(url: string) {
    // Parse wowmounts://auth/callback?token=xxx&battletag=yyy
    const parsed = Linking.parse(url);

    if (parsed.hostname !== 'auth' && parsed.path !== 'auth/callback') return;

    const params = parsed.queryParams || {};

    // Check for errors
    if (params.error) {
      Alert.alert(
        'Login Failed',
        typeof params.error === 'string' ? params.error : 'Battle.net login failed. Please try again.',
      );
      return;
    }

    const token = params.token;
    if (!token || typeof token !== 'string') return;

    // Store the new token
    await SecureStore.setItemAsync('auth_token', token);
    api.setToken(token);

    const battletag = typeof params.battletag === 'string' ? params.battletag : '';

    Alert.alert(
      'Battle.net Linked!',
      battletag ? `Welcome, ${battletag}` : 'Your account has been linked.',
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={colors.bg.primary} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.primary } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
