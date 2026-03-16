import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing, shadows } from '../theme';

type Variant = 'default' | 'gold' | 'arcane' | 'success' | 'elevated';

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  onPress?: () => void;
  style?: ViewStyle;
  noPadding?: boolean;
}

const borders: Record<Variant, string[]> = {
  default: [colors.border.default, colors.border.default],
  gold: [colors.gold.dim, colors.gold.primary, colors.gold.dim],
  arcane: [colors.arcane.dim, colors.arcane.primary, colors.arcane.dim],
  success: [colors.fel.dim, colors.fel.primary, colors.fel.dim],
  elevated: [colors.border.light, colors.border.light],
};

export default function Card({ children, variant = 'default', onPress, style, noPadding }: Props) {
  const hasBorder = variant !== 'default' && variant !== 'elevated';
  const inner = (
    <View style={[styles.inner, { backgroundColor: variant === 'elevated' ? colors.bg.tertiary : colors.bg.secondary }, !noPadding && styles.padded, style]}>
      {children}
    </View>
  );

  const card = hasBorder ? (
    <LinearGradient colors={borders[variant] as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
      {inner}
    </LinearGradient>
  ) : (
    <View style={[styles.plain, { borderColor: borders[variant][0] }]}>{inner}</View>
  );

  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>{card}</Pressable> : card;
}

const styles = StyleSheet.create({
  gradient: { borderRadius: radii.lg, padding: 1.5, ...shadows.card },
  plain: { borderRadius: radii.lg, borderWidth: 1, ...shadows.card },
  inner: { borderRadius: radii.lg - 1, overflow: 'hidden' },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
