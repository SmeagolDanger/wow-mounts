import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import { Card } from '../../components';
import { useApp } from '../../contexts/AppContext';

interface StatRow {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  color: string;
  points?: number;
  route?: string;
}

const STAT_ROUTES: Record<string, string> = {
  mounts: '/quickwins',
  pets: '/missingpets',
  toys: '/missingtoys',
  titles: '/missingtitles',
  transmog: '/transmog',
  recipes: '/professions',
};

export default function StatsScreen() {
  const router = useRouter();
  const {
    selectedChar, collectedIds, collectedPetIds, collectedToyIds,
    collectedTitleIds, collectedHeirloomIds, transmogCount, recipeCount,
    achievementCount, achievementPoints,
    collectionSummary, loadingCollected, refreshCollections,
  } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCollections();
    setRefreshing(false);
  }, [refreshCollections]);

  const stats: StatRow[] = [
    { key: 'mounts', label: 'Mounts', icon: 'trophy', count: collectedIds.size, color: colors.gold.primary },
    { key: 'pets', label: 'Battle Pets', icon: 'paw', count: collectedPetIds.size, color: colors.fel.primary },
    { key: 'achievements', label: 'Achievements', icon: 'ribbon', count: achievementCount, color: '#F5B800', points: achievementPoints },
    { key: 'toys', label: 'Toys', icon: 'game-controller', count: collectedToyIds.size, color: colors.frost.primary },
    { key: 'titles', label: 'Titles', icon: 'bookmark', count: collectedTitleIds.size, color: colors.arcane.primary },
    { key: 'heirlooms', label: 'Heirlooms', icon: 'diamond', count: collectedHeirloomIds.size, color: colors.fire.primary },
    { key: 'transmog', label: 'Transmog', icon: 'shirt', count: transmogCount, color: '#E879F9' },
    { key: 'recipes', label: 'Recipes', icon: 'flask', count: recipeCount, color: '#FB923C' },
  ];

  const totalCollected = stats.reduce((s, r) => s + r.count, 0);

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={z.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />}
      >
        <Text style={z.title}>Overview</Text>

        {!selectedChar ? (
          <View style={z.empty}>
            <Ionicons name="stats-chart-outline" size={48} color={colors.text.tertiary} />
            <Text style={z.emptyTitle}>Select a Character</Text>
            <Text style={z.emptySub}>
              Choose a character from the Collection tab to see your progress across all categories.
            </Text>
          </View>
        ) : (
          <>
            {/* Character hero card */}
            <Card variant="gold" style={z.heroCard}>
              <View style={z.heroRow}>
                <View style={z.heroIcon}>
                  <Ionicons name="person" size={24} color={colors.gold.primary} />
                </View>
                <View style={z.heroInfo}>
                  <Text style={z.heroName}>{selectedChar.display.split('-')[0].toUpperCase()}</Text>
                  <Text style={z.heroRealm}>{selectedChar.realm_slug}</Text>
                </View>
                <View style={z.heroTotal}>
                  <Text style={z.heroTotalNum}>{totalCollected.toLocaleString()}</Text>
                  <Text style={z.heroTotalLabel}>TOTAL ITEMS</Text>
                </View>
              </View>
              {achievementPoints > 0 && (
                <View style={z.pointsRow}>
                  <Ionicons name="star" size={14} color={colors.gold.bright} />
                  <Text style={z.pointsText}>{achievementPoints.toLocaleString()} Achievement Points</Text>
                </View>
              )}
            </Card>

            {loadingCollected && (
              <View style={z.loadingRow}>
                <ActivityIndicator size="small" color={colors.gold.primary} />
                <Text style={z.loadingText}>Loading collections...</Text>
              </View>
            )}

            {/* Collection cards — tappable where routes exist */}
            <View style={z.grid}>
              {stats.map(stat => {
                const route = STAT_ROUTES[stat.key];
                return (
                <Pressable key={stat.key} style={z.statCard} onPress={route ? () => router.push(route as any) : undefined}>
                  <Card variant="default">
                    <View style={z.statInner}>
                      <View style={[z.statIcon, { backgroundColor: stat.color + '18' }]}>
                        <Ionicons name={stat.icon} size={20} color={stat.color} />
                      </View>
                      <Text style={z.statCount}>{stat.count.toLocaleString()}</Text>
                      <Text style={z.statLabel}>{stat.label}</Text>
                      {stat.points !== undefined && stat.points > 0 && (
                        <Text style={z.statPoints}>{stat.points.toLocaleString()} pts</Text>
                      )}
                      {route && <Ionicons name="chevron-forward" size={10} color={colors.text.tertiary} style={z.statArrow} />}
                    </View>
                  </Card>
                </Pressable>
                );
              })}
            </View>

            {/* Breakdown list */}
            {collectionSummary && (
              <View style={z.section}>
                <Text style={z.sectionTitle}>Collection Breakdown</Text>
                <View style={z.breakdownCard}>
                  {Object.entries(collectionSummary.summary).map(([key, val], idx, arr) => {
                    const stat = stats.find(s => s.key === key);
                    const barColor = stat?.color || colors.text.tertiary;
                    return (
                      <View key={key} style={[z.breakdownRow, idx === arr.length - 1 && { borderBottomWidth: 0 }]}>
                        <Ionicons name={(stat?.icon || 'ellipse') as any} size={14} color={barColor} />
                        <Text style={z.breakdownText}>{stat?.label || key}</Text>
                        <Text style={[z.breakdownCount, { color: barColor }]}>{val.count.toLocaleString()}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 100, gap: spacing.lg },
  title: { ...typography.display, color: colors.gold.bright },
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.text.secondary },
  emptySub: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', lineHeight: 18 },
  heroCard: { padding: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroIcon: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.gold.muted, alignItems: 'center', justifyContent: 'center' },
  heroInfo: { flex: 1, gap: 2 },
  heroName: { ...typography.heading, color: colors.gold.primary, letterSpacing: 1 },
  heroRealm: { ...typography.caption, color: colors.text.tertiary, textTransform: 'capitalize' },
  heroTotal: { alignItems: 'flex-end', gap: 2 },
  heroTotalNum: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  heroTotalLabel: { ...typography.label, fontSize: 8 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border.default },
  pointsText: { ...typography.caption, color: colors.gold.bright, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { ...typography.caption, color: colors.text.tertiary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { width: '48.5%', height: 140 },
  statInner: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md, flex: 1 },
  statIcon: { width: 40, height: 40, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  statCount: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  statLabel: { ...typography.label, fontSize: 10 },
  statPoints: { fontSize: 10, fontWeight: '600', color: colors.gold.dim },
  statArrow: { position: 'absolute', right: 6, top: 6 },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.heading },
  breakdownCard: { backgroundColor: colors.bg.secondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
  breakdownText: { ...typography.body, fontSize: 14, flex: 1 },
  breakdownCount: { fontSize: 15, fontWeight: '700' },
});
