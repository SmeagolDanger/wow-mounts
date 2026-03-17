import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, Image, ScrollView,
  Animated, PanResponder, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../theme';
import api from '../services/api';

const { width: SW } = Dimensions.get('window');
const IMG_W = SW - spacing.xl * 4;
const IMG_H = Math.round(IMG_W * 0.6);

const SOURCE_INFO: Record<string, { label: string; color: string; rank: number; reset: string; tip: string }> = {
  vendor:      { label: 'Vendor',       color: '#E2E8F0', rank: 1, reset: 'none',   tip: 'Buy directly from a vendor. Check WoWhead for the exact vendor location and cost.' },
  quest:       { label: 'Quest',        color: '#FDE047', rank: 2, reset: 'none',   tip: 'Reward from a questline. Typically one-time per character or account. Check WoWhead for the quest chain.' },
  achievement: { label: 'Achievement',  color: '#F5B800', rank: 3, reset: 'none',   tip: 'Earned by completing a specific in-game achievement. Some require collection milestones or challenge completions.' },
  reputation:  { label: 'Reputation',   color: '#4ADE80', rank: 4, reset: 'none',   tip: 'Purchased from a reputation vendor. Typically requires Exalted (sometimes Revered) standing with a specific faction. Check WoWhead for the exact faction and vendor.' },
  promotion:   { label: 'Promotion',    color: '#22D3EE', rank: 5, reset: 'none',   tip: 'Obtained through the Battle.net Shop, Twitch drops, or other promotions. Check the official WoW website for active offers.' },
  drop:        { label: 'World Drop',   color: '#94A3B8', rank: 6, reset: 'none',   tip: 'Random drop from open-world enemies with a very low drop rate. Often more efficient to purchase from the Auction House.' },
  dungeon:     { label: 'Dungeon',      color: '#38BDF8', rank: 7, reset: 'daily',  tip: 'Drops from a specific dungeon boss. Farmable once per day per character — run on alts to increase your weekly chances.' },
  raid:        { label: 'Raid',         color: '#C084FC', rank: 8, reset: 'weekly', tip: 'Drops from a raid boss. One attempt per character per week (weekly lockout). Farm with multiple characters to boost odds.' },
  world_boss:  { label: 'World Boss',   color: '#FB923C', rank: 9, reset: 'weekly', tip: 'Drops from a weekly world boss. Roughly 1–3% drop rate. Only one kill per character per week rewards loot.' },
};

const FACTION: Record<string, { label: string; color: string }> = {
  alliance: { label: 'Alliance Only', color: '#4A90D9' },
  horde:    { label: 'Horde Only',    color: '#C41F3B' },
};

const ZONE_MAP: Record<string, string> = {
  raid: 'Various Raids', dungeon: 'Various Dungeons', world_boss: 'World Bosses',
  reputation: 'Reputation Vendors', achievement: 'Achievements', vendor: 'Vendors', quest: 'Questlines',
};

interface Props {
  mountId: number | null;
  visible: boolean;
  onClose: () => void;
  onFarmChange?: () => void;
}

export default function MountDetailModal({ mountId, visible, onClose, onFarmChange }: Props) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [farmTaskId, setFarmTaskId] = useState<number | null>(null);
  const [farmLoading, setFarmLoading] = useState(false);

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => Animated.spring(scaleAnim, { toValue: 1.03, useNativeDriver: true }).start(),
      onPanResponderMove: (_, g) => pan.setValue({
        x: Math.max(-10, Math.min(10, g.dx / 12)),
        y: Math.max(-10, Math.min(10, -g.dy / 12)),
      }),
      onPanResponderRelease: () => Animated.parallel([
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      ]).start(),
    })
  ).current;

  const rotateX = pan.y.interpolate({ inputRange: [-10, 10], outputRange: ['-8deg', '8deg'] });
  const rotateY = pan.x.interpolate({ inputRange: [-10, 10], outputRange: ['-8deg', '8deg'] });

  useEffect(() => {
    if (visible && mountId) {
      setLoading(true);
      setDetail(null);
      setFarmTaskId(null);
      Promise.all([
        api.getMountDetail(mountId),
        api.getFarmTasks(),
      ]).then(([d, ft]) => {
        setDetail(d);
        const existing = ft.tasks.find((t: any) => t.mount_id === mountId);
        setFarmTaskId(existing?.id ?? null);
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [visible, mountId]);

  if (!visible) return null;

  const icon = detail?.icon_url;
  const sourceType = detail?.source?.type?.toLowerCase();
  const info = sourceType ? SOURCE_INFO[sourceType] : null;
  const sourceColor = info?.color ?? colors.text.secondary;

  // Faction: Blizzard returns faction.type as uppercase
  const factionRaw = (detail?.faction?.type ?? detail?.faction?.name ?? '').toLowerCase();
  const factionInfo = factionRaw ? FACTION[factionRaw] : null;

  const diffLabel = !info ? null : info.rank <= 3 ? 'Easy' : info.rank <= 6 ? 'Moderate' : 'Hard';
  const diffColor = !info ? colors.text.tertiary : info.rank <= 3 ? colors.fel.primary : info.rank <= 6 ? colors.gold.primary : colors.fire.primary;

  const addToFarm = async () => {
    if (!detail || farmLoading) return;
    setFarmLoading(true);
    try {
      const reset = sourceType === 'raid' || sourceType === 'world_boss' ? 'weekly' : sourceType === 'dungeon' ? 'daily' : 'none';
      const zone = ZONE_MAP[sourceType ?? ''] ?? 'Unknown';
      await api.createFarmTask({ title: detail.name, mount_id: detail.id, source_type: sourceType, zone_name: zone, reset_type: reset });
      const ft = await api.getFarmTasks();
      const existing = ft.tasks.find((t: any) => t.mount_id === mountId);
      setFarmTaskId(existing?.id ?? null);
      onFarmChange?.();
    } catch {} finally { setFarmLoading(false); }
  };

  const removeFromFarm = async () => {
    if (farmTaskId === null || farmLoading) return;
    setFarmLoading(true);
    try {
      await api.deleteFarmTask(farmTaskId);
      setFarmTaskId(null);
      onFarmChange?.();
    } catch {} finally { setFarmLoading(false); }
  };

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
                {/* Mount image — rectangular landscape viewer */}
                <View style={z.viewerWrap}>
                  <Animated.View
                    {...panResponder.panHandlers}
                    style={[z.viewer, { transform: [{ perspective: 900 }, { rotateX }, { rotateY }, { scale: scaleAnim }] }]}
                  >
                    <View style={[z.glow, { shadowColor: sourceColor }]} />
                    {icon
                      ? <Image source={{ uri: icon }} style={z.mountImg} resizeMode="cover" />
                      : <View style={z.noImg}><Ionicons name="horse" size={52} color={colors.text.tertiary} /></View>
                    }
                  </Animated.View>
                  <Text style={z.dragHint}>drag to rotate</Text>
                </View>

                {/* Name */}
                <Text style={z.name}>{detail.name}</Text>

                {/* Badges row */}
                <View style={z.badgeRow}>
                  {factionInfo && (
                    <View style={[z.badge, z.factionBadge, { borderColor: factionInfo.color + '70', backgroundColor: factionInfo.color + '22' }]}>
                      <Ionicons name="shield" size={14} color={factionInfo.color} />
                      <Text style={[z.badgeT, z.factionBadgeT, { color: factionInfo.color }]}>{factionInfo.label}</Text>
                    </View>
                  )}
                  {info && (
                    <View style={[z.badge, { borderColor: sourceColor + '50', backgroundColor: sourceColor + '18' }]}>
                      <View style={[z.badgeDot, { backgroundColor: sourceColor }]} />
                      <Text style={[z.badgeT, { color: sourceColor }]}>{info.label}</Text>
                    </View>
                  )}
                  {info?.reset && info.reset !== 'none' && (
                    <View style={z.badge}>
                      <Ionicons name={info.reset === 'weekly' ? 'calendar-outline' : 'sunny-outline'} size={10} color={colors.text.tertiary} />
                      <Text style={z.badgeTDim}>{info.reset === 'weekly' ? 'Weekly' : 'Daily'} reset</Text>
                    </View>
                  )}
                </View>

                {/* Difficulty bar */}
                {info && (
                  <View style={z.diffRow}>
                    <Text style={z.diffLabel}>DIFFICULTY</Text>
                    <View style={z.diffBar}>
                      {[...Array(9)].map((_, i) => (
                        <View key={i} style={[z.pip, i < info.rank && { backgroundColor: diffColor, opacity: 1 }]} />
                      ))}
                    </View>
                    <Text style={[z.diffVal, { color: diffColor }]}>{diffLabel}</Text>
                  </View>
                )}

                {/* How to obtain */}
                {info && (
                  <View style={z.block}>
                    <Text style={z.blockLabel}>HOW TO OBTAIN</Text>
                    <Text style={z.blockText}>{info.tip}</Text>
                  </View>
                )}

                {/* Faction restriction warning */}
                {factionInfo && (
                  <View style={[z.block, z.blockWarning, { borderColor: factionInfo.color + '50', backgroundColor: factionInfo.color + '12' }]}>
                    <View style={z.blockHeader}>
                      <Ionicons name="warning-outline" size={14} color={factionInfo.color} />
                      <Text style={[z.blockLabel, { color: factionInfo.color }]}>FACTION RESTRICTED</Text>
                    </View>
                    <Text style={z.blockText}>
                      Only <Text style={{ color: factionInfo.color, fontWeight: '700' }}>{factionInfo.label.replace(' Only', '')}</Text> players can use this mount.
                    </Text>
                  </View>
                )}

                {/* Lore */}
                {detail.description && (
                  <View style={z.block}>
                    <Text style={z.blockLabel}>LORE</Text>
                    <Text style={z.loreText}>{detail.description}</Text>
                  </View>
                )}

                {/* Farm button */}
                {farmTaskId !== null ? (
                  <Pressable
                    onPress={removeFromFarm}
                    disabled={farmLoading}
                    style={({ pressed }) => [z.farmBtn, z.farmBtnRemove, pressed && { opacity: 0.8 }]}
                  >
                    {farmLoading
                      ? <ActivityIndicator size="small" color={colors.fire.primary} />
                      : <><Ionicons name="trash-outline" size={18} color={colors.fire.primary} /><Text style={[z.farmBtnText, { color: colors.fire.primary }]}>Remove from Farm List</Text></>
                    }
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={addToFarm}
                    disabled={farmLoading}
                    style={({ pressed }) => [z.farmBtn, pressed && { opacity: 0.85 }]}
                  >
                    {farmLoading
                      ? <ActivityIndicator size="small" color={colors.text.inverse} />
                      : <><Ionicons name="add-circle" size={18} color={colors.text.inverse} /><Text style={z.farmBtnText}>Add to Farm List</Text></>
                    }
                  </Pressable>
                )}
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
  backdropPress: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,7,14,0.93)' },
  sheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '90%',
    paddingBottom: 44,
    borderTopWidth: 1,
    borderColor: colors.border.subtle,
  },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border.subtle, alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  closeBtn: { position: 'absolute', top: 14, right: 16, zIndex: 10, backgroundColor: colors.bg.elevated, borderRadius: radii.full, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl, alignItems: 'center' },
  center: { paddingVertical: 80, alignItems: 'center', gap: spacing.md },
  centerText: { ...typography.body, color: colors.text.secondary },

  // Viewer — rectangular
  viewerWrap: { alignItems: 'center', marginBottom: spacing.lg, width: '100%' },
  viewer: {
    width: IMG_W,
    height: IMG_H,
    borderRadius: radii.lg,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: radii.lg, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 10 },
  mountImg: { width: '100%', height: '100%' },
  noImg: { alignItems: 'center', justifyContent: 'center' },
  dragHint: { fontSize: 10, color: colors.text.tertiary, marginTop: spacing.xs, letterSpacing: 0.3 },

  name: { fontSize: 22, fontWeight: '700', color: colors.text.primary, textAlign: 'center', letterSpacing: -0.3, marginBottom: spacing.md },

  // Badges
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.lg },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.tertiary },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeT: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  badgeTDim: { fontSize: 11, fontWeight: '600', color: colors.text.tertiary },
  factionBadge: { paddingHorizontal: spacing.lg, paddingVertical: 8, borderWidth: 1.5 },
  factionBadgeT: { fontSize: 13, letterSpacing: 0.6 },

  // Difficulty bar
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, width: '100%', marginBottom: spacing.lg, paddingHorizontal: spacing.xs },
  diffLabel: { fontSize: 9, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 1.2, textTransform: 'uppercase', width: 64 },
  diffBar: { flex: 1, flexDirection: 'row', gap: 3, alignItems: 'center' },
  pip: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.bg.elevated, opacity: 0.4 },
  diffVal: { fontSize: 11, fontWeight: '700', width: 56, textAlign: 'right' },

  // Info blocks
  block: {
    width: '100%', marginBottom: spacing.md,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.xs,
  },
  blockWarning: { gap: spacing.sm },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  blockLabel: { fontSize: 9, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 1.2, textTransform: 'uppercase' },
  blockText: { ...typography.caption, color: colors.text.secondary, lineHeight: 18 },
  loreText: { ...typography.caption, color: colors.text.secondary, lineHeight: 18, fontStyle: 'italic' },

  // Farm buttons
  farmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, width: '100%', marginTop: spacing.sm,
    backgroundColor: colors.gold.primary,
    borderRadius: radii.md, paddingVertical: 14,
    ...shadows.card,
  },
  farmBtnRemove: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.fire.dim,
  },
  farmBtnText: { fontSize: 15, fontWeight: '700', color: colors.text.inverse },
});
