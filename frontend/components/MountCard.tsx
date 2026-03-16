/**
 * MountCard — Grid tile for mount collection display.
 * Shows mount icon, name, source badge, and collected status.
 */

import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography, shadows } from '../theme';

interface MountCardProps {
  id: number;
  name: string;
  iconUrl?: string | null;
  sourceType?: string | null;
  collected?: boolean;
  onPress?: () => void;
}

const sourceLabels: Record<string, string> = {
  raid: 'Raid',
  dungeon: 'Dungeon',
  world_boss: 'World Boss',
  reputation: 'Rep',
  achievement: 'Achievement',
  vendor: 'Vendor',
  promotion: 'Promo',
  quest: 'Quest',
  drop: 'Drop',
};

export default function MountCard({ id, name, iconUrl, sourceType, collected, onPress }: MountCardProps) {
  const sourceColor = sourceType
    ? (colors.source as Record<string, string>)[sourceType] || colors.text.tertiary
    : colors.text.tertiary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        collected && styles.collected,
        pressed && styles.pressed,
      ]}
    >
      {/* Mount Image */}
      <View style={styles.imageContainer}>
        {iconUrl ? (
          <Image source={{ uri: iconUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="help-circle-outline" size={32} color={colors.text.tertiary} />
          </View>
        )}

        {/* Collected checkmark */}
        {collected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark-circle" size={20} color={colors.fel.primary} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        {sourceType && (
          <View style={[styles.sourceBadge, { backgroundColor: sourceColor + '20' }]}>
            <Text style={[styles.sourceText, { color: sourceColor }]}>
              {sourceLabels[sourceType] || sourceType}
            </Text>
          </View>
        )}
      </View>

      {/* Uncollected overlay */}
      {collected === false && <View style={styles.uncollectedOverlay} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.bg.secondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    ...shadows.card,
  },
  collected: {
    borderColor: colors.fel.dim,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.bg.primary,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.tertiary,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.bg.primary + 'CC',
    borderRadius: radii.full,
    padding: 2,
  },
  info: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  name: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  uncollectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 12, 16, 0.45)',
  },
});
