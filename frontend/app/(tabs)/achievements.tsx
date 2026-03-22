import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radii } from '../../theme';
import { Card } from '../../components';
import api, { AchievementCategory, AchievementEntry } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Character': 'person-outline',
  'Quests': 'flag-outline',
  'Exploration': 'compass-outline',
  'Player vs. Player': 'skull-outline',
  'Dungeons & Raids': 'key-outline',
  'Professions': 'hammer-outline',
  'Reputation': 'people-outline',
  'World Events': 'calendar-outline',
  'Pet Battles': 'paw-outline',
  'Collections': 'albums-outline',
  'Expansion Features': 'star-outline',
  'Legacy': 'hourglass-outline',
  'Feats of Strength': 'flash-outline',
  'Housing': 'home-outline',
  'Delves': 'flashlight-outline',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Character': '#E2E8F0',
  'Quests': '#FDE047',
  'Exploration': '#4ADE80',
  'Player vs. Player': '#F87171',
  'Dungeons & Raids': '#C084FC',
  'Professions': '#FB923C',
  'Reputation': '#22D3EE',
  'World Events': '#38BDF8',
  'Pet Battles': '#4ADE80',
  'Collections': '#F5B800',
  'Expansion Features': '#9B6FFF',
  'Legacy': '#94A3B8',
  'Feats of Strength': '#FFD43B',
  'Housing': '#22C55E',
  'Delves': '#38BDF8',
};

export default function AchievementsScreen() {
  const router = useRouter();
  const { selectedChar, achievementCount, achievementPoints } = useApp();
  const [categories, setCategories] = useState<AchievementCategory[]>([]);
  const [achievements, setAchievements] = useState<AchievementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCat, setExpandedCat] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!selectedChar) { setLoading(false); return; }
    try {
      const data = await api.getCharacterAchievements(selectedChar.realm_slug, selectedChar.character_name);
      setCategories(data.categories);
      setAchievements(data.achievements);
    } catch {
      setCategories([]);
      setAchievements([]);
    } finally { setLoading(false); }
  }, [selectedChar]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  useEffect(() => { load(); }, [load]);

  const completedSet = useMemo(() => {
    return new Set(achievements.filter(a => a.completed_timestamp).map(a => a.id));
  }, [achievements]);

  const recentAchievements = useMemo(() => {
    return achievements
      .filter(a => a.completed_timestamp)
      .sort((a, b) => (b.completed_timestamp || 0) - (a.completed_timestamp || 0))
      .slice(0, 10);
  }, [achievements]);

  if (!selectedChar) return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <View style={z.emptyFull}>
        <Ionicons name="ribbon-outline" size={48} color={colors.text.tertiary} />
        <Text style={z.emptyTitle}>Select a Character</Text>
        <Text style={z.emptySub}>Choose a character from the Collection tab to view their achievements.</Text>
      </View>
    </SafeAreaView>
  );

  if (loading) return (
    <SafeAreaView style={z.loadC}>
      <ActivityIndicator size="large" color={colors.gold.primary} />
      <Text style={z.loadT}>Loading achievements...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <FlatList
        data={categories} keyExtractor={c => String(c.id)} contentContainerStyle={z.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />}
        ListHeaderComponent={
          <View style={z.hdr}>
            <Pressable onPress={() => router.back()} style={z.back}>
              <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
            </Pressable>
            <Text style={z.title}>Achievements</Text>
            <Card variant="gold" style={z.heroCard}>
              <View style={z.heroRow}>
                <View style={z.heroStat}>
                  <Ionicons name="ribbon" size={20} color={colors.gold.primary} />
                  <Text style={z.heroNum}>{achievementCount.toLocaleString()}</Text>
                  <Text style={z.heroLabel}>EARNED</Text>
                </View>
                <View style={z.heroDivider} />
                <View style={z.heroStat}>
                  <Ionicons name="star" size={20} color={colors.gold.bright} />
                  <Text style={z.heroNum}>{achievementPoints.toLocaleString()}</Text>
                  <Text style={z.heroLabel}>POINTS</Text>
                </View>
              </View>
            </Card>

            {recentAchievements.length > 0 && (
              <View style={z.recentSection}>
                <Text style={z.sectionTitle}>Recent Achievements</Text>
                {recentAchievements.slice(0, 5).map(a => {
                  const date = a.completed_timestamp ? new Date(a.completed_timestamp) : null;
                  return (
                    <View key={a.id} style={z.recentRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.fel.primary} />
                      <Text style={z.recentName} numberOfLines={1}>{a.name}</Text>
                      {date && <Text style={z.recentDate}>{date.toLocaleDateString()}</Text>}
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={z.sectionTitle}>Categories</Text>
          </View>
        }
        renderItem={({ item: cat }) => {
          const isExpanded = expandedCat === cat.id;
          const catColor = CATEGORY_COLORS[cat.name] || colors.text.secondary;
          const catIcon = CATEGORY_ICONS[cat.name] || 'ellipse-outline';
          return (
            <View style={z.catCard}>
              <Pressable onPress={() => setExpandedCat(isExpanded ? null : cat.id)} style={z.catHeader}>
                <View style={[z.catIcon, { backgroundColor: catColor + '18' }]}>
                  <Ionicons name={catIcon} size={16} color={catColor} />
                </View>
                <View style={z.catInfo}>
                  <Text style={z.catName}>{cat.name}</Text>
                </View>
                <View style={z.catRight}>
                  <Text style={[z.catCount, { color: catColor }]}>{cat.quantity}</Text>
                  {cat.points > 0 && <Text style={z.catPoints}>{cat.points} pts</Text>}
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text.tertiary} />
              </Pressable>

              {isExpanded && cat.subcategories && cat.subcategories.length > 0 && (
                <View style={z.subList}>
                  {cat.subcategories.map(sub => (
                    <View key={sub.id} style={z.subRow}>
                      <Text style={z.subName} numberOfLines={1}>{sub.name}</Text>
                      <Text style={z.subCount}>{sub.quantity}</Text>
                      {sub.points > 0 && <Text style={z.subPoints}>{sub.points} pts</Text>}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={z.empty}><Ionicons name="ribbon-outline" size={40} color={colors.text.tertiary} /><Text style={z.emptyT}>No achievement data</Text></View>
        }
      />
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loadC: { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  loadT: { ...typography.body, color: colors.text.secondary },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  hdr: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  back: { width: 32, height: 32, borderRadius: radii.full, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.display, color: colors.gold.bright },
  heroCard: { padding: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  heroStat: { alignItems: 'center', gap: spacing.xs },
  heroNum: { fontSize: 24, fontWeight: '700', color: colors.text.primary },
  heroLabel: { ...typography.label, fontSize: 9 },
  heroDivider: { width: 1, height: 40, backgroundColor: colors.border.default },
  recentSection: { gap: spacing.sm },
  sectionTitle: { ...typography.heading, marginTop: spacing.sm },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  recentName: { flex: 1, ...typography.caption, color: colors.text.primary, fontWeight: '500' },
  recentDate: { fontSize: 10, color: colors.text.tertiary },
  catCard: { marginBottom: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  catIcon: { width: 32, height: 32, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  catInfo: { flex: 1, gap: 4 },
  catName: { ...typography.subheading, fontSize: 13 },
  catRight: { alignItems: 'flex-end', gap: 2 },
  catCount: { fontSize: 15, fontWeight: '700' },
  catPoints: { fontSize: 9, color: colors.text.tertiary, fontWeight: '600' },
  subList: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, marginLeft: 44, gap: spacing.xs },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border.default },
  subName: { flex: 1, fontSize: 12, color: colors.text.secondary },
  subCount: { fontSize: 12, fontWeight: '700', color: colors.text.primary },
  subPoints: { fontSize: 10, color: colors.text.tertiary, width: 50, textAlign: 'right' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyT: { ...typography.heading, color: colors.text.secondary },
  emptyFull: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.text.secondary },
  emptySub: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', lineHeight: 18 },
});
