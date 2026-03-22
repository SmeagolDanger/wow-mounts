import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { Card } from '../../components';
import { useApp } from '../../contexts/AppContext';

const STAT_ROUTES: Record<string, string> = {
  mounts: '/(tabs)',
  pets: '/(tabs)/pets',
  achievements: '/(tabs)/achievements',
  toys: '/(tabs)/missingtoys',
  titles: '/(tabs)/missingtitles',
  transmog: '/(tabs)/transmog',
  heirlooms: '/(tabs)/heirlooms',
  recipes: '/(tabs)/professions',
};

interface StatRow {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  color: string;
  points?: number;
}

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

  const s = collectionSummary?.summary;
  const stats: StatRow[] = [
    { key: 'mounts', label: 'Mounts', icon: 'trophy', count: collectedIds.size || s?.mounts?.count || 0, color: colors.gold.primary },
    { key: 'pets', label: 'Battle Pets', icon: 'paw', count: collectedPetIds.size || s?.pets?.count || 0, color: colors.fel.primary },
    { key: 'achievements', label: 'Achievements', icon: 'ribbon', count: achievementCount || s?.achievements?.count || 0, color: '#F5B800', points: achievementPoints || s?.achievements?.points || 0 },
    { key: 'toys', label: 'Toys', icon: 'game-controller', count: collectedToyIds.size || s?.toys?.count || 0, color: colors.frost.primary },
    { key: 'titles', label: 'Titles', icon: 'bookmark', count: collectedTitleIds.size || s?.titles?.count || 0, color: colors.arcane.primary },
    { key: 'heirlooms', label: 'Heirlooms', icon: 'diamond', count: collectedHeirloomIds.size || s?.heirlooms?.count || 0, color: colors.fire.primary },
    { key: 'transmog', label: 'Transmog', icon: 'shirt', count: transmogCount || s?.transmog?.count || 0, color: '#E879F9' },
    { key: 'recipes', label: 'Recipes', icon: 'flask', count: recipeCount || s?.recipes?.count || 0, color: '#FB923C' },
  ];

  const totalCollected = stats.reduce((s, r) => s + r.count, 0);
  const maxStat = Math.max(...stats.map(s => s.count), 1);

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={z.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />}
      >
        <Text style={z.title}>Overview</Text>

        {!selectedChar ? (
          <View style={z.empty}>
            <View style={z.emptyIcon}>
              <Ionicons name="stats-chart-outline" size={32} color={colors.text.tertiary} />
            </View>
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
                  <Ionicons name="person" size={22} color={colors.gold.primary} />
                </View>
                <View style={z.heroInfo}>
                  <Text style={z.heroName}>{selectedChar.display.split('-')[0].toUpperCase()}</Text>
                  <Text style={z.heroRealm}>{selectedChar.realm_slug}</Text>
                </View>
                <View style={z.heroTotal}>
                  <Text style={z.heroTotalNum}>{totalCollected.toLocaleString()}</Text>
                  <Text style={z.heroTotalLabel}>TOTAL</Text>
                </View>
              </View>
              {achievementPoints > 0 && (
                <View style={z.pointsRow}>
                  <Ionicons name="star" size={13} color={colors.gold.bright} />
                  <Text style={z.pointsText}>{achievementPoints.toLocaleString()} Achievement Points</Text>
                </View>
              )}
            </Card>

            {loadingCollected && (
              <View style={z.loadingRow}>
                <ActivityIndicator size="small" color={colors.gold.primary} />
                <Text style={z.loadingText}>Syncing collections...</Text>
              </View>
            )}

            {/* Collection list — modern rows with progress bars */}
            <View style={z.collectionList}>
              {stats.map((stat, idx) => {
                const route = STAT_ROUTES[stat.key];
                const barWidth = Math.max((stat.count / maxStat) * 100, 2);
                const content = (
                  <View key={stat.key} style={[z.collRow, idx === 0 && z.collRowFirst, idx === stats.length - 1 && z.collRowLast]}>
                    <View style={[z.collIcon, { backgroundColor: stat.color + '15' }]}>
                      <Ionicons name={stat.icon} size={18} color={stat.color} />
                    </View>
                    <View style={z.collInfo}>
                      <View style={z.collTop}>
                        <Text style={z.collLabel}>{stat.label}</Text>
                        <Text style={[z.collCount, { color: stat.color }]}>{stat.count.toLocaleString()}</Text>
                      </View>
                      <View style={z.barBg}>
                        <LinearGradient
                          colors={[stat.color + '60', stat.color]}
                          start={{x:0,y:0}} end={{x:1,y:0}}
                          style={[z.barFill, { width: `${barWidth}%` }]}
                        />
                      </View>
                      {stat.points !== undefined && stat.points > 0 && (
                        <Text style={z.collPts}>{stat.points.toLocaleString()} pts</Text>
                      )}
                    </View>
                    {route && (
                      <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} style={{ marginLeft: spacing.sm }} />
                    )}
                  </View>
                );
                return route ? (
                  <Pressable key={stat.key} onPress={() => router.push(route as any)} style={({pressed}) => [pressed && { opacity: 0.7 }]}>
                    {content}
                  </Pressable>
                ) : (
                  <View key={stat.key}>{content}</View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120, gap: spacing.lg },
  title: { ...typography.display, color: colors.gold.bright },
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: radii.full, backgroundColor: colors.bg.tertiary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyTitle: { ...typography.heading, color: colors.text.secondary },
  emptySub: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', lineHeight: 18 },
  heroCard: { padding: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroIcon: { width: 44, height: 44, borderRadius: radii.full, backgroundColor: colors.gold.muted, alignItems: 'center', justifyContent: 'center' },
  heroInfo: { flex: 1, gap: 2 },
  heroName: { ...typography.heading, color: colors.gold.primary, letterSpacing: 1 },
  heroRealm: { ...typography.caption, color: colors.text.tertiary, textTransform: 'capitalize' },
  heroTotal: { alignItems: 'flex-end', gap: 2 },
  heroTotalNum: { fontSize: 24, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5 },
  heroTotalLabel: { ...typography.label, fontSize: 9 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border.default },
  pointsText: { ...typography.caption, color: colors.gold.bright, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { ...typography.caption, color: colors.text.tertiary },
  collectionList: { backgroundColor: colors.bg.secondary, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden', ...shadows.soft },
  collRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  collRowFirst: { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  collRowLast: { borderBottomWidth: 0, borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
  collIcon: { width: 36, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  collInfo: { flex: 1, gap: 4 },
  collTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  collLabel: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  collCount: { fontSize: 16, fontWeight: '700' },
  barBg: { height: 3, backgroundColor: colors.bg.tertiary, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 2 },
  collPts: { fontSize: 10, fontWeight: '500', color: colors.gold.dim },
});
