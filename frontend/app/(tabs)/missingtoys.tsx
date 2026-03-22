import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, radii } from '../../theme';
import { Card } from '../../components';
import api, { GameItem } from '../../services/api';
import { useApp } from '../../contexts/AppContext';
import { TOY_REQUIREMENTS, checkCollectionReqs, describeReq, ReqCheck } from '../../data/collectionRequirements';

type ToyWithReqs = GameItem & { reqCheck?: ReqCheck };

export default function MissingToysScreen() {
  const router = useRouter();
  const {
    collectedToyIds, selectedChar,
    characterClass, characterRace, reputationStandings, completedAchievementIds, characterProfessions,
  } = useApp();
  const [allToys, setAllToys] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hideUnobtainable, setHideUnobtainable] = useState(true);
  const [hideUnmetReqs, setHideUnmetReqs] = useState(false);

  const load = useCallback(async () => {
    try { setAllToys((await api.getAllToys()).toys); } catch {} finally { setLoading(false); }
  }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  useEffect(() => { load(); }, [load]);

  const charData = useMemo(() => ({
    className: characterClass, raceName: characterRace,
    faction: selectedChar?.faction, reputations: reputationStandings,
    achievementIds: completedAchievementIds, professions: characterProfessions,
  }), [characterClass, characterRace, selectedChar?.faction, reputationStandings, completedAchievementIds, characterProfessions]);

  const { missing, unobtainableCount, totalInGame } = useMemo(() => {
    let unobtCount = 0;
    const totalInGame = allToys.length;
    const items: ToyWithReqs[] = allToys
      .filter(t => !collectedToyIds.has(t.id))
      .map(t => {
        const reqs = TOY_REQUIREMENTS[t.id];
        const reqCheck = selectedChar && reqs ? checkCollectionReqs(reqs, charData) : undefined;
        return { ...t, reqCheck };
      })
      .filter(t => {
        if (t.reqCheck) {
          if (t.reqCheck.unmet.some(r => r.type === 'unobtainable')) { unobtCount++; if (hideUnobtainable) return false; }
          if (t.reqCheck.unmet.some(r => r.type === 'class')) return false;
          if (hideUnmetReqs && !t.reqCheck.met) return false;
        }
        return true;
      });
    return { missing: items, unobtainableCount: unobtCount, totalInGame };
  }, [allToys, collectedToyIds, selectedChar, charData, hideUnobtainable, hideUnmetReqs]);

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <FlatList data={missing} keyExtractor={i => String(i.id)} contentContainerStyle={z.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} />}
        ListHeaderComponent={
          <View style={z.hdr}>
            <Pressable onPress={() => router.back()} style={z.back}>
              <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
            </Pressable>
            <Text style={z.title}>Missing Toys</Text>
            <Text style={z.sub}>{selectedChar ? selectedChar.display.split('-')[0] : 'All toys'}</Text>
            <Card variant="gold" style={z.sc}>
              <View style={z.sr}>
                <View style={z.st}><Text style={z.sn}>{collectedToyIds.size}</Text><Text style={z.sl}>COLLECTED</Text></View>
                <View style={z.sd} />
                <View style={z.st}><Text style={z.sn}>{missing.length}</Text><Text style={z.sl}>MISSING</Text></View>
                <View style={z.sd} />
                <View style={z.st}><Text style={z.sn}>{totalInGame}</Text><Text style={z.sl}>TOTAL</Text></View>
              </View>
            </Card>
            {selectedChar && (
              <View style={z.filters}>
                <Pressable onPress={() => setHideUnobtainable(h => !h)} style={[z.fBtn, hideUnobtainable && z.fBtnA]}>
                  <Ionicons name={hideUnobtainable ? 'eye-off' : 'eye'} size={12} color={hideUnobtainable ? colors.bg.primary : colors.text.secondary} />
                  <Text style={[z.fBtnT, hideUnobtainable && z.fBtnTA]}>Unobtainable{unobtainableCount > 0 ? ` (${unobtainableCount})` : ''}</Text>
                </Pressable>
                <Pressable onPress={() => setHideUnmetReqs(h => !h)} style={[z.fBtn, hideUnmetReqs && z.fBtnA]}>
                  <Ionicons name={hideUnmetReqs ? 'funnel' : 'funnel-outline'} size={12} color={hideUnmetReqs ? colors.bg.primary : colors.text.secondary} />
                  <Text style={[z.fBtnT, hideUnmetReqs && z.fBtnTA]}>Reqs Not Met</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const hasUnmet = item.reqCheck && !item.reqCheck.met;
          const isUnobt = item.reqCheck?.unmet.some(r => r.type === 'unobtainable');
          return (
            <View style={[z.row, isUnobt && z.rowDim]}>
              <View style={z.icon}><Ionicons name="game-controller" size={14} color={colors.frost.primary} /></View>
              <View style={z.info}>
                <Text style={[z.name, isUnobt && z.nameDim]} numberOfLines={1}>{item.name}</Text>
                {hasUnmet && <Text style={z.req} numberOfLines={1}>{item.reqCheck!.unmet.map(r => describeReq(r)).join(' · ')}</Text>}
              </View>
              {hasUnmet && !isUnobt && <Ionicons name="lock-closed" size={12} color={colors.text.tertiary} />}
              {isUnobt && <Ionicons name="ban" size={12} color={colors.fire.dim} />}
            </View>
          );
        }}
        ListEmptyComponent={!loading ? (
          <View style={z.empty}><Ionicons name="game-controller" size={40} color={colors.gold.dim} /><Text style={z.emptyT}>All toys collected!</Text></View>
        ) : <ActivityIndicator size="large" color={colors.gold.primary} style={{ marginTop: 80 }} />}
      />
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  hdr: { paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm },
  back: { width: 32, height: 32, borderRadius: radii.full, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.display, color: colors.frost.primary },
  sub: { ...typography.caption, color: colors.text.secondary },
  sc: { padding: spacing.lg },
  sr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  st: { alignItems: 'center', gap: 4 },
  sn: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  sl: { ...typography.label, fontSize: 9 },
  sd: { width: 1, height: 24, backgroundColor: colors.border.default },
  filters: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  fBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.secondary },
  fBtnA: { backgroundColor: colors.gold.primary, borderColor: colors.gold.primary },
  fBtnT: { fontSize: 11, color: colors.text.secondary },
  fBtnTA: { color: colors.bg.primary, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radii.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border.default, marginBottom: spacing.xs },
  rowDim: { opacity: 0.5 },
  icon: { width: 28, height: 28, borderRadius: radii.sm, backgroundColor: colors.frost.primary + '18', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 1 },
  name: { fontSize: 12, color: colors.text.primary },
  nameDim: { color: colors.text.tertiary },
  req: { fontSize: 9, color: colors.text.tertiary, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyT: { ...typography.heading, color: colors.text.secondary },
});
