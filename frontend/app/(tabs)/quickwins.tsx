import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import { Card, MountDetailModal } from '../../components';
import api, { MountSummary } from '../../services/api';
import { useApp } from '../../contexts/AppContext';
import { checkMountRequirements, describeRequirement, RequirementCheck } from '../../data/mountRequirements';

const DIFF: Record<string,{rank:number;label:string;icon:string;color:string;tip:string}> = {
  vendor:      {rank:1,label:'Vendor',      icon:'cart-outline',          color:'#E2E8F0',tip:'Buy directly from a vendor.'},
  quest:       {rank:2,label:'Quest',        icon:'flag-outline',          color:'#FDE047',tip:'Complete a questline.'},
  achievement: {rank:3,label:'Achievement',  icon:'trophy-outline',        color:'#F5B800',tip:'Earn a specific achievement.'},
  reputation:  {rank:4,label:'Reputation',   icon:'people-outline',        color:'#4ADE80',tip:'Reach Exalted rep with a faction.'},
  promotion:   {rank:5,label:'Promotion',    icon:'gift-outline',          color:'#22D3EE',tip:'Battle.net shop or promotions.'},
  drop:        {rank:6,label:'World Drop',   icon:'globe-outline',         color:'#94A3B8',tip:'Rare random drop from mobs.'},
  dungeon:     {rank:7,label:'Dungeon',      icon:'key-outline',           color:'#38BDF8',tip:'Farm dungeon boss daily.'},
  raid:        {rank:8,label:'Raid',         icon:'skull-outline',         color:'#C084FC',tip:'Weekly lockout farm.'},
  world_boss:  {rank:9,label:'World Boss',   icon:'flame-outline',         color:'#FB923C',tip:'Weekly kill — ~1-3% drop rate.'},
};

type MountWithReqs = MountSummary & { reqCheck?: RequirementCheck };
interface QWGroup { source:string; info:typeof DIFF[string]; mounts:MountWithReqs[]; }

const COLLECTION_LINKS = [
  { key: 'toys', label: 'Toys', icon: 'game-controller' as const, color: colors.frost.primary, route: '/(tabs)/missingtoys' },
  { key: 'pets', label: 'Pets', icon: 'paw' as const, color: colors.fel.primary, route: '/(tabs)/missingpets' },
  { key: 'titles', label: 'Titles', icon: 'bookmark' as const, color: colors.arcane.primary, route: '/(tabs)/missingtitles' },
];

export default function QuickWinsScreen() {
  const router = useRouter();
  const {
    collectedIds, selectedChar,
    collectedToyIds, collectedPetIds, collectedTitleIds,
    characterClass, characterRace, reputationStandings, completedAchievementIds, characterProfessions,
  } = useApp();
  const [mounts, setMounts] = useState<MountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<number|null>(null);
  const [expanded, setExpanded] = useState<string|null>(null);
  const [hideUnobtainable, setHideUnobtainable] = useState(true);
  const [hideUnmetReqs, setHideUnmetReqs] = useState(false);

  const load = useCallback(async () => { try { setMounts((await api.getMounts()).mounts); } catch {} finally { setLoading(false); } }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  useEffect(() => { load(); }, [load]);

  const charData = useMemo(() => ({
    className: characterClass,
    raceName: characterRace,
    faction: selectedChar?.faction,
    reputations: reputationStandings,
    achievementIds: completedAchievementIds,
    professions: characterProfessions,
  }), [characterClass, characterRace, selectedChar?.faction, reputationStandings, completedAchievementIds, characterProfessions]);

  const { groups, unobtainableCount } = useMemo(() => {
    const charFaction = selectedChar?.faction?.toLowerCase();
    let unobtCount = 0;
    const missing: MountWithReqs[] = mounts.filter(m => {
      if (!m.source_type) return false;
      if (selectedChar && collectedIds.has(m.id)) return false;
      if (charFaction && m.faction && m.faction !== charFaction) return false;
      return true;
    }).map(m => {
      const reqCheck = selectedChar ? checkMountRequirements(m.id, charData) : undefined;
      return { ...m, reqCheck };
    }).filter(m => {
      // Filter unobtainable mounts
      if (m.reqCheck) {
        const isUnobtainable = m.reqCheck.unmet.some(r => r.type === 'unobtainable');
        if (isUnobtainable) { unobtCount++; if (hideUnobtainable) return false; }
        // Filter class-restricted mounts (hard filter — can never get on wrong class)
        const classBlocked = m.reqCheck.unmet.some(r => r.type === 'class');
        if (classBlocked) return false;
        // Optionally hide mounts with unmet requirements
        if (hideUnmetReqs && !m.reqCheck.met) return false;
      }
      return true;
    });

    const map = new Map<string, MountWithReqs[]>();
    for (const m of missing) {
      const s = m.source_type!;
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(m);
    }
    const r: QWGroup[] = [];
    for (const [source, list] of map.entries()) {
      const info = DIFF[source];
      if (info) r.push({ source, info, mounts: list });
    }
    return { groups: r.sort((a, b) => a.info.rank - b.info.rank), unobtainableCount: unobtCount };
  }, [mounts, collectedIds, selectedChar, charData, hideUnobtainable, hideUnmetReqs]);

  const totalMissing = useMemo(() => {
    if (!selectedChar) return mounts.length;
    const charFaction = selectedChar.faction?.toLowerCase();
    return mounts.filter(m => {
      if (collectedIds.has(m.id)) return false;
      if (charFaction && m.faction && m.faction !== charFaction) return false;
      return true;
    }).length;
  }, [mounts, collectedIds, selectedChar]);

  const easyCount = groups.filter(g => g.info.rank <= 3).reduce((s, g) => s + g.mounts.length, 0);
  const noSourceData = mounts.length > 0 && groups.length === 0 && !mounts.some(m => m.source_type && DIFF[m.source_type]);

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <FlatList data={groups} keyExtractor={i => i.source} contentContainerStyle={z.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />}
        ListHeaderComponent={
          <View style={z.hdr}>
            <Text style={z.title}>Quick Wins</Text>
            <Text style={z.sub}>{selectedChar ? `Missing mounts for ${selectedChar.display.split('-')[0]}` : 'All mounts by difficulty to obtain'}</Text>
            <Card variant="gold" style={z.sc}>
              <View style={z.sr}>
                <View style={z.st}><Ionicons name="flash" size={18} color={colors.gold.primary}/><Text style={z.sn}>{easyCount}</Text><Text style={z.sl}>EASY</Text></View>
                <View style={z.sd}/>
                <View style={z.st}><Ionicons name="close-circle-outline" size={18} color={colors.fire.primary}/><Text style={z.sn}>{totalMissing}</Text><Text style={z.sl}>MISSING</Text></View>
                <View style={z.sd}/>
                <View style={z.st}><Ionicons name="layers-outline" size={18} color={colors.frost.primary}/><Text style={z.sn}>{groups.length}</Text><Text style={z.sl}>SOURCES</Text></View>
              </View>
            </Card>
            {selectedChar && (
              <View style={z.filters}>
                <Pressable onPress={() => setHideUnobtainable(h => !h)} style={[z.filterBtn, hideUnobtainable && z.filterBtnActive]}>
                  <Ionicons name={hideUnobtainable ? 'eye-off' : 'eye'} size={12} color={hideUnobtainable ? colors.bg.primary : colors.text.secondary} />
                  <Text style={[z.filterBtnT, hideUnobtainable && z.filterBtnTActive]}>
                    Unobtainable{unobtainableCount > 0 ? ` (${unobtainableCount})` : ''}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setHideUnmetReqs(h => !h)} style={[z.filterBtn, hideUnmetReqs && z.filterBtnActive]}>
                  <Ionicons name={hideUnmetReqs ? 'funnel' : 'funnel-outline'} size={12} color={hideUnmetReqs ? colors.bg.primary : colors.text.secondary} />
                  <Text style={[z.filterBtnT, hideUnmetReqs && z.filterBtnTActive]}>Reqs Not Met</Text>
                </Pressable>
              </View>
            )}

            {/* Quick links to other collection missing lists */}
            {selectedChar && (
              <View style={z.collectionLinks}>
                <Text style={z.collectionLinksTitle}>More Collections</Text>
                <View style={z.collectionLinkRow}>
                  {COLLECTION_LINKS.map(link => {
                    const collected = link.key === 'toys' ? collectedToyIds.size
                      : link.key === 'pets' ? collectedPetIds.size
                      : collectedTitleIds.size;
                    return (
                      <Pressable key={link.key} onPress={() => router.push(link.route as any)} style={z.collectionLinkCard}>
                        <View style={[z.collectionLinkIcon, { backgroundColor: link.color + '18' }]}>
                          <Ionicons name={link.icon} size={16} color={link.color} />
                        </View>
                        <Text style={z.collectionLinkLabel}>{link.label}</Text>
                        <Text style={[z.collectionLinkCount, { color: link.color }]}>{collected}</Text>
                        <Ionicons name="chevron-forward" size={12} color={colors.text.tertiary} />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        }
        renderItem={({ item: g }) => {
          const exp = expanded === g.source;
          const shown = exp ? g.mounts : g.mounts.slice(0, 5);
          return (
            <View style={z.group}>
              <Pressable onPress={() => setExpanded(exp ? null : g.source)} style={z.gh}>
                <View style={[z.gi, { backgroundColor: g.info.color + '18' }]}>
                  <Ionicons name={g.info.icon as any} size={16} color={g.info.color} />
                </View>
                <View style={z.gInfo}>
                  <Text style={z.gn}>{g.info.label}</Text>
                  <Text style={z.gt}>{g.info.tip}</Text>
                </View>
                <Text style={[z.gc, { color: g.info.color }]}>{g.mounts.length}</Text>
                <Ionicons name={exp ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text.tertiary} />
              </Pressable>
              <View style={z.ml}>
                {shown.map(m => {
                  const hasUnmet = m.reqCheck && !m.reqCheck.met;
                  const isUnobtainable = m.reqCheck?.unmet.some(r => r.type === 'unobtainable');
                  return (
                  <Pressable key={m.id} onPress={() => setSelected(m.id)} style={({ pressed }) => [z.mr, pressed && z.mrP, isUnobtainable && z.mrUnobtainable]}>
                    {m.icon_url
                      ? <Image source={{ uri: m.icon_url }} style={z.mt} />
                      : <View style={[z.mt, z.mtPh]}><Ionicons name="sparkles-outline" size={12} color={colors.gold.dim} /></View>
                    }
                    <View style={z.mnWrap}>
                      <Text style={[z.mn, isUnobtainable && z.mnDim]} numberOfLines={1}>{m.name}</Text>
                      {hasUnmet && (
                        <Text style={z.reqTag} numberOfLines={1}>
                          {m.reqCheck!.unmet.map(r => describeRequirement(r)).join(' · ')}
                        </Text>
                      )}
                    </View>
                    {m.faction === 'alliance' && <View style={[z.fBadge, {backgroundColor:'#4A90D918'}]}><Text style={[z.fBadgeT, {color:'#4A90D9'}]}>A</Text></View>}
                    {m.faction === 'horde' && <View style={[z.fBadge, {backgroundColor:'#C41F3B18'}]}><Text style={[z.fBadgeT, {color:'#C41F3B'}]}>H</Text></View>}
                    {hasUnmet && !isUnobtainable && <Ionicons name="lock-closed" size={12} color={colors.text.tertiary} />}
                    {isUnobtainable && <Ionicons name="ban" size={12} color={colors.fire.dim} />}
                    {!hasUnmet && <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />}
                  </Pressable>
                  );
                })}
                {!exp && g.mounts.length > 5 && (
                  <Pressable onPress={() => setExpanded(g.source)} style={z.more}>
                    <Text style={z.moreT}>Show all {g.mounts.length}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!loading ? (
          <View style={z.empty}>
            {noSourceData
              ? <><Ionicons name="sync-outline" size={40} color={colors.text.tertiary} /><Text style={z.emptyT}>Enrichment in progress</Text><Text style={z.emptyS}>Mount source data is loading in the background. Pull to refresh in a moment.</Text></>
              : <><Ionicons name="sparkles" size={40} color={colors.gold.dim} /><Text style={z.emptyT}>{selectedChar ? 'All collected!' : 'No mounts found'}</Text></>
            }
          </View>
        ) : null}
      />
      <MountDetailModal mountId={selected} visible={selected !== null} onClose={() => setSelected(null)} onFarmChange={() => {}} />
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg.primary},
  list:{paddingHorizontal:spacing.lg,paddingBottom:120},
  hdr:{paddingTop:spacing.md,paddingBottom:spacing.lg,gap:spacing.sm},
  title:{...typography.display,color:colors.gold.bright},
  sub:{...typography.caption,color:colors.text.secondary},
  sc:{padding:spacing.lg},
  sr:{flexDirection:'row',alignItems:'center',justifyContent:'space-around'},
  st:{alignItems:'center',gap:4},
  sn:{fontSize:18,fontWeight:'700',color:colors.text.primary},
  sl:{...typography.label,fontSize:9},
  sd:{width:1,height:24,backgroundColor:colors.border.default},
  group:{marginBottom:spacing.lg},
  gh:{flexDirection:'row',alignItems:'center',gap:spacing.md,paddingVertical:spacing.sm},
  gi:{width:32,height:32,borderRadius:radii.md,alignItems:'center',justifyContent:'center'},
  gInfo:{flex:1,gap:1},
  gn:{...typography.subheading,fontSize:14},
  gt:{fontSize:10,color:colors.text.tertiary},
  gc:{fontSize:15,fontWeight:'700',marginRight:spacing.sm},
  ml:{gap:spacing.xs,marginLeft:44},
  mr:{flexDirection:'row',alignItems:'center',gap:spacing.sm,backgroundColor:colors.bg.secondary,borderRadius:radii.sm,padding:spacing.sm,borderWidth:1,borderColor:colors.border.default},
  mrP:{backgroundColor:colors.bg.tertiary},
  mt:{width:28,height:28,borderRadius:radii.sm,backgroundColor:colors.bg.tertiary},
  mtPh:{alignItems:'center',justifyContent:'center'},
  mnWrap:{flex:1,gap:1},
  mn:{fontSize:12,color:colors.text.primary},
  mnDim:{color:colors.text.tertiary},
  reqTag:{fontSize:9,color:colors.text.tertiary,fontStyle:'italic'},
  mrUnobtainable:{opacity:0.5},
  fBadge:{width:16,height:16,borderRadius:8,alignItems:'center',justifyContent:'center'},
  fBadgeT:{fontSize:8,fontWeight:'800'},
  filters:{flexDirection:'row',gap:spacing.sm,flexWrap:'wrap'},
  filterBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:spacing.md,paddingVertical:6,borderRadius:radii.full,borderWidth:1,borderColor:colors.border.default,backgroundColor:colors.bg.secondary},
  filterBtnActive:{backgroundColor:colors.gold.primary,borderColor:colors.gold.primary},
  filterBtnT:{fontSize:11,color:colors.text.secondary},
  filterBtnTActive:{color:colors.bg.primary,fontWeight:'600'},
  collectionLinks:{gap:spacing.sm,marginTop:spacing.sm},
  collectionLinksTitle:{...typography.label,color:colors.text.tertiary,marginBottom:2},
  collectionLinkRow:{gap:spacing.xs},
  collectionLinkCard:{flexDirection:'row',alignItems:'center',gap:spacing.sm,backgroundColor:colors.bg.secondary,borderRadius:radii.md,padding:spacing.sm,borderWidth:1,borderColor:colors.border.default},
  collectionLinkIcon:{width:28,height:28,borderRadius:radii.sm,alignItems:'center',justifyContent:'center'},
  collectionLinkLabel:{flex:1,fontSize:13,fontWeight:'600',color:colors.text.primary},
  collectionLinkCount:{fontSize:13,fontWeight:'700',marginRight:spacing.xs},
  more:{paddingVertical:spacing.sm,alignItems:'center'},
  moreT:{fontSize:11,color:colors.gold.primary,fontWeight:'600'},
  empty:{alignItems:'center',paddingVertical:80,gap:spacing.md,paddingHorizontal:spacing.xl},
  emptyT:{...typography.heading,color:colors.text.secondary,textAlign:'center'},
  emptyS:{...typography.caption,color:colors.text.tertiary,textAlign:'center',lineHeight:18},
});
