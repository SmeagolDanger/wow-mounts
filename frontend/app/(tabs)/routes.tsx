import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl,
  Modal, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { Card } from '../../components';
import api, { FarmTask, MountSummary } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

interface Route { zone: string; tasks: FarmTask[]; completed: number; expansion?: string; order: number; }

// WoW geographic routing data — expansion order + sort within expansion
// Rough real-world travel order for mount farmers
const ZONE_GEO: { zone: string; expansion: string; order: number; type: string }[] = [
  // Classic
  { zone: 'Molten Core',             expansion: 'Classic',      order: 10, type: 'raid' },
  { zone: 'Blackwing Lair',          expansion: 'Classic',      order: 11, type: 'raid' },
  { zone: "Ruins of Ahn'Qiraj",      expansion: 'Classic',      order: 12, type: 'raid' },
  { zone: "Temple of Ahn'Qiraj",     expansion: 'Classic',      order: 13, type: 'raid' },
  // The Burning Crusade
  { zone: 'Karazhan',                expansion: 'TBC',          order: 20, type: 'raid' },
  { zone: 'Gruul\'s Lair',           expansion: 'TBC',          order: 21, type: 'raid' },
  { zone: 'Serpentshrine Cavern',    expansion: 'TBC',          order: 22, type: 'raid' },
  { zone: 'Tempest Keep',            expansion: 'TBC',          order: 23, type: 'raid' },
  { zone: 'Mount Hyjal',             expansion: 'TBC',          order: 24, type: 'raid' },
  { zone: 'Black Temple',            expansion: 'TBC',          order: 25, type: 'raid' },
  { zone: 'Sunwell Plateau',         expansion: 'TBC',          order: 26, type: 'raid' },
  { zone: 'Magisters\' Terrace',     expansion: 'TBC',          order: 27, type: 'dungeon' },
  { zone: 'Sethekk Halls',           expansion: 'TBC',          order: 28, type: 'dungeon' },
  // Wrath of the Lich King
  { zone: 'Naxxramas',               expansion: 'WotLK',        order: 30, type: 'raid' },
  { zone: 'The Eye of Eternity',     expansion: 'WotLK',        order: 31, type: 'raid' },
  { zone: 'Ulduar',                  expansion: 'WotLK',        order: 32, type: 'raid' },
  { zone: 'Trial of the Crusader',   expansion: 'WotLK',        order: 33, type: 'raid' },
  { zone: 'Icecrown Citadel',        expansion: 'WotLK',        order: 34, type: 'raid' },
  { zone: 'The Ruby Sanctum',        expansion: 'WotLK',        order: 35, type: 'raid' },
  { zone: 'The Oculus',              expansion: 'WotLK',        order: 36, type: 'dungeon' },
  { zone: 'Utgarde Pinnacle',        expansion: 'WotLK',        order: 37, type: 'dungeon' },
  { zone: 'Vault of Archavon',       expansion: 'WotLK',        order: 38, type: 'raid' },
  // Cataclysm
  { zone: "Onyxia's Lair",           expansion: 'Cataclysm',    order: 40, type: 'raid' },
  { zone: 'Baradin Hold',            expansion: 'Cataclysm',    order: 41, type: 'raid' },
  { zone: 'Blackwing Descent',       expansion: 'Cataclysm',    order: 42, type: 'raid' },
  { zone: 'Throne of the Four Winds',expansion: 'Cataclysm',    order: 43, type: 'raid' },
  { zone: 'Firelands',               expansion: 'Cataclysm',    order: 44, type: 'raid' },
  { zone: 'Dragon Soul',             expansion: 'Cataclysm',    order: 45, type: 'raid' },
  { zone: 'Zul\'Gurub',              expansion: 'Cataclysm',    order: 46, type: 'raid' },
  { zone: 'Vortex Pinnacle',         expansion: 'Cataclysm',    order: 47, type: 'dungeon' },
  // Mists of Pandaria
  { zone: "Mogu'shan Vaults",        expansion: 'MoP',          order: 50, type: 'raid' },
  { zone: 'Heart of Fear',           expansion: 'MoP',          order: 51, type: 'raid' },
  { zone: 'Terrace of Endless Spring',expansion:'MoP',          order: 52, type: 'raid' },
  { zone: 'Throne of Thunder',       expansion: 'MoP',          order: 53, type: 'raid' },
  { zone: 'Siege of Orgrimmar',      expansion: 'MoP',          order: 54, type: 'raid' },
  // Warlords of Draenor
  { zone: "Highmaul",                expansion: 'WoD',          order: 60, type: 'raid' },
  { zone: 'Blackrock Foundry',       expansion: 'WoD',          order: 61, type: 'raid' },
  { zone: "Hellfire Citadel",        expansion: 'WoD',          order: 62, type: 'raid' },
  // Legion
  { zone: 'The Emerald Nightmare',   expansion: 'Legion',       order: 70, type: 'raid' },
  { zone: 'The Nighthold',           expansion: 'Legion',       order: 71, type: 'raid' },
  { zone: 'Tomb of Sargeras',        expansion: 'Legion',       order: 72, type: 'raid' },
  { zone: 'Antorus the Burning Throne',expansion:'Legion',      order: 73, type: 'raid' },
  { zone: 'Return to Karazhan',      expansion: 'Legion',       order: 74, type: 'dungeon' },
  { zone: 'Court of Stars',          expansion: 'Legion',       order: 75, type: 'dungeon' },
  // Battle for Azeroth
  { zone: "Uldir",                   expansion: 'BfA',          order: 80, type: 'raid' },
  { zone: "Battle of Dazar'alor",    expansion: 'BfA',          order: 81, type: 'raid' },
  { zone: "Crucible of Storms",      expansion: 'BfA',          order: 82, type: 'raid' },
  { zone: "The Eternal Palace",      expansion: 'BfA',          order: 83, type: 'raid' },
  { zone: "Ny'alotha",               expansion: 'BfA',          order: 84, type: 'raid' },
  // Shadowlands
  { zone: "Castle Nathria",          expansion: 'Shadowlands',  order: 90, type: 'raid' },
  { zone: "Sanctum of Domination",   expansion: 'Shadowlands',  order: 91, type: 'raid' },
  { zone: "Sepulcher of the First Ones",expansion:'Shadowlands', order: 92, type: 'raid' },
  // Dragonflight
  { zone: "Vault of the Incarnates", expansion: 'Dragonflight', order: 100, type: 'raid' },
  { zone: "Aberrus",                 expansion: 'Dragonflight', order: 101, type: 'raid' },
  { zone: "Amirdrassil",             expansion: 'Dragonflight', order: 102, type: 'raid' },
  // The War Within
  { zone: "Nerub-ar Palace",         expansion: 'The War Within', order: 110, type: 'raid' },
  // World Bosses (by expansion, farmed weekly)
  { zone: 'World Bosses (Classic)',  expansion: 'Classic',      order: 15, type: 'world_boss' },
  { zone: 'World Bosses (WoD)',      expansion: 'WoD',          order: 65, type: 'world_boss' },
  { zone: 'World Bosses (Legion)',   expansion: 'Legion',       order: 76, type: 'world_boss' },
  { zone: 'World Bosses (BfA)',      expansion: 'BfA',          order: 85, type: 'world_boss' },
  { zone: 'World Bosses (DF)',       expansion: 'Dragonflight', order: 103, type: 'world_boss' },
  // Other
  { zone: 'Reputation Vendors',      expansion: 'Various',      order: 200, type: 'reputation' },
  { zone: 'Achievements',            expansion: 'Various',      order: 201, type: 'achievement' },
  { zone: 'Vendors',                 expansion: 'Various',      order: 202, type: 'vendor' },
  { zone: 'Questlines',              expansion: 'Various',      order: 203, type: 'quest' },
];

const ZONE_ORDER = new Map(ZONE_GEO.map(z => [z.zone, z.order]));
const ZONE_EXPANSION = new Map(ZONE_GEO.map(z => [z.zone, z.expansion]));

// Source type → best geographic zone assignment for auto-plan
const SOURCE_ZONES: Record<string, string[]> = {
  raid: ['Icecrown Citadel','Ulduar','Throne of Thunder','The Nighthold','Tempest Keep','Dragon Soul','Firelands','Naxxramas',"Mogu'shan Vaults","Castle Nathria"],
  dungeon: ['Magisters\' Terrace','Sethekk Halls','The Oculus','Utgarde Pinnacle','Return to Karazhan','Vortex Pinnacle'],
  world_boss: ['World Bosses (WoD)','World Bosses (Legion)','World Bosses (BfA)','World Bosses (DF)'],
  reputation: ['Reputation Vendors'],
  achievement: ['Achievements'],
  vendor: ['Vendors'],
  quest: ['Questlines'],
};

function getBestZone(sourceType: string): string {
  const options = SOURCE_ZONES[sourceType];
  if (!options || options.length === 0) return 'Unknown';
  return options[0]; // Return the most commonly farmed zone for this type
}

const ALL_SOURCE_TYPES = ['raid','dungeon','world_boss','reputation','achievement','vendor','quest'];

export default function RoutesScreen() {
  const { collectedIds, selectedChar } = useApp();
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [mounts, setMounts] = useState<MountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRoute, setActiveRoute] = useState<Route|null>(null);
  const [runStep, setRunStep] = useState(0);

  // Auto-plan filter modal
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(ALL_SOURCE_TYPES));
  const [maxTasks, setMaxTasks] = useState(30);
  const [planning, setPlanning] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, m] = await Promise.all([api.getFarmTasks(), api.getMounts()]);
      setTasks(t.tasks);
      setMounts(m.mounts);
    } catch {} finally { setLoading(false); }
  }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const routes = useMemo(() => {
    const map = new Map<string, FarmTask[]>();
    for (const t of tasks) {
      const z = t.zone_name || 'Unassigned';
      if (!map.has(z)) map.set(z, []);
      map.get(z)!.push(t);
    }
    return Array.from(map.entries())
      .map(([zone, zt]) => ({
        zone,
        tasks: zt.sort((a, b) => a.sort_order - b.sort_order),
        completed: zt.filter(t => t.completed).length,
        expansion: ZONE_EXPANSION.get(zone),
        order: ZONE_ORDER.get(zone) ?? 999,
      }))
      .sort((a, b) => a.order - b.order); // geographic order
  }, [tasks]);

  const totalT = tasks.length, totalD = tasks.filter(t => t.completed).length;

  const toggle = async (id: number) => {
    try {
      const r = await api.toggleFarmTask(id);
      setTasks(p => p.map(t => t.id === id ? { ...t, completed: r.completed } : t));
    } catch {}
  };

  const deleteTask = async (id: number) => {
    try {
      await api.deleteFarmTask(id);
      setTasks(p => p.filter(t => t.id !== id));
    } catch {}
  };

  const deleteRoute = (r: Route) => {
    Alert.alert(
      `Delete "${r.zone}"?`,
      `This will remove all ${r.tasks.length} task${r.tasks.length !== 1 ? 's' : ''} in this route.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All', style: 'destructive',
          onPress: async () => {
            for (const t of r.tasks) {
              try { await api.deleteFarmTask(t.id); } catch {}
            }
            setTasks(p => p.filter(t => !r.tasks.find(rt => rt.id === t.id)));
          },
        },
      ]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  // Count how many mounts would be added with current filter settings
  const planPreviewCount = useMemo(() => {
    const existingMountIds = new Set(tasks.filter(t => t.mount_id).map(t => t.mount_id));
    const charFaction = selectedChar?.faction?.toLowerCase();
    return mounts.filter(m =>
      m.source_type && selectedTypes.has(m.source_type) &&
      !existingMountIds.has(m.id) &&
      (selectedChar ? !collectedIds.has(m.id) : true) &&
      !(charFaction && m.faction && m.faction !== charFaction)
    ).length;
  }, [mounts, tasks, selectedTypes, selectedChar, collectedIds]);

  const executePlan = async () => {
    setPlanModalVisible(false);
    const farmable = Array.from(selectedTypes);
    const existingMountIds = new Set(tasks.filter(t => t.mount_id).map(t => t.mount_id));
    const charFaction = selectedChar?.faction?.toLowerCase();
    const missing = mounts.filter(m =>
      m.source_type && farmable.includes(m.source_type) &&
      !existingMountIds.has(m.id) &&
      (selectedChar ? !collectedIds.has(m.id) : true) &&
      !(charFaction && m.faction && m.faction !== charFaction)
    );

    if (missing.length === 0) {
      Alert.alert('Nothing to Add', 'All selected mount types are already planned or collected.');
      return;
    }

    // Sort by geographic order (expansion era)
    const ranked = [...missing].sort((a, b) => {
      const zoneA = getBestZone(a.source_type || '');
      const zoneB = getBestZone(b.source_type || '');
      return (ZONE_ORDER.get(zoneA) ?? 999) - (ZONE_ORDER.get(zoneB) ?? 999);
    }).slice(0, maxTasks);

    setPlanning(true);
    let added = 0;
    for (const m of ranked) {
      const zone = getBestZone(m.source_type || '');
      const reset = m.source_type === 'raid' || m.source_type === 'world_boss' ? 'weekly' : m.source_type === 'dungeon' ? 'daily' : 'none';
      try {
        await api.createFarmTask({ title: m.name, mount_id: m.id, source_type: m.source_type, zone_name: zone, reset_type: reset });
        added++;
      } catch {}
    }
    setPlanning(false);
    await load();
    Alert.alert('Plan Created', `Added ${added} mount${added !== 1 ? 's' : ''} to your farm routes!`);
  };

  const startRoute = (r: Route) => {
    setActiveRoute(r);
    const fi = r.tasks.findIndex(t => !t.completed);
    setRunStep(fi >= 0 ? fi : 0);
  };

  const typeLabels: Record<string, { label: string; icon: string; color: string }> = {
    raid:        { label: 'Raids',        icon: 'skull-outline',    color: '#C084FC' },
    dungeon:     { label: 'Dungeons',     icon: 'key-outline',      color: '#38BDF8' },
    world_boss:  { label: 'World Bosses', icon: 'flame-outline',    color: '#FB923C' },
    reputation:  { label: 'Reputation',   icon: 'people-outline',   color: '#4ADE80' },
    achievement: { label: 'Achievements', icon: 'trophy-outline',   color: '#F5B800' },
    vendor:      { label: 'Vendors',      icon: 'cart-outline',     color: '#E2E8F0' },
    quest:       { label: 'Quests',       icon: 'flag-outline',     color: '#FDE047' },
  };

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={z.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />}
      >
        <Text style={z.title}>Farm Planner</Text>
        <Text style={z.sub}>{selectedChar ? `Planning for ${selectedChar.display.split('-')[0]}` : 'Auto-plan routes or manage your farm runs'}</Text>

        <Pressable
          onPress={() => setPlanModalVisible(true)}
          style={({ pressed }) => [z.planBtn, pressed && { opacity: 0.85 }]}
          disabled={planning}
        >
          <Ionicons name="sparkles" size={20} color={colors.bg.primary} />
          <Text style={z.planBtnT}>{planning ? 'Planning...' : 'Auto-Plan Missing Mounts'}</Text>
          <View style={z.planBtnChevron}><Ionicons name="options-outline" size={16} color={colors.bg.primary} /></View>
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

        {routes.length === 0 && !loading ? (
          <View style={z.empty}>
            <Ionicons name="map-outline" size={48} color={colors.text.tertiary}/>
            <Text style={z.emptyT}>No routes yet</Text>
            <Text style={z.emptyS}>Tap "Auto-Plan" to generate a geographically-ordered farm route</Text>
          </View>
        ) : (
          <View style={z.rl}>
            {routes.map(r => {
              const pct = Math.round(r.completed / r.tasks.length * 100);
              const done = pct === 100;
              return (
                <View key={r.zone}>
                  <Card variant={done ? 'success' : 'default'} onPress={() => startRoute(r)}>
                    <View style={z.rc}>
                      <Ionicons name={done ? 'checkmark-circle' : 'navigate-circle-outline'} size={28} color={done ? colors.fel.primary : colors.gold.primary} />
                      <View style={z.rInfo}>
                        <Text style={z.rZone}>{r.zone}</Text>
                        {r.expansion && <Text style={z.rExp}>{r.expansion}</Text>}
                        <Text style={z.rMeta}>{r.tasks.length} task{r.tasks.length !== 1 ? 's' : ''} — {r.completed} done</Text>
                        <View style={z.pBar}><View style={[z.pFill, {width:`${pct}%`, backgroundColor: done ? colors.fel.primary : colors.gold.primary}]}/></View>
                      </View>
                      <Text style={[z.rPct, done && {color:colors.fel.primary}]}>{pct}%</Text>
                      <Pressable onPress={() => deleteRoute(r)} hitSlop={12} style={z.trashBtn}>
                        <Ionicons name="trash-outline" size={16} color={colors.fire.dim}/>
                      </Pressable>
                    </View>
                  </Card>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Auto-plan filter modal */}
      <Modal visible={planModalVisible} animationType="slide" transparent onRequestClose={() => setPlanModalVisible(false)}>
        <View style={z.modalBd}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPlanModalVisible(false)} />
          <View style={z.modalSheet}>
            <View style={z.modalH}/>
            <View style={z.modalHdr}>
              <Text style={z.modalTitle}>Plan Farm Route</Text>
              <Pressable onPress={() => setPlanModalVisible(false)} style={z.modalClose}>
                <Ionicons name="close" size={20} color={colors.text.secondary}/>
              </Pressable>
            </View>
            <Text style={z.modalSub}>
              {selectedChar ? `Showing missing mounts for ${selectedChar.display.split('-')[0]}` : 'Select what to farm'}
            </Text>

            <Text style={z.modalLabel}>INCLUDE SOURCE TYPES</Text>
            <View style={z.typeGrid}>
              {ALL_SOURCE_TYPES.map(type => {
                const info = typeLabels[type];
                const on = selectedTypes.has(type);
                return (
                  <Pressable key={type} onPress={() => toggleType(type)} style={[z.typeChip, on && { borderColor: info.color + '80', backgroundColor: info.color + '18' }]}>
                    <Ionicons name={info.icon as any} size={14} color={on ? info.color : colors.text.tertiary}/>
                    <Text style={[z.typeChipT, on && { color: info.color }]}>{info.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={z.modalLabel}>MAX NEW TASKS</Text>
            <View style={z.maxRow}>
              {[10, 20, 30, 50].map(n => (
                <Pressable key={n} onPress={() => setMaxTasks(n)} style={[z.maxChip, maxTasks === n && z.maxChipA]}>
                  <Text style={[z.maxChipT, maxTasks === n && z.maxChipTA]}>{n}</Text>
                </Pressable>
              ))}
            </View>

            <View style={z.previewRow}>
              <Ionicons name="sparkles-outline" size={16} color={colors.gold.dim}/>
              <Text style={z.previewT}>{Math.min(planPreviewCount, maxTasks)} mounts will be added</Text>
            </View>

            <Pressable onPress={executePlan} style={[z.goBtn, planPreviewCount === 0 && {opacity:0.4}]} disabled={planPreviewCount === 0 || selectedTypes.size === 0}>
              <Ionicons name="sparkles" size={18} color={colors.bg.primary}/>
              <Text style={z.goBtnT}>Generate Route</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Run route modal */}
      <Modal visible={activeRoute !== null} animationType="slide" transparent onRequestClose={() => setActiveRoute(null)}>
        <View style={z.runBd}>
          <View style={z.runSheet}>
            <View style={z.runH}/>
            {activeRoute && <>
              <View style={z.runHdr}>
                <View>
                  <Text style={z.runZone}>{activeRoute.zone}</Text>
                  {activeRoute.expansion && <Text style={z.runExp}>{activeRoute.expansion}</Text>}
                  <Text style={z.runProg}>Step {runStep+1} of {activeRoute.tasks.length}</Text>
                </View>
                <Pressable onPress={() => setActiveRoute(null)} style={z.runClose}>
                  <Ionicons name="close" size={20} color={colors.text.secondary}/>
                </Pressable>
              </View>
              <View style={z.dots}>
                {activeRoute.tasks.map((t,i) => (
                  <Pressable key={t.id} onPress={() => setRunStep(i)} style={[z.dot, i===runStep && z.dotA, t.completed && z.dotD]}/>
                ))}
              </View>
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
                <Pressable
                  onPress={() => {
                    toggle(activeRoute.tasks[runStep].id);
                    if (runStep < activeRoute.tasks.length-1) setRunStep(runStep+1);
                  }}
                  style={[z.runComp, activeRoute.tasks[runStep]?.completed && z.runCompD]}
                >
                  <Ionicons name={activeRoute.tasks[runStep]?.completed ? 'checkmark-done' : 'checkmark'} size={22} color={colors.bg.primary}/>
                  <Text style={z.runCompT}>{activeRoute.tasks[runStep]?.completed ? 'Done!' : 'Complete'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Alert.alert('Remove Task', `Remove "${activeRoute.tasks[runStep]?.title}" from farm list?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => {
                          deleteTask(activeRoute.tasks[runStep].id);
                          const updatedTasks = activeRoute.tasks.filter((_,i) => i !== runStep);
                          if (updatedTasks.length === 0) { setActiveRoute(null); return; }
                          setActiveRoute({ ...activeRoute, tasks: updatedTasks, completed: updatedTasks.filter(t => t.completed).length });
                          setRunStep(Math.min(runStep, updatedTasks.length-1));
                        }
                      },
                    ]);
                  }}
                  style={z.runTrash}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.fire.dim}/>
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
  planBtnT:{fontSize:15,fontWeight:'700',color:colors.bg.primary,flex:1,textAlign:'center'},
  planBtnChevron:{position:'absolute',right:spacing.lg},
  oCard:{padding:spacing.lg},
  oRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-around'},
  oStat:{alignItems:'center',gap:4},
  oNum:{fontSize:18,fontWeight:'700',color:colors.text.primary},
  oLabel:{...typography.label,fontSize:9},
  oDiv:{width:1,height:24,backgroundColor:colors.border.default},
  rl:{gap:spacing.md},
  rc:{flexDirection:'row',alignItems:'center',gap:spacing.md},
  rInfo:{flex:1,gap:2},
  rZone:{...typography.subheading,fontSize:14},
  rExp:{fontSize:10,color:colors.frost.primary,fontWeight:'600',opacity:0.8},
  rMeta:{fontSize:11,color:colors.text.secondary},
  pBar:{height:3,backgroundColor:colors.bg.primary,borderRadius:2,marginTop:3,overflow:'hidden'},
  pFill:{height:3,borderRadius:2},
  rPct:{...typography.subheading,color:colors.gold.primary,marginRight:spacing.xs},
  trashBtn:{padding:spacing.xs},
  empty:{alignItems:'center',paddingVertical:60,gap:spacing.md},
  emptyT:{...typography.heading,color:colors.text.secondary},
  emptyS:{...typography.caption,color:colors.text.tertiary,textAlign:'center',paddingHorizontal:spacing.xl},
  // Auto-plan filter modal
  modalBd:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(5,7,14,0.6)'},
  modalSheet:{backgroundColor:colors.bg.secondary,borderTopLeftRadius:radii.xl,borderTopRightRadius:radii.xl,paddingHorizontal:spacing.xl,paddingBottom:50,borderTopWidth:1,borderColor:colors.border.subtle},
  modalH:{width:32,height:4,borderRadius:2,backgroundColor:colors.border.subtle,alignSelf:'center',marginTop:spacing.md,marginBottom:spacing.lg},
  modalHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:spacing.xs},
  modalTitle:{...typography.heading,color:colors.gold.primary},
  modalClose:{backgroundColor:colors.bg.elevated,borderRadius:radii.full,padding:spacing.sm},
  modalSub:{...typography.caption,color:colors.text.tertiary,marginBottom:spacing.lg},
  modalLabel:{...typography.label,marginBottom:spacing.sm,marginTop:spacing.md},
  typeGrid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},
  typeChip:{flexDirection:'row',alignItems:'center',gap:spacing.xs,paddingHorizontal:spacing.md,paddingVertical:spacing.sm,borderRadius:radii.full,borderWidth:1,borderColor:colors.border.default,backgroundColor:colors.bg.tertiary},
  typeChipT:{fontSize:12,fontWeight:'600',color:colors.text.tertiary},
  maxRow:{flexDirection:'row',gap:spacing.sm},
  maxChip:{flex:1,alignItems:'center',paddingVertical:spacing.md,borderRadius:radii.md,backgroundColor:colors.bg.tertiary,borderWidth:1,borderColor:colors.border.default},
  maxChipA:{borderColor:colors.gold.dim,backgroundColor:colors.gold.muted},
  maxChipT:{fontSize:14,fontWeight:'600',color:colors.text.secondary},
  maxChipTA:{color:colors.gold.primary},
  previewRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.md},
  previewT:{...typography.caption,color:colors.text.secondary},
  goBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm,backgroundColor:colors.gold.primary,borderRadius:radii.md,paddingVertical:14,marginTop:spacing.sm,...shadows.card},
  goBtnT:{fontSize:15,fontWeight:'700',color:colors.bg.primary},
  // Run modal
  runBd:{flex:1,backgroundColor:'rgba(5,7,14,0.6)',justifyContent:'flex-end'},
  runSheet:{backgroundColor:colors.bg.secondary,borderTopLeftRadius:radii.xl,borderTopRightRadius:radii.xl,paddingHorizontal:spacing.xl,paddingBottom:50},
  runH:{width:32,height:4,borderRadius:2,backgroundColor:colors.border.subtle,alignSelf:'center',marginTop:spacing.md,marginBottom:spacing.lg},
  runHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},
  runZone:{...typography.heading,color:colors.frost.primary},
  runExp:{fontSize:11,color:colors.text.tertiary,marginTop:1},
  runProg:{...typography.caption,color:colors.text.tertiary,marginTop:2},
  runClose:{backgroundColor:colors.bg.elevated,borderRadius:radii.full,padding:spacing.sm},
  dots:{flexDirection:'row',gap:spacing.sm,justifyContent:'center',marginVertical:spacing.xl,flexWrap:'wrap'},
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
  runActs:{flexDirection:'row',alignItems:'center',gap:spacing.md,justifyContent:'center'},
  runNav:{width:44,height:44,borderRadius:22,backgroundColor:colors.bg.tertiary,alignItems:'center',justifyContent:'center'},
  runNavD:{opacity:0.4},
  runComp:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm,backgroundColor:colors.gold.primary,borderRadius:radii.md,paddingVertical:14},
  runCompD:{backgroundColor:colors.fel.primary},
  runCompT:{fontSize:15,fontWeight:'700',color:colors.bg.primary},
  runTrash:{width:44,height:44,borderRadius:22,backgroundColor:colors.bg.tertiary,alignItems:'center',justifyContent:'center'},
});
