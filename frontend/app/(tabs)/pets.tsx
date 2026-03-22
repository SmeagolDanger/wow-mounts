import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, RefreshControl, ActivityIndicator, Dimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radii } from '../../theme';
import { Card, SearchBar, ProgressRing } from '../../components';
import api, { PetSummary } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

const { width: SW } = Dimensions.get('window');
const GAP = spacing.sm;
const PAD = spacing.lg;
const COL = (SW - PAD * 2 - GAP * 2) / 3;

const QUALITY_COLORS: Record<string, string> = {
  POOR: colors.rarity.poor,
  COMMON: colors.rarity.common,
  UNCOMMON: colors.rarity.uncommon,
  RARE: colors.rarity.rare,
  EPIC: colors.rarity.epic,
  LEGENDARY: colors.rarity.legendary,
};

const BREED_NAMES: Record<number, string> = {
  3: 'B/B', 4: 'P/P', 5: 'S/S', 6: 'H/H', 7: 'H/P', 8: 'P/S',
  9: 'H/S', 10: 'P/B', 11: 'S/B', 12: 'H/B',
};

type Filter = 'all' | 'max' | 'leveling';

export default function PetsScreen() {
  const router = useRouter();
  const { selectedChar } = useApp();
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [iconCache, setIconCache] = useState<Record<number, string | null>>({});
  const iconQ = useRef<Set<number>>(new Set());
  const iconT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchIcons = useCallback(async (ids: number[]) => {
    try {
      const d = await api.getPetIcons(ids);
      setIconCache(p => { const n = { ...p }; for (const [k, v] of Object.entries(d.icons)) n[Number(k)] = v; return n; });
    } catch (e) { console.error('Fetch pet icons:', e); }
  }, []);

  const queueIcons = useCallback((ids: number[]) => {
    for (const id of ids) if (iconCache[id] === undefined) iconQ.current.add(id);
    if (iconT.current || iconQ.current.size === 0) return;
    iconT.current = setTimeout(() => {
      const batch = Array.from(iconQ.current).slice(0, 20);
      iconQ.current = new Set(Array.from(iconQ.current).slice(20));
      iconT.current = null;
      if (batch.length) fetchIcons(batch);
    }, 250);
  }, [iconCache, fetchIcons]);

  const onView = useRef(({ viewableItems }: { viewableItems: Array<{ item: PetSummary }> }) => {
    const ids = viewableItems.map(v => v.item.species_id).filter(Boolean);
    if (ids.length) queueIcons(ids);
  });
  useEffect(() => { onView.current = ({ viewableItems }: { viewableItems: Array<{ item: PetSummary }> }) => {
    const ids = viewableItems.map(v => v.item.species_id).filter(Boolean);
    if (ids.length) queueIcons(ids);
  }; }, [queueIcons]);
  const viewCfg = useRef({ itemVisiblePercentThreshold: 10 }).current;

  const load = useCallback(async () => {
    if (!selectedChar) { setLoading(false); return; }
    try {
      const data = await api.getCharacterPets(selectedChar.realm_slug, selectedChar.character_name);
      setPets(data.pets);
      const seed: Record<number, string | null> = {};
      for (const p of data.pets) if (p.icon_url) seed[p.species_id] = p.icon_url;
      setIconCache(prev => ({ ...prev, ...seed }));
    } catch (e) { console.error('Load pets:', e); setPets([]); }
    finally { setLoading(false); }
  }, [selectedChar]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  useEffect(() => { load(); }, [load]);
  // Seed icons for initial visible pets once loaded
  useEffect(() => {
    if (pets.length) {
      const ids = [...new Set(pets.slice(0, 30).map(p => p.species_id))];
      queueIcons(ids);
    }
  }, [pets, queueIcons]);

  const filtered = useMemo(() => {
    let r = pets;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(p => p.name?.toLowerCase().includes(q));
    }
    if (filter === 'max') r = r.filter(p => p.level === 25);
    else if (filter === 'leveling') r = r.filter(p => p.level < 25);
    return r.sort((a, b) => (b.level - a.level) || (a.name || '').localeCompare(b.name || ''));
  }, [pets, search, filter]);

  const maxCount = pets.filter(p => p.level === 25).length;
  const uniqueSpecies = new Set(pets.map(p => p.species_id)).size;

  const renderPet = useCallback(({ item }: { item: PetSummary }) => {
    const qColor = QUALITY_COLORS[item.quality] || colors.text.secondary;
    const breed = item.breed_id ? BREED_NAMES[item.breed_id] : null;
    const iconUrl = iconCache[item.species_id];
    return (
      <View style={[z.petCard, { width: COL }]}>
        <View style={[z.petIcon, { borderColor: qColor + '60' }]}>
          {iconUrl ? (
            <Image source={{ uri: iconUrl }} style={z.petImg} />
          ) : (
            <Ionicons name="paw" size={20} color={qColor} />
          )}
          {showDetails && item.level > 0 && (
            <View style={z.levelBadge}><Text style={z.levelText}>{item.level}</Text></View>
          )}
        </View>
        <View style={z.petInfo}>
          <Text style={z.petName} numberOfLines={2}>{item.name}</Text>
          <View style={z.petMeta}>
            <View style={[z.qualityDot, { backgroundColor: qColor }]} />
            {showDetails && breed && <Text style={z.breedText}>{breed}</Text>}
          </View>
        </View>
      </View>
    );
  }, [showDetails, iconCache]);

  if (!selectedChar) return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <View style={z.emptyFull}>
        <Ionicons name="paw-outline" size={48} color={colors.text.tertiary} />
        <Text style={z.emptyTitle}>Select a Character</Text>
        <Text style={z.emptySub}>Choose a character from the Collection tab to view their pet collection.</Text>
      </View>
    </SafeAreaView>
  );

  if (loading) return (
    <SafeAreaView style={z.loadC}>
      <ActivityIndicator size="large" color={colors.fel.primary} />
      <Text style={z.loadT}>Loading pets...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <FlatList
        data={filtered} renderItem={renderPet} keyExtractor={(item, i) => `${item.species_id}-${i}`}
        numColumns={3} columnWrapperStyle={z.row} contentContainerStyle={z.list}
        onViewableItemsChanged={e => onView.current(e)} viewabilityConfig={viewCfg}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.fel.primary} progressBackgroundColor={colors.bg.secondary} />}
        ListHeaderComponent={
          <View style={z.hdr}>
            <View style={z.titleRow}>
              <Pressable onPress={() => router.back()} style={z.back}>
                <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
              </Pressable>
              <Text style={z.title}>Battle Pets</Text>
              <Pressable onPress={() => setShowDetails(!showDetails)} style={[z.detailBtn, showDetails && z.detailBtnActive]}>
                <Ionicons name="eye" size={14} color={showDetails ? colors.fel.primary : colors.text.tertiary} />
                <Text style={[z.detailBtnText, showDetails && { color: colors.fel.primary }]}>Details</Text>
              </Pressable>
            </View>

            <Card variant="success" style={z.statCard}>
              <View style={z.statRow}>
                <ProgressRing collected={uniqueSpecies} total={Math.max(uniqueSpecies, 1)} size={64} />
                <View style={z.statInfo}>
                  <Text style={z.statVal}>{uniqueSpecies} <Text style={z.statDim}>unique species</Text></Text>
                  <Text style={z.statSub}>{maxCount} at level 25</Text>
                  <Text style={z.statSub}>{pets.length} total collected</Text>
                </View>
              </View>
            </Card>

            <SearchBar value={search} onChangeText={setSearch} placeholder="Search pets..." />

            <View style={z.chips}>
              {(['all', 'max', 'leveling'] as Filter[]).map(f => (
                <Pressable key={f} onPress={() => setFilter(f)} style={[z.chip, filter === f && z.chipA]}>
                  <Text style={[z.chipT, filter === f && z.chipTA]}>
                    {f === 'all' ? 'All' : f === 'max' ? 'Level 25' : 'Leveling'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={z.cnt}>{filtered.length} pet{filtered.length !== 1 ? 's' : ''}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={z.empty}><Ionicons name="search-outline" size={40} color={colors.text.tertiary} /><Text style={z.emptyT}>No pets found</Text></View>
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
  title: { ...typography.display, color: colors.fel.bright },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.secondary },
  detailBtnActive: { borderColor: colors.fel.dim, backgroundColor: colors.fel.muted },
  detailBtnText: { fontSize: 11, fontWeight: '600', color: colors.text.tertiary },
  statCard: { padding: spacing.lg },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  statInfo: { flex: 1, gap: spacing.xs },
  statVal: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  statDim: { fontSize: 14, fontWeight: '400', color: colors.text.tertiary },
  statSub: { ...typography.caption, color: colors.text.secondary },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.full, backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.default },
  chipA: { backgroundColor: colors.fel.muted, borderColor: colors.fel.dim },
  chipT: { fontSize: 11, color: colors.text.secondary, fontWeight: '600' },
  chipTA: { color: colors.fel.primary },
  cnt: { ...typography.caption, color: colors.text.tertiary },
  row: { gap: GAP, marginBottom: GAP },
  petCard: { backgroundColor: colors.bg.secondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  petIcon: { aspectRatio: 1, backgroundColor: colors.bg.tertiary, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, overflow: 'hidden' },
  petImg: { width: '100%', height: '100%' },
  levelBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: colors.bg.primary + 'DD', borderRadius: radii.sm, paddingHorizontal: 4, paddingVertical: 1 },
  levelText: { fontSize: 9, fontWeight: '800', color: colors.gold.primary },
  petInfo: { padding: spacing.sm, gap: 2, height: 52 },
  petName: { fontSize: 10, fontWeight: '600', color: colors.text.primary, lineHeight: 13 },
  petMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qualityDot: { width: 6, height: 6, borderRadius: 3 },
  breedText: { fontSize: 9, fontWeight: '700', color: colors.text.tertiary },
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyT: { ...typography.heading, color: colors.text.secondary },
  emptyFull: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.text.secondary },
  emptySub: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', lineHeight: 18 },
});
