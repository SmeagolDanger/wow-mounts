/**
 * Collection Tab — Mount browser with lazy icon loading, search, filters,
 * progress ring, and mount detail modal on tap.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, ScrollView, Pressable,
  RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import SearchBar from '../../components/SearchBar';
import MountCard from '../../components/MountCard';
import ProgressRing from '../../components/ProgressRing';
import MountDetailModal from '../../components/MountDetailModal';
import Card from '../../components/Card';
import api, { MountSummary } from '../../services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const GAP = spacing.md;
const PAD = spacing.lg;
const COL_W = (SCREEN_W - PAD * 2 - GAP * 2) / 3;

type Filter = 'all' | 'collected' | 'missing';

export default function CollectionScreen() {
  const [mounts, setMounts] = useState<MountSummary[]>([]);
  const [collectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [selectedMount, setSelectedMount] = useState<number | null>(null);

  // ── Icon lazy loading ───────────────────────────────────────
  const [iconCache, setIconCache] = useState<Record<number, string | null>>({});
  const iconQueue = useRef<Set<number>>(new Set());
  const iconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchIcons = useCallback(async (ids: number[]) => {
    try {
      const data = await api.getMountIcons(ids);
      setIconCache((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(data.icons)) next[Number(k)] = v;
        return next;
      });
    } catch { /* ignore */ }
  }, []);

  const queueIcons = useCallback((ids: number[]) => {
    for (const id of ids) {
      if (iconCache[id] === undefined) iconQueue.current.add(id);
    }
    if (iconTimer.current || iconQueue.current.size === 0) return;
    iconTimer.current = setTimeout(() => {
      const batch = Array.from(iconQueue.current).slice(0, 20);
      iconQueue.current = new Set(Array.from(iconQueue.current).slice(20));
      iconTimer.current = null;
      if (batch.length > 0) fetchIcons(batch);
    }, 200);
  }, [iconCache, fetchIcons]);

  // ── Data loading ────────────────────────────────────────────
  const loadMounts = useCallback(async () => {
    try {
      const data = await api.getMounts();
      setMounts(data.mounts);
      // Seed iconCache from data that already has icons
      const seed: Record<number, string | null> = {};
      for (const m of data.mounts) { if (m.icon_url) seed[m.id] = m.icon_url; }
      setIconCache((prev) => ({ ...prev, ...seed }));
    } catch (err) { console.error('Failed to load mounts:', err); }
    finally { setLoading(false); }
  }, []);

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadMounts(); setRefreshing(false); }, [loadMounts]);
  useEffect(() => { loadMounts(); }, [loadMounts]);

  // ── Filtering ───────────────────────────────────────────────
  const filteredMounts = useMemo(() => {
    let result = mounts;
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter((m) => m.name.toLowerCase().includes(q)); }
    if (filter === 'collected') result = result.filter((m) => collectedIds.has(m.id));
    else if (filter === 'missing') result = result.filter((m) => !collectedIds.has(m.id));
    if (sourceFilter) result = result.filter((m) => m.source_type === sourceFilter);
    return result;
  }, [mounts, search, filter, sourceFilter, collectedIds]);

  const sourceTypes = useMemo(() => {
    const s = new Set<string>();
    mounts.forEach((m) => m.source_type && s.add(m.source_type));
    return Array.from(s).sort();
  }, [mounts]);

  // ── Farm add handler ────────────────────────────────────────
  const handleAddToFarm = useCallback(async (mount: { id: number; name: string; source_type?: string }) => {
    try {
      await api.createFarmTask({ title: mount.name, mount_id: mount.id, source_type: mount.source_type, reset_type: 'weekly' });
      setSelectedMount(null);
    } catch (err) { console.error('Failed to add farm task:', err); }
  }, []);

  // ── Viewability tracking for lazy icon loading ──────────────
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const ids = viewableItems.map((v: any) => v.item.id).filter((id: number) => !iconCache[id]);
    if (ids.length > 0) queueIcons(ids);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 30 }).current;

  // ── Render ──────────────────────────────────────────────────
  const renderMount = useCallback(({ item }: { item: MountSummary }) => {
    const icon = iconCache[item.id] || item.icon_url || null;
    return (
      <View style={{ width: COL_W }}>
        <MountCard id={item.id} name={item.name} iconUrl={icon} sourceType={item.source_type} collected={collectedIds.has(item.id)} onPress={() => setSelectedMount(item.id)} />
      </View>
    );
  }, [collectedIds, iconCache]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold.primary} />
        <Text style={styles.loadingText}>Loading mounts...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={filteredMounts}
        renderItem={renderMount}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Mount Collection</Text>
            <Card variant="gold" style={styles.progressCard}>
              <View style={styles.progressRow}>
                <ProgressRing collected={collectedIds.size} total={mounts.length} size={90} />
                <View style={styles.progressInfo}>
                  <Text style={styles.progressLabel}>COLLECTED</Text>
                  <Text style={styles.progressValue}>{collectedIds.size}<Text style={styles.progressTotal}> / {mounts.length}</Text></Text>
                  <Text style={styles.progressHint}>{mounts.length - collectedIds.size} remaining</Text>
                </View>
              </View>
            </Card>
            <SearchBar value={search} onChangeText={setSearch} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {(['all', 'collected', 'missing'] as Filter[]).map((f) => (
                <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
                  <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f === 'all' ? 'All' : f === 'collected' ? 'Collected' : 'Missing'}</Text>
                </Pressable>
              ))}
              <View style={styles.chipDivider} />
              {sourceTypes.map((src) => (
                <Pressable key={src} onPress={() => setSourceFilter(sourceFilter === src ? null : src)} style={[styles.chip, sourceFilter === src && styles.chipActive]}>
                  <Text style={[styles.chipText, sourceFilter === src && styles.chipTextActive]}>{src}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.resultsCount}>{filteredMounts.length} mount{filteredMounts.length !== 1 ? 's' : ''}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No mounts found</Text>
          </View>
        }
      />

      <MountDetailModal mountId={selectedMount} visible={selectedMount !== null} onClose={() => setSelectedMount(null)} onAddToFarm={handleAddToFarm} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loadingContainer: { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  loadingText: { ...typography.body, color: colors.text.secondary },
  listContent: { paddingHorizontal: PAD, paddingBottom: 100 },
  header: { gap: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  title: { ...typography.display, color: colors.gold.primary },
  progressCard: { padding: spacing.lg },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  progressInfo: { flex: 1, gap: spacing.xs },
  progressLabel: { ...typography.label, color: colors.gold.dim },
  progressValue: { fontSize: 28, fontWeight: '700', color: colors.text.primary },
  progressTotal: { fontSize: 18, fontWeight: '400', color: colors.text.tertiary },
  progressHint: { ...typography.caption, color: colors.text.secondary },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full, backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.default },
  chipActive: { backgroundColor: colors.gold.muted, borderColor: colors.gold.dim },
  chipText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600', textTransform: 'capitalize' },
  chipTextActive: { color: colors.gold.primary },
  chipDivider: { width: 1, height: 24, backgroundColor: colors.border.default, alignSelf: 'center', marginHorizontal: spacing.xs },
  resultsCount: { ...typography.caption, color: colors.text.tertiary },
  row: { gap: GAP, marginBottom: GAP },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl * 2, gap: spacing.md },
  emptyText: { ...typography.heading, color: colors.text.secondary },
});
