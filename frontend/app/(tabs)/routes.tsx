import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { Card } from '../../components';
import api, { FarmTask, MountSummary } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

interface Route { zone:string; tasks:FarmTask[]; completed:number; }

const ZONE_MAP: Record<string,string> = {
  raid:'Various Raids', dungeon:'Various Dungeons', world_boss:'World Bosses',
  reputation:'Reputation Vendors', achievement:'Achievements', vendor:'Vendors', quest:'Questlines',
};

export default function RoutesScreen() {
  const { collectedIds, selectedChar } = useApp();
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [mounts, setMounts] = useState<MountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRoute, setActiveRoute] = useState<Route|null>(null);
  const [runStep, setRunStep] = useState(0);
  const [planning, setPlanning] = useState(false);

  const load = useCallback(async () => {
    try { const [t,m] = await Promise.all([api.getFarmTasks(), api.getMounts()]); setTasks(t.tasks); setMounts(m.mounts); } catch {} finally { setLoading(false); }
  }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const routes = useMemo(() => {
    const map = new Map<string, FarmTask[]>();
    for (const t of tasks) { const z = t.zone_name || 'Unassigned'; if (!map.has(z)) map.set(z, []); map.get(z)!.push(t); }
    return Array.from(map.entries())
      .map(([zone, zt]) => ({ zone, tasks: zt.sort((a,b) => a.sort_order - b.sort_order), completed: zt.filter(t => t.completed).length }))
      .sort((a,b) => (a.completed/a.tasks.length) - (b.completed/b.tasks.length));
  }, [tasks]);

  const totalT = tasks.length, totalD = tasks.filter(t => t.completed).length;

  const toggle = async (id: number) => {
    try { const r = await api.toggleFarmTask(id); setTasks(p => p.map(t => t.id === id ? {...t, completed: r.completed} : t)); } catch {}
  };

  const autoPlan = async () => {
    const farmable = ['raid','dungeon','world_boss','reputation','achievement','vendor','quest'];
    const existingMountIds = new Set(tasks.filter(t => t.mount_id).map(t => t.mount_id));
    // If character selected, filter to mounts they don't have. Otherwise plan all farmable.
    const charFaction = selectedChar?.faction?.toLowerCase();
    const missing = mounts.filter(m =>
      m.source_type && farmable.includes(m.source_type) &&
      !existingMountIds.has(m.id) &&
      (selectedChar ? !collectedIds.has(m.id) : true) &&
      !(charFaction && m.faction && m.faction !== charFaction)
    );

    if (missing.length === 0) { Alert.alert('All Planned', selectedChar ? 'All missing farmable mounts are already in your task list!' : 'All farmable mounts are already planned!'); return; }

    const ranked = [...missing].sort((a,b) => {
      const order: Record<string,number> = {vendor:1,quest:2,achievement:3,reputation:4,dungeon:5,raid:6,world_boss:7};
      return (order[a.source_type||'']||99) - (order[b.source_type||'']||99);
    }).slice(0, 20);

    setPlanning(true);
    let added = 0;
    for (const m of ranked) {
      const zone = ZONE_MAP[m.source_type||''] || 'Unknown';
      const reset = m.source_type === 'raid' || m.source_type === 'world_boss' ? 'weekly' : m.source_type === 'dungeon' ? 'daily' : 'none';
      try { await api.createFarmTask({ title: m.name, mount_id: m.id, source_type: m.source_type, zone_name: zone, reset_type: reset }); added++; } catch {}
    }
    setPlanning(false);
    await load();
    Alert.alert('Plan Created', `Added ${added} mount${added !== 1 ? 's' : ''} to your farm list!`);
  };

  const startRoute = (r: Route) => { setActiveRoute(r); const fi = r.tasks.findIndex(t => !t.completed); setRunStep(fi >= 0 ? fi : 0); };

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <ScrollView contentContainerStyle={z.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />}>
        <Text style={z.title}>Farm Planner</Text>
        <Text style={z.sub}>{selectedChar ? `Planning for ${selectedChar.display.split('-')[0]}` : 'Auto-plan routes or manage your farm runs'}</Text>

        <Pressable onPress={autoPlan} style={({ pressed }) => [z.planBtn, pressed && {opacity:0.85}]} disabled={planning}>
          <Ionicons name="sparkles" size={20} color={colors.bg.primary} />
          <Text style={z.planBtnT}>{planning ? 'Planning...' : 'Auto-Plan Missing Mounts'}</Text>
        </Pressable>

        <Card variant="gold" style={z.oCard}>
          <View style={z.oRow}>
            <View style={z.oStat}><Text style={z.oNum}>{routes.length}</Text><Text style={z.oLabel}>ROUTES</Text></View>
            <View style={z.oDiv}/>
            <View style={z.oStat}><Text style={z.oNum}>{totalD}/{totalT}</Text><Text style={z.oLabel}>DONE</Text></View>
            <View style={z.oDiv}/>
            <View style={z.oStat}><Text style={z.oNum}>{totalT > 0 ? Math.round(totalD/totalT*100) : 0}%</Text><Text style={z.oLabel}>PROGRESS</Text></View>
          </View>
        </Card>

        {routes.length === 0 && !loading
          ? <View style={z.empty}><Ionicons name="map-outline" size={48} color={colors.text.tertiary}/><Text style={z.emptyT}>No routes yet</Text><Text style={z.emptyS}>Tap "Auto-Plan" above or add tasks with zones in the Farm tab</Text></View>
          : <View style={z.rl}>{routes.map(r => {
              const pct = Math.round(r.completed / r.tasks.length * 100);
              const done = pct === 100;
              return (
                <Card key={r.zone} variant={done ? 'success' : 'default'} onPress={() => startRoute(r)}>
                  <View style={z.rc}>
                    <Ionicons name={done ? 'checkmark-circle' : 'navigate-circle-outline'} size={28} color={done ? colors.fel.primary : colors.gold.primary} />
                    <View style={z.rInfo}>
                      <Text style={z.rZone}>{r.zone}</Text>
                      <Text style={z.rMeta}>{r.tasks.length} task{r.tasks.length !== 1 ? 's' : ''} — {r.completed} done</Text>
                      <View style={z.pBar}><View style={[z.pFill, {width:`${pct}%`, backgroundColor: done ? colors.fel.primary : colors.gold.primary}]}/></View>
                    </View>
                    <Text style={[z.rPct, done && {color:colors.fel.primary}]}>{pct}%</Text>
                    <Ionicons name="play-circle" size={24} color={colors.gold.dim} />
                  </View>
                </Card>
              );
            })}</View>
        }
      </ScrollView>

      <Modal visible={activeRoute !== null} animationType="slide" transparent onRequestClose={() => setActiveRoute(null)}>
        <View style={z.runBd}>
          <View style={z.runSheet}>
            <View style={z.runH}/>
            {activeRoute && <>
              <View style={z.runHdr}>
                <View><Text style={z.runZone}>{activeRoute.zone}</Text><Text style={z.runProg}>Step {runStep+1} of {activeRoute.tasks.length}</Text></View>
                <Pressable onPress={() => setActiveRoute(null)} style={z.runClose}><Ionicons name="close" size={20} color={colors.text.secondary}/></Pressable>
              </View>
              <View style={z.dots}>{activeRoute.tasks.map((t,i) => <Pressable key={t.id} onPress={() => setRunStep(i)} style={[z.dot, i===runStep && z.dotA, t.completed && z.dotD]}/>)}</View>
              <View style={z.runTask}>
                <View style={[z.runCircle, activeRoute.tasks[runStep]?.completed && z.runCircleD]}>
                  {activeRoute.tasks[runStep]?.completed
                    ? <Ionicons name="checkmark" size={28} color={colors.bg.primary}/>
                    : <Text style={z.runNum}>{runStep+1}</Text>
                  }
                </View>
                <Text style={z.runTitle}>{activeRoute.tasks[runStep]?.title}</Text>
                {activeRoute.tasks[runStep]?.source_type && (
                  <View style={z.runSrc}><Text style={z.runSrcT}>{activeRoute.tasks[runStep].source_type}</Text></View>
                )}
              </View>
              <View style={z.runActs}>
                <Pressable onPress={() => setRunStep(Math.max(0, runStep-1))} style={[z.runNav, runStep===0 && z.runNavD]} disabled={runStep===0}>
                  <Ionicons name="arrow-back" size={18} color={runStep===0 ? colors.text.tertiary : colors.text.primary}/>
                </Pressable>
                <Pressable onPress={() => { toggle(activeRoute.tasks[runStep].id); if (runStep < activeRoute.tasks.length-1) setRunStep(runStep+1); }}
                  style={[z.runComp, activeRoute.tasks[runStep]?.completed && z.runCompD]}>
                  <Ionicons name={activeRoute.tasks[runStep]?.completed ? 'checkmark-done' : 'checkmark'} size={22} color={colors.bg.primary}/>
                  <Text style={z.runCompT}>{activeRoute.tasks[runStep]?.completed ? 'Done!' : 'Complete'}</Text>
                </Pressable>
                <Pressable onPress={() => setRunStep(Math.min(activeRoute.tasks.length-1, runStep+1))} style={[z.runNav, runStep>=activeRoute.tasks.length-1 && z.runNavD]} disabled={runStep>=activeRoute.tasks.length-1}>
                  <Ionicons name="arrow-forward" size={18} color={runStep>=activeRoute.tasks.length-1 ? colors.text.tertiary : colors.text.primary}/>
                </Pressable>
              </View>
            </>}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg.primary},
  content:{paddingHorizontal:spacing.lg,paddingTop:spacing.md,paddingBottom:100,gap:spacing.md},
  title:{...typography.display,color:colors.frost.primary},
  sub:{...typography.caption,color:colors.text.secondary},
  planBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm,backgroundColor:colors.gold.primary,borderRadius:radii.md,paddingVertical:14,...shadows.card},
  planBtnT:{fontSize:15,fontWeight:'700',color:colors.bg.primary},
  oCard:{padding:spacing.lg},
  oRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-around'},
  oStat:{alignItems:'center',gap:4},
  oNum:{fontSize:18,fontWeight:'700',color:colors.text.primary},
  oLabel:{...typography.label,fontSize:9},
  oDiv:{width:1,height:24,backgroundColor:colors.border.default},
  rl:{gap:spacing.md},
  rc:{flexDirection:'row',alignItems:'center',gap:spacing.md},
  rInfo:{flex:1,gap:3},
  rZone:{...typography.subheading,fontSize:14},
  rMeta:{fontSize:11,color:colors.text.secondary},
  pBar:{height:3,backgroundColor:colors.bg.primary,borderRadius:2,marginTop:3,overflow:'hidden'},
  pFill:{height:3,borderRadius:2},
  rPct:{...typography.subheading,color:colors.gold.primary,marginRight:spacing.sm},
  empty:{alignItems:'center',paddingVertical:60,gap:spacing.md},
  emptyT:{...typography.heading,color:colors.text.secondary},
  emptyS:{...typography.caption,color:colors.text.tertiary,textAlign:'center',paddingHorizontal:spacing.xl},
  runBd:{flex:1,backgroundColor:colors.bg.modal,justifyContent:'flex-end'},
  runSheet:{backgroundColor:colors.bg.secondary,borderTopLeftRadius:radii.xl,borderTopRightRadius:radii.xl,paddingHorizontal:spacing.xl,paddingBottom:50},
  runH:{width:32,height:4,borderRadius:2,backgroundColor:colors.border.subtle,alignSelf:'center',marginTop:spacing.md,marginBottom:spacing.lg},
  runHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},
  runZone:{...typography.heading,color:colors.frost.primary},
  runProg:{...typography.caption,color:colors.text.tertiary,marginTop:2},
  runClose:{backgroundColor:colors.bg.elevated,borderRadius:radii.full,padding:spacing.sm},
  dots:{flexDirection:'row',gap:spacing.sm,justifyContent:'center',marginVertical:spacing.xl},
  dot:{width:8,height:8,borderRadius:4,backgroundColor:colors.border.default},
  dotA:{backgroundColor:colors.gold.primary,width:20},
  dotD:{backgroundColor:colors.fel.dim},
  runTask:{alignItems:'center',paddingVertical:spacing.xxl,gap:spacing.lg},
  runCircle:{width:56,height:56,borderRadius:28,backgroundColor:colors.bg.tertiary,borderWidth:2,borderColor:colors.gold.dim,alignItems:'center',justifyContent:'center'},
  runCircleD:{backgroundColor:colors.fel.primary,borderColor:colors.fel.primary},
  runNum:{fontSize:22,fontWeight:'700',color:colors.gold.primary},
  runTitle:{...typography.heading,textAlign:'center'},
  runSrc:{backgroundColor:colors.bg.tertiary,paddingHorizontal:spacing.md,paddingVertical:spacing.xs,borderRadius:radii.full},
  runSrcT:{...typography.caption,fontWeight:'700',textTransform:'uppercase',color:colors.text.secondary},
  runActs:{flexDirection:'row',alignItems:'center',gap:spacing.lg,justifyContent:'center'},
  runNav:{width:44,height:44,borderRadius:22,backgroundColor:colors.bg.tertiary,alignItems:'center',justifyContent:'center'},
  runNavD:{opacity:0.4},
  runComp:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm,backgroundColor:colors.gold.primary,borderRadius:radii.md,paddingVertical:14},
  runCompD:{backgroundColor:colors.fel.primary},
  runCompT:{fontSize:15,fontWeight:'700',color:colors.bg.primary},
});
