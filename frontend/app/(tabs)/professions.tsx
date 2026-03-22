import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, SectionList, StyleSheet, Pressable, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radii } from '../../theme';
import { Card } from '../../components';
import api, { ProfessionData, ProfessionEntry, ProfessionTier } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

const ACCENT = '#FB923C';

const PROFESSION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Alchemy': 'flask-outline',
  'Blacksmithing': 'hammer-outline',
  'Enchanting': 'sparkles-outline',
  'Engineering': 'cog-outline',
  'Herbalism': 'leaf-outline',
  'Inscription': 'pencil-outline',
  'Jewelcrafting': 'diamond-outline',
  'Leatherworking': 'cut-outline',
  'Mining': 'construct-outline',
  'Skinning': 'cut-outline',
  'Tailoring': 'shirt-outline',
  'Cooking': 'restaurant-outline',
  'Fishing': 'fish-outline',
  'Archaeology': 'search-outline',
};

interface Section {
  title: string;
  profName: string;
  skillText: string;
  data: { id: number; name: string }[];
}

export default function ProfessionsScreen() {
  const router = useRouter();
  const { selectedChar } = useApp();
  const [profData, setProfData] = useState<ProfessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedChar) { setLoading(false); return; }
    try {
      setProfData(await api.getCharacterProfessions(selectedChar.realm_slug, selectedChar.character_name));
    } catch { setProfData(null); }
    finally { setLoading(false); }
  }, [selectedChar]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  useEffect(() => { load(); }, [load]);

  const buildSections = (): Section[] => {
    if (!profData) return [];
    const sections: Section[] = [];
    const allProfs = [...profData.primaries, ...profData.secondaries];
    for (const prof of allProfs) {
      for (const tier of prof.tiers) {
        if (tier.known_recipes.length === 0) continue;
        const key = `${prof.name}|${tier.tier_name}`;
        sections.push({
          title: key,
          profName: prof.name,
          skillText: `${tier.skill_points}/${tier.max_skill_points}`,
          data: expandedTier === key ? tier.known_recipes : [],
        });
      }
    }
    return sections;
  };

  if (!selectedChar) return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <View style={z.emptyFull}>
        <Ionicons name="flask-outline" size={48} color={colors.text.tertiary} />
        <Text style={z.emptyTitle}>Select a Character</Text>
        <Text style={z.emptySub}>Choose a character from the Collection tab to view their professions.</Text>
      </View>
    </SafeAreaView>
  );

  if (loading) return (
    <SafeAreaView style={z.loadC}>
      <ActivityIndicator size="large" color={ACCENT} />
      <Text style={z.loadT}>Loading professions...</Text>
    </SafeAreaView>
  );

  const sections = buildSections();
  const allProfs = profData ? [...profData.primaries, ...profData.secondaries] : [];

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(item, i) => `${item.id}-${i}`}
        contentContainerStyle={z.list}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} progressBackgroundColor={colors.bg.secondary} />}
        ListHeaderComponent={
          <View style={z.hdr}>
            <Pressable onPress={() => router.back()} style={z.back}>
              <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
            </Pressable>
            <Text style={z.title}>Professions</Text>
            <Card variant="default" style={z.heroCard}>
              <View style={z.heroRow}>
                <View style={z.heroStat}>
                  <View style={[z.heroIcon, { backgroundColor: ACCENT + '18' }]}>
                    <Ionicons name="flask" size={20} color={ACCENT} />
                  </View>
                  <Text style={z.heroNum}>{(profData?.total_recipes || 0).toLocaleString()}</Text>
                  <Text style={z.heroLabel}>RECIPES LEARNED</Text>
                </View>
                <View style={z.heroDivider} />
                <View style={z.heroStat}>
                  <View style={[z.heroIcon, { backgroundColor: ACCENT + '18' }]}>
                    <Ionicons name="construct" size={20} color={ACCENT} />
                  </View>
                  <Text style={z.heroNum}>{allProfs.length}</Text>
                  <Text style={z.heroLabel}>PROFESSIONS</Text>
                </View>
              </View>
            </Card>

            {/* Profession summary cards */}
            <View style={z.profGrid}>
              {allProfs.map(prof => {
                const icon = PROFESSION_ICONS[prof.name] || 'ellipse-outline';
                return (
                  <View key={prof.id} style={z.profCard}>
                    <Ionicons name={icon} size={16} color={ACCENT} />
                    <Text style={z.profName} numberOfLines={1}>{prof.name}</Text>
                    <Text style={z.profCount}>{prof.total_known}</Text>
                  </View>
                );
              })}
            </View>

            {sections.length > 0 && <Text style={z.sectionTitle}>Recipe Tiers</Text>}
          </View>
        }
        renderSectionHeader={({ section }) => {
          const isExpanded = expandedTier === section.title;
          const [profName, tierName] = section.title.split('|');
          const icon = PROFESSION_ICONS[profName] || 'ellipse-outline';
          const recipeCount = profData
            ? [...profData.primaries, ...profData.secondaries]
                .find(p => p.name === profName)
                ?.tiers.find(t => t.tier_name === tierName)
                ?.known_recipes.length || 0
            : 0;
          return (
            <Pressable
              onPress={() => setExpandedTier(isExpanded ? null : section.title)}
              style={z.tierHeader}
            >
              <Ionicons name={icon} size={16} color={ACCENT} />
              <View style={z.tierInfo}>
                <Text style={z.tierName} numberOfLines={1}>{profName}</Text>
                <Text style={z.tierSub}>{tierName}</Text>
              </View>
              <View style={z.tierRight}>
                <Text style={z.tierCount}>{recipeCount}</Text>
                <Text style={z.tierSkill}>{section.skillText}</Text>
              </View>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text.tertiary} />
            </Pressable>
          );
        }}
        renderItem={({ item }) => (
          <View style={z.recipeRow}>
            <Ionicons name="checkmark-circle" size={14} color={ACCENT} />
            <Text style={z.recipeName} numberOfLines={1}>{item.name}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={z.empty}>
            <Ionicons name="flask-outline" size={40} color={colors.text.tertiary} />
            <Text style={z.emptyT}>{profData ? 'No profession data' : 'Failed to load professions'}</Text>
          </View>
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
  title: { ...typography.display, color: ACCENT },
  heroCard: { padding: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  heroStat: { alignItems: 'center', gap: spacing.xs },
  heroIcon: { width: 40, height: 40, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  heroNum: { fontSize: 24, fontWeight: '700', color: colors.text.primary },
  heroLabel: { ...typography.label, fontSize: 9 },
  heroDivider: { width: 1, height: 40, backgroundColor: colors.border.default },
  sectionTitle: { ...typography.heading, marginTop: spacing.sm },
  profGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  profCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.bg.secondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.md, paddingVertical: 10 },
  profName: { fontSize: 12, fontWeight: '600', color: colors.text.primary, flex: 1 },
  profCount: { fontSize: 13, fontWeight: '700', color: ACCENT },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.xs, backgroundColor: colors.bg.secondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default },
  tierInfo: { flex: 1, gap: 2 },
  tierName: { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  tierSub: { fontSize: 10, color: colors.text.tertiary },
  tierRight: { alignItems: 'flex-end', gap: 2 },
  tierCount: { fontSize: 15, fontWeight: '700', color: ACCENT },
  tierSkill: { fontSize: 9, color: colors.text.tertiary, fontWeight: '600' },
  recipeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6, paddingHorizontal: spacing.lg, marginLeft: spacing.lg },
  recipeName: { flex: 1, fontSize: 12, color: colors.text.secondary },
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyT: { ...typography.heading, color: colors.text.secondary },
  emptyFull: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.text.secondary },
  emptySub: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', lineHeight: 18 },
});
