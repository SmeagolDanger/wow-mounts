import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, Image, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../theme';
import api, { PetDetail, PetAbility, PetSummary } from '../services/api';

const PET_TYPE_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  Humanoid:    { icon: 'person',         color: '#E2C088' },
  Dragonkin:   { icon: 'flame',          color: '#C084FC' },
  Flying:      { icon: 'airplane',       color: '#93C5FD' },
  Undead:      { icon: 'skull',          color: '#A78BFA' },
  Critter:     { icon: 'leaf',           color: '#86EFAC' },
  Magic:       { icon: 'sparkles',       color: '#67E8F9' },
  Elemental:   { icon: 'bonfire',        color: '#FCA5A5' },
  Beast:       { icon: 'paw',            color: '#FCD34D' },
  Aquatic:     { icon: 'water',          color: '#5EEAD4' },
  Mechanical:  { icon: 'construct',      color: '#D4D4D8' },
};

const QUALITY_COLORS: Record<string, { label: string; color: string }> = {
  POOR:      { label: 'Poor',      color: '#9D9D9D' },
  COMMON:    { label: 'Common',    color: '#FFFFFF' },
  UNCOMMON:  { label: 'Uncommon',  color: '#1EFF00' },
  RARE:      { label: 'Rare',      color: '#0070DD' },
  EPIC:      { label: 'Epic',      color: '#A335EE' },
  LEGENDARY: { label: 'Legendary', color: '#FF8000' },
};

const BREED_NAMES: Record<number, { short: string; desc: string }> = {
  3:  { short: 'B/B', desc: 'Balanced' },
  4:  { short: 'P/P', desc: 'Power / Power' },
  5:  { short: 'S/S', desc: 'Speed / Speed' },
  6:  { short: 'H/H', desc: 'Health / Health' },
  7:  { short: 'H/P', desc: 'Health / Power' },
  8:  { short: 'P/S', desc: 'Power / Speed' },
  9:  { short: 'H/S', desc: 'Health / Speed' },
  10: { short: 'P/B', desc: 'Power / Balanced' },
  11: { short: 'S/B', desc: 'Speed / Balanced' },
  12: { short: 'H/B', desc: 'Health / Balanced' },
};

interface Props {
  pet: PetSummary | null;
  visible: boolean;
  onClose: () => void;
  iconUrl?: string | null;
}

export default function PetDetailModal({ pet, visible, onClose, iconUrl }: Props) {
  const [detail, setDetail] = useState<PetDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && pet) {
      setLoading(true);
      setDetail(null);
      api.getPetDetail(pet.species_id)
        .then(setDetail)
        .catch(e => console.error('Pet detail fetch:', e))
        .finally(() => setLoading(false));
    }
  }, [visible, pet]);

  if (!visible || !pet) return null;

  const qInfo = QUALITY_COLORS[pet.quality] || QUALITY_COLORS.COMMON;
  const breed = pet.breed_id ? BREED_NAMES[pet.breed_id] : null;
  const typeInfo = detail?.battle_pet_type?.name ? PET_TYPE_ICONS[detail.battle_pet_type.name] : null;
  const displayImg = detail?.zoom_url || detail?.icon_url || iconUrl;

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
                <ActivityIndicator size="large" color={colors.fel.primary} />
                <Text style={z.centerText}>Loading pet info...</Text>
              </View>
            ) : (
              <>
                {/* Pet image */}
                <View style={z.imgWrap}>
                  <View style={[z.imgBorder, { borderColor: qInfo.color + '50' }]}>
                    {displayImg ? (
                      <Image source={{ uri: displayImg }} style={z.img} resizeMode="cover" />
                    ) : (
                      <View style={z.noImg}><Ionicons name="paw" size={48} color={colors.text.tertiary} /></View>
                    )}
                  </View>
                </View>

                {/* Name + Level */}
                <Text style={z.name}>{pet.name}</Text>
                <Text style={z.level}>Level {pet.level}</Text>

                {/* Type + Quality + Breed badges */}
                <View style={z.badgeRow}>
                  {typeInfo && detail?.battle_pet_type && (
                    <View style={[z.badge, { backgroundColor: typeInfo.color + '15', borderColor: typeInfo.color + '40' }]}>
                      <Ionicons name={typeInfo.icon} size={12} color={typeInfo.color} />
                      <Text style={[z.badgeT, { color: typeInfo.color }]}>{detail.battle_pet_type.name}</Text>
                    </View>
                  )}
                  <View style={[z.badge, { backgroundColor: qInfo.color + '15', borderColor: qInfo.color + '40' }]}>
                    <View style={[z.dot, { backgroundColor: qInfo.color }]} />
                    <Text style={[z.badgeT, { color: qInfo.color }]}>{qInfo.label}</Text>
                  </View>
                  {breed && (
                    <View style={z.badge}>
                      <Text style={z.badgeT}>{breed.short}</Text>
                      <Text style={z.badgeSub}>{breed.desc}</Text>
                    </View>
                  )}
                </View>

                {/* Tags: capturable, tradable */}
                {detail && (
                  <View style={z.tagRow}>
                    {detail.is_capturable && (
                      <View style={z.tag}>
                        <Ionicons name="locate-outline" size={11} color={colors.fel.primary} />
                        <Text style={[z.tagT, { color: colors.fel.primary }]}>Capturable</Text>
                      </View>
                    )}
                    {detail.is_tradable && (
                      <View style={z.tag}>
                        <Ionicons name="swap-horizontal-outline" size={11} color={colors.frost.primary} />
                        <Text style={[z.tagT, { color: colors.frost.primary }]}>Tradable</Text>
                      </View>
                    )}
                    {!detail.is_tradable && (
                      <View style={z.tag}>
                        <Ionicons name="lock-closed-outline" size={11} color={colors.text.tertiary} />
                        <Text style={z.tagT}>Not Tradable</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Source */}
                {detail?.source?.name && (
                  <View style={z.block}>
                    <Text style={z.blockLabel}>SOURCE</Text>
                    <Text style={z.blockText}>{detail.source.name}</Text>
                  </View>
                )}

                {/* Description / Lore */}
                {detail?.description && (
                  <View style={z.block}>
                    <Text style={z.blockLabel}>DESCRIPTION</Text>
                    <Text style={z.loreText}>{detail.description}</Text>
                  </View>
                )}

                {/* Abilities */}
                {detail && detail.abilities.length > 0 && (
                  <View style={z.abSection}>
                    <Text style={z.blockLabel}>ABILITIES</Text>
                    {detail.abilities
                      .sort((a, b) => a.slot - b.slot || a.required_level - b.required_level)
                      .map((ab, idx) => (
                        <AbilityCard key={ab.id || idx} ability={ab} petLevel={pet.level} />
                      ))
                    }
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AbilityCard({ ability, petLevel }: { ability: PetAbility; petLevel: number }) {
  const locked = petLevel < ability.required_level;
  const abType = ability.pet_type?.name ? PET_TYPE_ICONS[ability.pet_type.name] : null;

  return (
    <View style={[z.abCard, locked && z.abLocked]}>
      <View style={z.abHeader}>
        <View style={z.abNameRow}>
          {abType && <Ionicons name={abType.icon} size={14} color={locked ? colors.text.tertiary : abType.color} />}
          <Text style={[z.abName, locked && z.abNameLocked]}>{ability.name}</Text>
        </View>
        <View style={z.abMeta}>
          {ability.cooldown > 0 && (
            <View style={z.abMetaItem}>
              <Ionicons name="time-outline" size={10} color={colors.text.tertiary} />
              <Text style={z.abMetaT}>{ability.cooldown}cd</Text>
            </View>
          )}
          {ability.rounds > 1 && (
            <View style={z.abMetaItem}>
              <Ionicons name="repeat-outline" size={10} color={colors.text.tertiary} />
              <Text style={z.abMetaT}>{ability.rounds}rd</Text>
            </View>
          )}
        </View>
      </View>
      {ability.description && (
        <Text style={z.abDesc} numberOfLines={3}>{ability.description.replace(/\|[^|]*\|/g, '')}</Text>
      )}
      <View style={z.abFooter}>
        <Text style={z.abSlot}>Slot {ability.slot + 1}</Text>
        {locked ? (
          <View style={z.abLockBadge}>
            <Ionicons name="lock-closed" size={9} color={colors.text.tertiary} />
            <Text style={z.abLockT}>Lv {ability.required_level}</Text>
          </View>
        ) : (
          <Text style={z.abUnlocked}>Unlocked</Text>
        )}
      </View>
    </View>
  );
}

const z = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropPress: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg.modal },
  sheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '92%',
    paddingBottom: 44,
    borderTopWidth: 1,
    borderColor: colors.border.subtle,
  },
  handle: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border.subtle, alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  closeBtn: { position: 'absolute', top: 14, right: 16, zIndex: 10, backgroundColor: colors.bg.elevated, borderRadius: radii.full, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl, alignItems: 'center' },
  center: { paddingVertical: 80, alignItems: 'center', gap: spacing.md },
  centerText: { ...typography.body, color: colors.text.secondary },

  // Image
  imgWrap: { marginBottom: spacing.lg, alignItems: 'center' },
  imgBorder: { width: 120, height: 120, borderRadius: radii.xl, borderWidth: 2, overflow: 'hidden', backgroundColor: colors.bg.tertiary },
  img: { width: '100%', height: '100%' },
  noImg: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },

  // Name/Level
  name: { fontSize: 22, fontWeight: '700', color: colors.text.primary, textAlign: 'center', letterSpacing: -0.3 },
  level: { fontSize: 14, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.md },

  // Badges
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.tertiary },
  badgeT: { fontSize: 11, fontWeight: '700', color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  badgeSub: { fontSize: 9, fontWeight: '500', color: colors.text.tertiary },
  dot: { width: 6, height: 6, borderRadius: 3 },

  // Tags
  tagRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.lg },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.full, backgroundColor: colors.bg.tertiary },
  tagT: { fontSize: 10, fontWeight: '600', color: colors.text.tertiary },

  // Blocks
  block: {
    width: '100%', marginBottom: spacing.md,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.xs,
  },
  blockLabel: { fontSize: 9, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  blockText: { ...typography.body, color: colors.text.primary, fontSize: 13 },
  loreText: { ...typography.caption, color: colors.text.secondary, lineHeight: 18, fontStyle: 'italic' },

  // Abilities section
  abSection: { width: '100%', gap: spacing.sm },
  abCard: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 6,
  },
  abLocked: { opacity: 0.55 },
  abHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  abNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  abName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  abNameLocked: { color: colors.text.secondary },
  abMeta: { flexDirection: 'row', gap: spacing.sm },
  abMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  abMetaT: { fontSize: 10, fontWeight: '600', color: colors.text.tertiary },
  abDesc: { ...typography.caption, color: colors.text.secondary, lineHeight: 17, fontSize: 12 },
  abFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  abSlot: { fontSize: 9, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 0.5, textTransform: 'uppercase' },
  abLockBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.full, backgroundColor: colors.bg.elevated },
  abLockT: { fontSize: 9, fontWeight: '700', color: colors.text.tertiary },
  abUnlocked: { fontSize: 9, fontWeight: '600', color: colors.fel.dim },
});
