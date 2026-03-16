import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography, shadows } from '../theme';

interface Props {
  id: number;
  name: string;
  iconUrl?: string | null;
  sourceType?: string | null;
  collected?: boolean;
  onPress?: () => void;
}

const sourceLabels: Record<string, string> = {
  raid: 'Raid', dungeon: 'Dungeon', world_boss: 'World Boss',
  reputation: 'Rep', achievement: 'Achieve', vendor: 'Vendor',
  promotion: 'Promo', quest: 'Quest', drop: 'Drop',
};

export default function MountCard({ name, iconUrl, sourceType, collected, onPress }: Props) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!iconUrl) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [iconUrl]);

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });
  const sourceColor = sourceType ? (colors.source[sourceType] || colors.text.tertiary) : colors.text.tertiary;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.container, collected && styles.collected, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        {iconUrl ? (
          <Image source={{ uri: iconUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <Animated.View style={[styles.placeholder, { opacity: shimmerOpacity }]}>
            <Ionicons name="sparkles-outline" size={28} color={colors.gold.dim} />
          </Animated.View>
        )}
        {collected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark-circle" size={18} color={colors.fel.primary} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        {sourceType && (
          <View style={[styles.sourceBadge, { backgroundColor: sourceColor + '20' }]}>
            <Text style={[styles.sourceText, { color: sourceColor }]}>{sourceLabels[sourceType] || sourceType}</Text>
          </View>
        )}
      </View>
      {collected === false && <View style={styles.overlay} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.bg.secondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden', ...shadows.card },
  collected: { borderColor: colors.fel.dim },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  imageWrap: { aspectRatio: 1, backgroundColor: colors.bg.primary, position: 'relative' },
  image: { width: '100%', height: '100%' },
  placeholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.tertiary },
  checkBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: colors.bg.primary + 'CC', borderRadius: radii.full, padding: 2 },
  info: { padding: spacing.sm, gap: spacing.xs },
  name: { ...typography.caption, color: colors.text.primary, fontWeight: '600' },
  sourceBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.sm },
  sourceText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,12,16,0.45)' },
});
