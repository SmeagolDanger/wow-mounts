/**
 * Root Layout — App-wide providers, status bar, and safe area configuration.
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { colors } from '../theme';
import api from '../services/api';

// Generate a device ID for anonymous auth (or use expo-device)
function getDeviceId(): string {
  // In production, use expo-application or expo-device for a stable ID
  // For now, generate and persist via SecureStore
  return `device_${Math.random().toString(36).substring(2, 15)}`;
}

export default function RootLayout() {
  useEffect(() => {
    // Initialize API and authenticate
    (async () => {
      await api.init();
      try {
        await api.getMe();
      } catch {
        // No valid token — register with device ID
        const deviceId = getDeviceId();
        await api.deviceAuth(deviceId);
      }
    })();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor={colors.bg.primary} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.primary } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
