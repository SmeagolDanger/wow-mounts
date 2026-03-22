import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radii } from '../../theme';
import { Card, SearchBar } from '../../components';
import api, { HeirloomSummary } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

const { width: SW } = Dimensions.get('window');
const GAP = spacing.sm;
const PAD = spacing.lg;
const COL = (SW - PAD * 2 - GAP * 2) / 3;

const ACCENT = colors.fire.primary;
const ACCENT_DIM = colors.fire.dim;
const ACCENT_MUTED = colors.fire.muted;

type Filter = 'all' | 'maxed' | 'needs';

export default function HeirloomsScreen() {
  const router = useRouter();
  const { selectedChar, collectedHeirloomIds } = useApp();
  const [heirlooms, setHeirlooms] = useState<HeirloomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    if (!selectedChar) { setLoading(false); return; }
    try {
      const data = await api.getCharacterHeirlooms(selectedChar.realm_slug, selectedChar.character_name);
      setHeirlooms(data.heirlooms);
    } catch (e) { console.error('Failed to load heirlooms:', e); setHeirlooms([]); }
    finally { setLoading(false); }
  }, [selectedChar]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let r = heirlooms;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(h => h.name?.toLowerCase().includes(q));
    }
    if (filter === 'maxed') r = r.filter(h => h.upgrade_level >= 6);
    else if (filter === 'needs') r = r.filter(h => h.upgrade_level < 6);
    return r.sort((a, b) => (b.upgrade_level - a.upgrade_level) || (a.name || '').localeCompare(b.name || ''));
  }, [heirlooms, search, filter]);

  const maxedCount = heirlooms.filter(h => h.upgrade_level >= 6).length;
  const upgradeCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const h of heirlooms) {
      counts[h.upgrade_level] = (counts[h.upgrade_level] || 0) + 1;
    }
    return counts;
  }, [heirlooms]);

  const renderPips = (level: number) => {
    const pips = [];
    for (let i = 1; i <= 6; i++) {
      pips.push(
        <View
          key={i}
          style={[z.pip, i <= level ? z.pipFilled : z.pipEmpty]}
        />
      );
    }
    return <View style={z.pipRow}>{pips}</View>;
  };

  const renderHeirloom = useCallback(({ item }: { item: HeirloomSummary }) => {
    return (
      <View style={[z.card, { width: COL }]}>
        <View style={z.cardIcon}>
          <Ionicons name="diamond" size={20} color={ACCENT} />
        </View>
        <View style={z.cardInfo}>
          <Text style={z.cardName} numberOfLines={2}>{item.name}</Text>
          {renderPips(item.upgrade_level)}
        </View>
      </View>
    );
  }, []);

  if (!selectedChar) return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <View style={z.emptyFull}>
        <Ionicons name="diamond-outline" size={48} color={colors.text.tertiary} />
        <Text style={z.emptyTitle}>Select a Character</Text>
        <Text style={z.emptySub}>Choose a character from the Collection tab to view their heirloom collection.</Text>
      </View>
    </SafeAreaView>
  );

  if (loading) return (
    <SafeAreaView style={z.loadC}>
      <ActivityIndicator size="large" color={ACCENT} />
      <Text style={z.loadT}>Loading heirlooms...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <FlatList
        data={filtered} renderItem={renderHeirloom} keyExtractor={(item, i) => `${item.id}-${i}`}
        numColumns={3} columnWrapperStyle={z.row} contentContainerStyle={z.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} progressBackgroundColor={colors.bg.secondary} />}
        ListHeaderComponent={
          <View style={z.hdr}>
            <View style={z.titleRow}>
              <Pressable onPress={() => router.back()} style={z.back}>
                <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
              </Pressable>
              <Text style={z.title}>Heirlooms</Text>
              <View style={{ width: 32 }} />
            </View>

            <Card variant="default" style={z.statCard}>
              <View style={z.statCol}>
                <View style={z.statHeader}>
                  <Ionicons name="diamond" size={24} color={ACCENT} />
                  <Text style={z.statVal}>{heirlooms.length} <Text style={z.statDim}>heirlooms</Text></Text>
                </View>
                <Text style={z.statSub}>{maxedCount} fully upgraded (level 6)</Text>
                <View style={z.upgradeBreakdown}>
                  {[1, 2, 3, 4, 5, 6].map(lvl => (
                    <View key={lvl} style={z.upgradeItem}>
                      <Text style={z.upgradeLevel}>Lv {lvl}</Text>
                      <Text style={z.upgradeCount}>{upgradeCounts[lvl] || 0}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>

            <SearchBar value={search} onChangeText={setSearch} placeholder="Search heirlooms..." />

            <View style={z.chips}>
              {(['all', 'maxed', 'needs'] as Filter[]).map(f => (
                <Pressable key={f} onPress={() => setFilter(f)} style={[z.chip, filter === f && z.chipA]}>
                  <Text style={[z.chipT, filter === f && z.chipTA]}>
                    {f === 'all' ? 'All' : f === 'maxed' ? 'Fully Upgraded' : 'Needs Upgrade'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={z.cnt}>{filtered.length} heirloom{filtered.length !== 1 ? 's' : ''}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={z.empty}><Ionicons name="search-outline" size={40} color={colors.text.tertiary} /><Text style={z.emptyT}>No heirlooms found</Text></View>
        }
      />
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loadC: { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  loadT: { ...typography.body, color: colors.text.secondary },
  list: { paddingHorizontal: PAD, paddingBottom: 100 },
  hdr: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  back: { width: 32, height: 32, borderRadius: radii.full, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.display, color: ACCENT },
  statCard: { padding: spacing.lg },
  statCol: { gap: spacing.sm },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statVal: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  statDim: { fontSize: 14, fontWeight: '400', color: colors.text.tertiary },
  statSub: { ...typography.caption, color: colors.text.secondary },
  upgradeBreakdown: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  upgradeItem: { alignItems: 'center', gap: 2 },
  upgradeLevel: { fontSize: 9, fontWeight: '600', color: colors.text.tertiary },
  upgradeCount: { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.full, backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.default },
  chipA: { backgroundColor: ACCENT_MUTED, borderColor: ACCENT_DIM },
  chipT: { fontSize: 11, color: colors.text.secondary, fontWeight: '600' },
  chipTA: { color: ACCENT },
  cnt: { ...typography.caption, color: colors.text.tertiary },
  row: { gap: GAP, marginBottom: GAP },
  card: { backgroundColor: colors.bg.secondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  cardIcon: { aspectRatio: 1, backgroundColor: colors.bg.tertiary, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.border.default },
  cardInfo: { padding: spacing.sm, gap: 4, height: 56 },
  cardName: { fontSize: 10, fontWeight: '600', color: colors.text.primary, lineHeight: 13 },
  pipRow: { flexDirection: 'row', gap: 3 },
  pip: { width: 6, height: 6, borderRadius: 3 },
  pipFilled: { backgroundColor: ACCENT },
  pipEmpty: { backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.default },
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyT: { ...typography.heading, color: colors.text.secondary },
  emptyFull: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.text.secondary },
  emptySub: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', lineHeight: 18 },
});
