import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import { SearchBar } from '../../components';
import api, { ReputationEntry } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

const STANDING_COLORS: Record<string, string> = {
  Hated: '#DC2626',
  Hostile: '#EF4444',
  Unfriendly: '#F97316',
  Neutral: '#EAB308',
  Friendly: '#22C55E',
  Honored: '#10B981',
  Revered: '#06B6D4',
  Exalted: '#8B5CF6',
};

type SortMode = 'name' | 'standing' | 'progress';

export default function ReputationsScreen() {
  const { selectedChar } = useApp();
  const [reps, setReps] = useState<ReputationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('standing');
  const [showExalted, setShowExalted] = useState(true);

  const load = useCallback(async () => {
    if (!selectedChar) { setLoading(false); return; }
    try {
      const data = await api.getCharacterReputations(selectedChar.realm_slug, selectedChar.character_name);
      setReps(data.reputations);
    } catch { setReps([]); }
    finally { setLoading(false); }
  }, [selectedChar]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let r = reps;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(rep => rep.faction_name?.toLowerCase().includes(q));
    }
    if (!showExalted) {
      r = r.filter(rep => rep.standing_name !== 'Exalted');
    }
    return r.sort((a, b) => {
      if (sort === 'name') return (a.faction_name || '').localeCompare(b.faction_name || '');
      if (sort === 'standing') return (b.standing_raw || 0) - (a.standing_raw || 0);
      // progress: distance to next tier
      return (b.standing_value || 0) / Math.max(b.standing_max || 1, 1) - (a.standing_value || 0) / Math.max(a.standing_max || 1, 1);
    });
  }, [reps, search, sort, showExalted]);

  const exaltedCount = reps.filter(r => r.standing_name === 'Exalted').length;
  const totalFactions = reps.length;

  if (!selectedChar) return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <View style={z.emptyFull}>
        <Ionicons name="people-outline" size={48} color={colors.text.tertiary} />
        <Text style={z.emptyTitle}>Select a Character</Text>
        <Text style={z.emptySub}>Choose a character from the Collection tab to view their reputations.</Text>
      </View>
    </SafeAreaView>
  );

  if (loading) return (
    <SafeAreaView style={z.loadC}>
      <ActivityIndicator size="large" color={colors.frost.primary} />
      <Text style={z.loadT}>Loading reputations...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <FlatList
        data={filtered} keyExtractor={r => String(r.faction_id)} contentContainerStyle={z.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.frost.primary} progressBackgroundColor={colors.bg.secondary} />}
        ListHeaderComponent={
          <View style={z.hdr}>
            <Text style={z.title}>Reputations</Text>
            <View style={z.summaryRow}>
              <View style={z.summaryStat}>
                <Text style={z.summaryNum}>{exaltedCount}</Text>
                <Text style={z.summaryLabel}>EXALTED</Text>
              </View>
              <View style={z.summaryDivider} />
              <View style={z.summaryStat}>
                <Text style={z.summaryNum}>{totalFactions}</Text>
                <Text style={z.summaryLabel}>FACTIONS</Text>
              </View>
            </View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search factions..." />
            <View style={z.controls}>
              <View style={z.sortRow}>
                {(['standing', 'name', 'progress'] as SortMode[]).map(s => (
                  <Pressable key={s} onPress={() => setSort(s)} style={[z.chip, sort === s && z.chipA]}>
                    <Text style={[z.chipT, sort === s && z.chipTA]}>{s === 'standing' ? 'Rank' : s === 'name' ? 'A-Z' : 'Progress'}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setShowExalted(!showExalted)} style={[z.chip, !showExalted && z.chipA]}>
                <Text style={[z.chipT, !showExalted && z.chipTA]}>Hide Exalted</Text>
              </Pressable>
            </View>
            <Text style={z.cnt}>{filtered.length} faction{filtered.length !== 1 ? 's' : ''}</Text>
          </View>
        }
        renderItem={({ item: rep }) => {
          const standColor = STANDING_COLORS[rep.standing_name || ''] || colors.text.tertiary;
          const progress = rep.standing_max > 0 ? Math.min(rep.standing_value / rep.standing_max, 1) : rep.standing_name === 'Exalted' ? 1 : 0;
          const isParagon = !!rep.paragon;

          return (
            <View style={z.repCard}>
              <View style={z.repHeader}>
                <View style={[z.standingDot, { backgroundColor: standColor }]} />
                <Text style={z.repName} numberOfLines={1}>{rep.faction_name}</Text>
                <Text style={[z.standingText, { color: standColor }]}>{rep.standing_name}</Text>
              </View>
              <View style={z.barOuter}>
                <View style={[z.barFill, { width: `${progress * 100}%`, backgroundColor: standColor }]} />
              </View>
              <View style={z.repMeta}>
                <Text style={z.repProgress}>
                  {rep.standing_value.toLocaleString()} / {rep.standing_max > 0 ? rep.standing_max.toLocaleString() : '—'}
                </Text>
                {isParagon && (
                  <View style={z.paragonBadge}>
                    <Ionicons name="star" size={10} color={colors.gold.primary} />
                    <Text style={z.paragonText}>Paragon</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={z.empty}><Ionicons name="people-outline" size={40} color={colors.text.tertiary} /><Text style={z.emptyT}>No reputation data</Text></View>
        }
      />
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loadC: { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  loadT: { ...typography.body, color: colors.text.secondary },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  hdr: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.display, color: colors.frost.primary },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default },
  summaryStat: { alignItems: 'center', gap: 2 },
  summaryNum: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  summaryLabel: { ...typography.label, fontSize: 9 },
  summaryDivider: { width: 1, height: 30, backgroundColor: colors.border.default },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sortRow: { flexDirection: 'row', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.full, backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.default },
  chipA: { backgroundColor: colors.frost.muted, borderColor: colors.frost.dim },
  chipT: { fontSize: 11, color: colors.text.secondary, fontWeight: '600' },
  chipTA: { color: colors.frost.primary },
  cnt: { ...typography.caption, color: colors.text.tertiary },
  repCard: { backgroundColor: colors.bg.secondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.xs },
  repHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  standingDot: { width: 8, height: 8, borderRadius: 4 },
  repName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text.primary },
  standingText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  barOuter: { height: 6, borderRadius: 3, backgroundColor: colors.bg.tertiary, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  repMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  repProgress: { fontSize: 10, color: colors.text.tertiary, fontVariant: ['tabular-nums'] },
  paragonBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  paragonText: { fontSize: 9, fontWeight: '700', color: colors.gold.primary },
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyT: { ...typography.heading, color: colors.text.secondary },
  emptyFull: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.text.secondary },
  emptySub: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', lineHeight: 18 },
});
