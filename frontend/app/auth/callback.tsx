/**
 * auth/callback — Expo Router catches the deep link here.
 * Stores the token and redirects back to the main app.
 */

import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import api from '../../services/api';
import { colors, typography, spacing } from '../../theme';

export default function AuthCallback() {
  const params = useLocalSearchParams<{ token?: string; battletag?: string; error?: string }>();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (params.error) {
        // OAuth failed — go back
        router.replace('/(tabs)');
        return;
      }

      if (params.token) {
        await SecureStore.setItemAsync('auth_token', params.token);
        api.setToken(params.token);
      }

      // Small delay so the user sees the success state
      setTimeout(() => {
        router.replace('/(tabs)/profile');
      }, 800);
    })();
  }, [params]);

  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color={colors.gold.primary} />
      <Text style={s.title}>
        {params.error ? 'Login Failed' : params.battletag ? `Welcome, ${params.battletag}!` : 'Linking account...'}
      </Text>
      <Text style={s.sub}>Redirecting to app...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  title: { ...typography.heading, color: colors.gold.primary, textAlign: 'center' },
  sub: { ...typography.caption, color: colors.text.secondary },
});
