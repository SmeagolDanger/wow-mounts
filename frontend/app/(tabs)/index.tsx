/**
 * Collection Tab — Mount browser with search, filtering, and collection progress.
 *
 * Features:
 * - Hero section with ProgressRing showing collection %
 * - Search bar with instant filtering
 * - Grid of MountCards (2 columns)
 * - Filter chips: All / Collected / Missing / by source type
 * - Pull-to-refresh
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import SearchBar from '../../components/SearchBar';
import MountCard from '../../components/MountCard';
import ProgressRing from '../../components/ProgressRing';
import Card from '../../components/Card';
import api from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = spacing.md;
const GRID_PADDING = spacing.lg;
const COLUMN_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

type Filter = 'all' | 'collected' | 'missing';
type SourceFilter = string | null;

interface MountItem {
  id: number;
  name: string;
  description?: string;
  source_type?: string;
  faction?: string;
  icon_url?: string;
  creature_display_id?: number;
}

export default function CollectionScreen() {
  const [mounts, setMounts] = useState<MountItem[]>([]);
  const [collectedIds, setCollectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(null);

  // ── Data Loading ────────────────────────────────────────────
  const loadMounts = useCallback(async () => {
    try {
      const data = await api.getMounts();
      setMounts(data.mounts);
    } catch (err) {
      console.error('Failed to load mounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMounts();
    setRefreshing(false);
  }, [loadMounts]);

  useEffect(() => {
    loadMounts();
  }, [loadMounts]);

  // ── Filtering ───────────────────────────────────────────────
  const filteredMounts = useMemo(() => {
    let result = mounts;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }

    // Collected/Missing filter
    if (filter === 'collected') {
      result = result.filter((m) => collectedIds.has(m.id));
    } else if (filter === 'missing') {
      result = result.filter((m) => !collectedIds.has(m.id));
    }

    // Source type filter
    if (sourceFilter) {
      result = result.filter((m) => m.source_type === sourceFilter);
    }

    return result;
  }, [mounts, search, filter, sourceFilter, collectedIds]);

  // ── Stats ───────────────────────────────────────────────────
  const totalMounts = mounts.length;
  const collectedCount = collectedIds.size;

  // ── Source types for filter chips ───────────────────────────
  const sourceTypes = useMemo(() => {
    const types = new Set<string>();
    mounts.forEach((m) => m.source_type && types.add(m.source_type));
    return Array.from(types).sort();
  }, [mounts]);

  // ── Render ──────────────────────────────────────────────────
  const renderMount = useCallback(
    ({ item }: { item: MountItem }) => (
      <View style={{ width: COLUMN_WIDTH }}>
        <MountCard
          id={item.id}
          name={item.name}
          iconUrl={item.icon_url}
          sourceType={item.source_type}
          collected={collectedIds.has(item.id)}
          onPress={() => {
            // TODO: Navigate to mount detail
          }}
        />
      </View>
    ),
    [collectedIds]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold.primary} />
        <Text style={styles.loadingText}>Loading mounts...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={filteredMounts}
        renderItem={renderMount}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold.primary}
            colors={[colors.gold.primary]}
            progressBackgroundColor={colors.bg.secondary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Title */}
            <Text style={styles.title}>Mount Collection</Text>

            {/* Progress Card */}
            <Card variant="gold" style={styles.progressCard}>
              <View style={styles.progressRow}>
                <ProgressRing collected={collectedCount} total={totalMounts} size={100} />
                <View style={styles.progressInfo}>
                  <Text style={styles.progressLabel}>COLLECTED</Text>
                  <Text style={styles.progressValue}>
                    {collectedCount}
                    <Text style={styles.progressTotal}> / {totalMounts}</Text>
                  </Text>
                  <Text style={styles.progressHint}>
                    {totalMounts - collectedCount} remaining
                  </Text>
                </View>
              </View>
            </Card>

            {/* Search */}
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search mounts..." />

            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {(['all', 'collected', 'missing'] as Filter[]).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.chip, filter === f && styles.chipActive]}
                >
                  <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                    {f === 'all' ? 'All' : f === 'collected' ? 'Collected' : 'Missing'}
                  </Text>
                </Pressable>
              ))}

              {/* Divider */}
              <View style={styles.chipDivider} />

              {sourceTypes.map((src) => (
                <Pressable
                  key={src}
                  onPress={() => setSourceFilter(sourceFilter === src ? null : src)}
                  style={[styles.chip, sourceFilter === src && styles.chipActive]}
                >
                  <Text style={[styles.chipText, sourceFilter === src && styles.chipTextActive]}>
                    {src}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Results count */}
            <Text style={styles.resultsCount}>
              {filteredMounts.length} mount{filteredMounts.length !== 1 ? 's' : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No mounts found</Text>
            <Text style={styles.emptyHint}>Try adjusting your search or filters</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  listContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 100,
  },
  header: {
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.display,
    color: colors.gold.primary,
  },
  progressCard: {
    padding: spacing.xl,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  progressInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  progressLabel: {
    ...typography.label,
    color: colors.gold.dim,
  },
  progressValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
  },
  progressTotal: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.text.tertiary,
  },
  progressHint: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  chipActive: {
    backgroundColor: colors.gold.muted,
    borderColor: colors.gold.dim,
  },
  chipText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: colors.gold.primary,
  },
  chipDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginHorizontal: spacing.xs,
  },
  resultsCount: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  row: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.heading,
    color: colors.text.secondary,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
