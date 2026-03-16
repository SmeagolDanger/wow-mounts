/**
 * MountDetailModal — Full-screen mount detail with interactive parallax image,
 * description, source info, and "Add to Farm" action.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, Image, ScrollView,
  Animated, PanResponder, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, spacing, typography, radii, shadows } from '../theme';
import api from '../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_W * 0.65;

interface Props {
  mountId: number | null;
  visible: boolean;
  onClose: () => void;
  onAddToFarm: (mount: { id: number; name: string; source_type?: string }) => void;
}

const sourceLabels: Record<string, string> = {
  raid: 'Raid', dungeon: 'Dungeon', world_boss: 'World Boss',
  reputation: 'Reputation', achievement: 'Achievement', vendor: 'Vendor',
  promotion: 'Promotion', quest: 'Quest', drop: 'World Drop',
};

export default function MountDetailModal({ mountId, visible, onClose, onAddToFarm }: Props) {
  const [detail, setDetail] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);

  // Interactive tilt
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Animated.spring(scale, { toValue: 1.08, useNativeDriver: true }).start();
      },
      onPanResponderMove: (_, gesture) => {
        // Map finger position to tilt (-15 to 15 degrees)
        const rotateX = Math.max(-15, Math.min(15, -gesture.dy / 8));
        const rotateY = Math.max(-15, Math.min(15, gesture.dx / 8));
        pan.setValue({ x: rotateY, y: rotateX });
      },
      onPanResponderRelease: () => {
        Animated.parallel([
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  const rotateX = pan.y.interpolate({ inputRange: [-15, 15], outputRange: ['-15deg', '15deg'] });
  const rotateY = pan.x.interpolate({ inputRange: [-15, 15], outputRange: ['-15deg', '15deg'] });

  useEffect(() => {
    if (visible && mountId) {
      setLoading(true);
      setDetail(null);
      api.getMountDetail(mountId).then(setDetail).catch(() => {}).finally(() => setLoading(false));
    }
  }, [visible, mountId]);

  if (!visible) return null;

  const iconUrl = detail?.icon_url;
  const sourceType = detail?.source?.type;
  const sourceColor = sourceType ? (colors.source[sourceType] || colors.text.secondary) : colors.text.secondary;
  const faction = detail?.faction?.name;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Close */}
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.text.secondary} />
          </Pressable>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.gold.primary} />
                <Text style={styles.loadingText}>Loading mount data...</Text>
              </View>
            ) : detail ? (
              <>
                {/* Interactive 3D-ish mount viewer */}
                <View style={styles.viewerWrap}>
                  <Animated.View
                    {...panResponder.panHandlers}
                    style={[
                      styles.viewer,
                      {
                        transform: [
                          { perspective: 800 },
                          { rotateX },
                          { rotateY },
                          { scale },
                        ],
                      },
                    ]}
                  >
                    {/* Glow ring */}
                    <View style={[styles.glowRing, { shadowColor: sourceColor }]} />
                    {iconUrl ? (
                      <Image source={{ uri: iconUrl }} style={styles.mountImage} resizeMode="contain" />
                    ) : (
                      <View style={styles.noImage}>
                        <Ionicons name="image-outline" size={64} color={colors.text.tertiary} />
                      </View>
                    )}
                  </Animated.View>
                  <Text style={styles.dragHint}>Touch & drag to rotate</Text>
                </View>

                {/* Name + faction */}
                <Text style={styles.mountName}>{detail.name}</Text>
                {faction && (
                  <Text style={[styles.faction, { color: faction === 'Alliance' ? '#0070DD' : faction === 'Horde' ? '#C41F3B' : colors.text.secondary }]}>
                    {faction}
                  </Text>
                )}

                {/* Source badge */}
                {sourceType && (
                  <View style={[styles.sourceBadge, { backgroundColor: sourceColor + '18', borderColor: sourceColor + '40' }]}>
                    <Ionicons name={sourceType === 'raid' ? 'skull-outline' : sourceType === 'dungeon' ? 'key-outline' : sourceType === 'achievement' ? 'trophy-outline' : 'location-outline'} size={14} color={sourceColor} />
                    <Text style={[styles.sourceText, { color: sourceColor }]}>{sourceLabels[sourceType] || sourceType}</Text>
                  </View>
                )}

                {/* Description */}
                {detail.description && (
                  <View style={styles.descSection}>
                    <Text style={styles.sectionLabel}>LORE</Text>
                    <Text style={styles.description}>{detail.description}</Text>
                  </View>
                )}

                {/* Stats row */}
                <View style={styles.statsRow}>
                  {detail.should_exclude_if_uncollected != null && (
                    <View style={styles.stat}>
                      <Text style={styles.statLabel}>ID</Text>
                      <Text style={styles.statValue}>{detail.id}</Text>
                    </View>
                  )}
                  {detail.creature_displays?.length > 0 && (
                    <View style={styles.stat}>
                      <Text style={styles.statLabel}>DISPLAY</Text>
                      <Text style={styles.statValue}>{detail.creature_displays[0].id}</Text>
                    </View>
                  )}
                </View>

                {/* Add to Farm */}
                <Pressable
                  onPress={() => onAddToFarm({ id: detail.id, name: detail.name, source_type: sourceType })}
                  style={({ pressed }) => [styles.farmBtn, pressed && styles.farmBtnPressed]}
                >
                  <Ionicons name="add-circle" size={20} color={colors.bg.primary} />
                  <Text style={styles.farmBtnText}>Add to Farm List</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.loadingWrap}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.loadingText}>Mount not found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.bg.modal, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg.secondary, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: '92%', paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border.light, alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  closeBtn: { position: 'absolute', top: spacing.lg, right: spacing.lg, zIndex: 10, backgroundColor: colors.bg.tertiary, borderRadius: radii.full, padding: spacing.sm },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl, alignItems: 'center' },
  loadingWrap: { paddingVertical: spacing.xxxl * 2, alignItems: 'center', gap: spacing.lg },
  loadingText: { ...typography.body, color: colors.text.secondary },

  // Viewer
  viewerWrap: { alignItems: 'center', marginBottom: spacing.xl },
  viewer: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: IMAGE_SIZE / 2, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border.light, overflow: 'hidden' },
  glowRing: { ...StyleSheet.absoluteFillObject, borderRadius: IMAGE_SIZE / 2, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 30, elevation: 10 },
  mountImage: { width: '85%', height: '85%' },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  dragHint: { ...typography.caption, color: colors.text.tertiary, marginTop: spacing.sm, fontSize: 11 },

  // Info
  mountName: { ...typography.display, fontSize: 24, textAlign: 'center', marginBottom: spacing.xs },
  faction: { ...typography.caption, fontWeight: '700', fontSize: 13, marginBottom: spacing.md },
  sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.full, borderWidth: 1, marginBottom: spacing.xl },
  sourceText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  descSection: { width: '100%', marginBottom: spacing.xl },
  sectionLabel: { ...typography.label, color: colors.gold.dim, marginBottom: spacing.sm },
  description: { ...typography.body, color: colors.text.secondary, lineHeight: 24, fontStyle: 'italic' },

  statsRow: { flexDirection: 'row', gap: spacing.xxl, marginBottom: spacing.xl },
  stat: { alignItems: 'center', gap: 2 },
  statLabel: { ...typography.label, fontSize: 10 },
  statValue: { ...typography.subheading, color: colors.text.primary },

  farmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.gold.primary, borderRadius: radii.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl, width: '100%', ...shadows.card },
  farmBtnPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  farmBtnText: { fontSize: 16, fontWeight: '700', color: colors.bg.primary },
});
