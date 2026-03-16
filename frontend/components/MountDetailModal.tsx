import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, Image, ScrollView,
  Animated, PanResponder, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../theme';
import api from '../services/api';

const { width: SW } = Dimensions.get('window');
const IMG = SW * 0.5;

const sourceLabels: Record<string, string> = {
  raid: 'Raid', dungeon: 'Dungeon', world_boss: 'World Boss',
  reputation: 'Reputation', achievement: 'Achievement', vendor: 'Vendor',
  quest: 'Quest', drop: 'World Drop', promotion: 'Promotion',
};

interface Props {
  mountId: number | null;
  visible: boolean;
  onClose: () => void;
  onAddToFarm: (m: { id: number; name: string; source_type?: string }) => void;
}

export default function MountDetailModal({ mountId, visible, onClose, onAddToFarm }: Props) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  // Parallax tilt
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Animated.spring(scale, { toValue: 1.05, useNativeDriver: true }).start();
      },
      onPanResponderMove: (_, g) => {
        pan.setValue({
          x: Math.max(-10, Math.min(10, g.dx / 12)),
          y: Math.max(-10, Math.min(10, -g.dy / 12)),
        });
      },
      onPanResponderRelease: () => {
        Animated.parallel([
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  const rotateX = pan.y.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });
  const rotateY = pan.x.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });

  useEffect(() => {
    if (visible && mountId) {
      setLoading(true);
      setDetail(null);
      setAdded(false);
      api.getMountDetail(mountId).then(setDetail).catch(() => {}).finally(() => setLoading(false));
    }
  }, [visible, mountId]);

  if (!visible) return null;

  const icon = detail?.icon_url;
  const sourceType = detail?.source?.type;
  const sourceColor = sourceType ? (colors.source[sourceType] || colors.text.secondary) : colors.text.secondary;
  const faction = detail?.faction?.name;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={z.backdrop}>
        <Pressable style={z.backdropPress} onPress={onClose} />
        <View style={z.sheet}>
          <View style={z.handle} />

          <Pressable onPress={onClose} style={z.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={18} color={colors.text.secondary} />
          </Pressable>

          <ScrollView contentContainerStyle={z.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={z.center}>
                <ActivityIndicator size="large" color={colors.gold.primary} />
                <Text style={z.centerText}>Loading...</Text>
              </View>
            ) : detail ? (
              <>
                {/* Interactive mount viewer */}
                <View style={z.viewerWrap}>
                  <Animated.View
                    {...panResponder.panHandlers}
                    style={[
                      z.viewer,
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
                    {/* Colored glow based on source */}
                    <View style={[z.glow, { shadowColor: sourceColor }]} />
                    {icon ? (
                      <Image source={{ uri: icon }} style={z.mountImg} resizeMode="contain" />
                    ) : (
                      <View style={z.noImg}>
                        <Ionicons name="image-outline" size={48} color={colors.text.tertiary} />
                        <Text style={z.noImgText}>Loading image...</Text>
                      </View>
                    )}
                  </Animated.View>
                  <Text style={z.dragHint}>Touch & drag to rotate</Text>
                </View>

                {/* Mount name */}
                <Text style={z.name}>{detail.name}</Text>

                {/* Faction */}
                {faction && (
                  <Text style={[z.faction, {
                    color: faction === 'Alliance' ? '#4A90D9' : faction === 'Horde' ? '#C41F3B' : colors.text.secondary
                  }]}>
                    {faction}
                  </Text>
                )}

                {/* Source badge */}
                {sourceType && (
                  <View style={[z.srcBadge, { borderColor: sourceColor + '50' }]}>
                    <View style={[z.srcDot, { backgroundColor: sourceColor }]} />
                    <Text style={[z.srcText, { color: sourceColor }]}>
                      {sourceLabels[sourceType] || sourceType}
                    </Text>
                  </View>
                )}

                {/* Description / Lore */}
                {detail.description && (
                  <View style={z.loreWrap}>
                    <Text style={z.loreLabel}>LORE</Text>
                    <Text style={z.loreText}>{detail.description}</Text>
                  </View>
                )}

                {/* Add to farm button */}
                <Pressable
                  onPress={() => {
                    onAddToFarm({ id: detail.id, name: detail.name, source_type: sourceType });
                    setAdded(true);
                  }}
                  disabled={added}
                  style={({ pressed }) => [
                    z.farmBtn,
                    added && z.farmBtnDone,
                    pressed && !added && z.farmBtnPressed,
                  ]}
                >
                  <Ionicons
                    name={added ? 'checkmark-circle' : 'add-circle'}
                    size={18}
                    color={added ? colors.fel.bright : colors.text.inverse}
                  />
                  <Text style={[z.farmBtnText, added && z.farmBtnTextDone]}>
                    {added ? 'Added to Farm!' : 'Add to Farm List'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <View style={z.center}>
                <Ionicons name="alert-circle-outline" size={40} color={colors.text.tertiary} />
                <Text style={z.centerText}>Mount not found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const z = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropPress: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg.modal },
  sheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '88%',
    paddingBottom: 44,
    borderTopWidth: 1,
    borderColor: colors.border.subtle,
  },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border.subtle, alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  closeBtn: { position: 'absolute', top: 14, right: 16, zIndex: 10, backgroundColor: colors.bg.elevated, borderRadius: radii.full, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl, alignItems: 'center' },

  center: { paddingVertical: 80, alignItems: 'center', gap: spacing.md },
  centerText: { ...typography.body, color: colors.text.secondary },

  // Viewer
  viewerWrap: { alignItems: 'center', marginBottom: spacing.xxl },
  viewer: {
    width: IMG, height: IMG, borderRadius: IMG / 2,
    backgroundColor: colors.bg.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: IMG / 2, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 8 },
  mountImg: { width: '78%', height: '78%' },
  noImg: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  noImgText: { ...typography.caption, color: colors.text.tertiary, fontSize: 10 },
  dragHint: { fontSize: 10, color: colors.text.tertiary, marginTop: spacing.sm, letterSpacing: 0.3 },

  // Info
  name: { fontSize: 22, fontWeight: '700', color: colors.text.primary, textAlign: 'center', letterSpacing: -0.3, marginBottom: spacing.xs },
  faction: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: spacing.md },

  srcBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: 8,
    borderRadius: radii.full, borderWidth: 1,
    backgroundColor: colors.bg.tertiary,
    marginBottom: spacing.xl,
  },
  srcDot: { width: 6, height: 6, borderRadius: 3 },
  srcText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  loreWrap: { width: '100%', marginBottom: spacing.xl },
  loreLabel: { ...typography.label, color: colors.gold.dim, marginBottom: spacing.sm },
  loreText: { ...typography.body, color: colors.text.secondary, lineHeight: 22, fontStyle: 'italic' },

  // Farm button
  farmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, width: '100%',
    backgroundColor: colors.gold.primary,
    borderRadius: radii.md, paddingVertical: 14,
    ...shadows.card,
  },
  farmBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  farmBtnDone: { backgroundColor: colors.fel.muted, borderWidth: 1, borderColor: colors.fel.dim },
  farmBtnText: { fontSize: 15, fontWeight: '700', color: colors.text.inverse },
  farmBtnTextDone: { color: colors.fel.bright },
});
