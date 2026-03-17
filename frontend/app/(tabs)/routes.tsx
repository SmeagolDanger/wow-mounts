import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl,
  Modal, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { Card } from '../../components';
import api, { FarmTask, MountSummary } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

interface Route { zone: string; tasks: FarmTask[]; completed: number; expansion?: string; order: number; }

// Step types for the SimpleArmory-style planner
type StepKind = 'portal' | 'fly' | 'farm';
interface RouteStep {
  id: string;
  kind: StepKind;
  label: string;       // mount name (farm) or zone/hub name (travel)
  subLabel?: string;   // zone (farm) or expansion (portal/fly)
  boss?: string;
  notes?: string;
  taskId?: number;
  completed?: boolean;
  stepNum?: number;    // only for farm steps
}

// ── WoW geographic routing data ──────────────────────────────────────────────
const ZONE_GEO: { zone: string; expansion: string; order: number; type: string; note?: string }[] = [
  // Classic
  { zone: 'Stratholme',              expansion: 'Classic',        order:  5, type: 'dungeon',    note: "Rivendare's Deathcharger — Baron Rivendare" },
  { zone: "Onyxia's Lair",           expansion: 'Classic',        order:  6, type: 'raid',       note: 'Onyxian Drake — Onyxia' },
  { zone: 'Molten Core',             expansion: 'Classic',        order:  7, type: 'raid' },
  { zone: 'Blackwing Lair',          expansion: 'Classic',        order:  8, type: 'raid' },
  { zone: "Ruins of Ahn'Qiraj",      expansion: 'Classic',        order:  9, type: 'raid' },
  { zone: "Temple of Ahn'Qiraj",     expansion: 'Classic',        order: 10, type: 'raid',       note: 'Qiraji Battle Tanks — Trash & Bosses (only usable inside AQ)' },
  // TBC
  { zone: 'Sethekk Halls',           expansion: 'TBC',            order: 20, type: 'dungeon',    note: 'Raven Lord — Anzu (Heroic)' },
  { zone: "Magisters' Terrace",      expansion: 'TBC',            order: 21, type: 'dungeon',    note: "Swift White Hawkstrider — Kael'thas Sunstrider (Heroic)" },
  { zone: 'Karazhan',                expansion: 'TBC',            order: 22, type: 'raid',       note: 'Fiery Warhorse — Attumen the Huntsman' },
  { zone: 'Serpentshrine Cavern',    expansion: 'TBC',            order: 23, type: 'raid' },
  { zone: 'Tempest Keep',            expansion: 'TBC',            order: 24, type: 'raid',       note: "Ashes of Al'ar — Kael'thas Sunstrider" },
  { zone: 'Battle for Mount Hyjal',  expansion: 'TBC',            order: 25, type: 'raid' },
  { zone: 'Black Temple',            expansion: 'TBC',            order: 26, type: 'raid' },
  { zone: 'Sunwell Plateau',         expansion: 'TBC',            order: 27, type: 'raid' },
  // WotLK
  { zone: 'Culling of Stratholme',   expansion: 'WotLK',          order: 30, type: 'dungeon',    note: 'Bronze Drake — Infinite Corruptor (Heroic timed)' },
  { zone: 'Utgarde Pinnacle',        expansion: 'WotLK',          order: 31, type: 'dungeon',    note: 'Blue Proto-Drake — Skadi the Ruthless (Heroic)' },
  { zone: 'The Oculus',              expansion: 'WotLK',          order: 32, type: 'dungeon',    note: 'Blue Drake / Azure Drake — Cache of the Ley-Guardian (Heroic)' },
  { zone: 'Vault of Archavon',       expansion: 'WotLK',          order: 33, type: 'raid',       note: 'Grand Black War Mammoth — any boss (requires Wintergrasp control)' },
  { zone: 'The Obsidian Sanctum',    expansion: 'WotLK',          order: 34, type: 'raid',       note: 'Black Drake / Twilight Drake — Sartharion (with drakes alive, 10/25)' },
  { zone: 'The Eye of Eternity',     expansion: 'WotLK',          order: 35, type: 'raid',       note: 'Azure Drake / Blue Drake — Malygos' },
  { zone: 'Naxxramas',               expansion: 'WotLK',          order: 36, type: 'raid' },
  { zone: 'Ulduar',                  expansion: 'WotLK',          order: 37, type: 'raid',       note: "Mimiron's Head — Yogg-Saron (25-man, no keepers)" },
  { zone: 'Trial of the Crusader',   expansion: 'WotLK',          order: 38, type: 'raid',       note: 'Crusader mounts — Grand Crusader (Heroic 25)' },
  { zone: 'Icecrown Citadel',        expansion: 'WotLK',          order: 39, type: 'raid',       note: 'Invincible — The Lich King (Heroic 25)' },
  // Cataclysm
  { zone: 'Vortex Pinnacle',         expansion: 'Cataclysm',      order: 40, type: 'dungeon',    note: 'Drake of the North Wind — Altairus' },
  { zone: 'The Stonecore',           expansion: 'Cataclysm',      order: 41, type: 'dungeon',    note: 'Vitreous Stone Drake — Slabhide' },
  { zone: "Zul'Gurub",               expansion: 'Cataclysm',      order: 42, type: 'raid',       note: 'Armored Razzashi Raptor — Bloodlord Mandokir · Swift Zulian Panther — High Priestess Kilnara' },
  { zone: "Zul'Aman",                expansion: 'Cataclysm',      order: 43, type: 'raid',       note: 'Amani Battle Bear — timed run (Heroic)' },
  { zone: 'Blackwing Descent',       expansion: 'Cataclysm',      order: 44, type: 'raid' },
  { zone: 'Throne of the Four Winds',expansion: 'Cataclysm',      order: 45, type: 'raid',       note: "Drake of the South Wind — Al'Akir" },
  { zone: 'Firelands',               expansion: 'Cataclysm',      order: 46, type: 'raid',       note: 'Pureblood Fire Hawk — Ragnaros · Flametalon of Alysrazor — Alysrazor' },
  { zone: 'Dragon Soul',             expansion: 'Cataclysm',      order: 47, type: 'raid',       note: "Blazing Drake / Life-Binder's Handmaiden — Deathwing · Experiment 12-B — Ultraxion" },
  // MoP
  { zone: "Mogu'shan Vaults",        expansion: 'MoP',            order: 50, type: 'raid',       note: 'Astral Cloud Serpent — Elegon' },
  { zone: 'Throne of Thunder',       expansion: 'MoP',            order: 51, type: 'raid',       note: 'Clutch of Ji-Kun — Ji-Kun · Spawn of Horridon — Horridon' },
  { zone: 'Siege of Orgrimmar',      expansion: 'MoP',            order: 52, type: 'raid',       note: "Kor'kron Juggernaut — Garrosh Hellscream (Mythic)" },
  { zone: 'Sha of Anger',            expansion: 'MoP',            order: 53, type: 'world_boss', note: 'Heavenly Onyx Cloud Serpent — Sha of Anger (Kun-Lai Summit)' },
  { zone: 'Nalak',                   expansion: 'MoP',            order: 54, type: 'world_boss', note: 'Thundering Cobalt Cloud Serpent — Nalak (Isle of Thunder)' },
  { zone: 'Oondasta',                expansion: 'MoP',            order: 55, type: 'world_boss', note: 'Cobalt Primordial Direhorn — Oondasta (Isle of Giants)' },
  { zone: 'Galleon',                 expansion: 'MoP',            order: 56, type: 'world_boss', note: "Son of Galleon — Salyis's Warband (Valley of the Four Winds)" },
  { zone: 'Huolon',                  expansion: 'MoP',            order: 57, type: 'world_boss', note: 'Thundering Onyx Cloud Serpent — Huolon (Timeless Isle)' },
  // WoD
  { zone: 'Highmaul',                expansion: 'WoD',            order: 60, type: 'raid' },
  { zone: 'Blackrock Foundry',       expansion: 'WoD',            order: 61, type: 'raid',       note: 'Ironhoof Destroyer — Blackhand (Mythic)' },
  { zone: 'Hellfire Citadel',        expansion: 'WoD',            order: 62, type: 'raid',       note: 'Felsteel Annihilator — Archimonde (Mythic)' },
  { zone: 'Tanaan Jungle',           expansion: 'WoD',            order: 63, type: 'world_boss', note: 'Reins of the Terrorfiend — Terrorguard · Swift Breezestrider — Deathtalon · Tundra Icehoof — Vengeance · Rattling Iron Cage — Doomroller' },
  { zone: 'Draenor Rares',           expansion: 'WoD',            order: 64, type: 'world_boss', note: 'Reins of Rukhmar (Spires of Arak), Sunhide Gronnling (Gorgrond), Nakk the Thunderer (Nagrand)' },
  // Legion
  { zone: 'Return to Karazhan',      expansion: 'Legion',         order: 70, type: 'dungeon',    note: 'Smoldering Ember Wyrm — Nightbane · Midnight — Attumen (Mythic)' },
  { zone: 'The Emerald Nightmare',   expansion: 'Legion',         order: 71, type: 'raid' },
  { zone: 'The Nighthold',           expansion: 'Legion',         order: 72, type: 'raid',       note: "Felblaze Infernal — Gul'dan · Hellfire Infernal — Gul'dan (Mythic)" },
  { zone: 'Tomb of Sargeras',        expansion: 'Legion',         order: 73, type: 'raid',       note: "Abyss Worm — Mistress Sassz'ine" },
  { zone: 'Antorus, the Burning Throne', expansion: 'Legion',     order: 74, type: 'raid',       note: "Antoran Charhound — Shatug · Shackled Ur'zul — Argus the Unmaker (Mythic)" },
  { zone: 'Antoran Wastes',          expansion: 'Legion',         order: 75, type: 'world_boss', note: 'Several mounts from rare world bosses on Argus' },
  // BfA
  { zone: 'Freehold',                expansion: 'BfA',            order: 80, type: 'dungeon',    note: 'Sharkbait — Harlan Sweete (Mythic)' },
  { zone: "Kings' Rest",             expansion: 'BfA',            order: 81, type: 'dungeon',    note: 'Tomb Stalker — King Dazar (Mythic)' },
  { zone: 'The Underrot',            expansion: 'BfA',            order: 82, type: 'dungeon',    note: 'Underrot Crawg — Unbound Abomination (Mythic)' },
  { zone: "Battle of Dazar'alor",    expansion: 'BfA',            order: 83, type: 'raid',       note: "G.M.O.D. — Mekkatorque · Glacial Tidestorm — Jaina Proudmoore (Mythic)" },
  { zone: "Ny'alotha",               expansion: 'BfA',            order: 84, type: 'raid',       note: "Ny'alotha Allseer — N'Zoth the Corruptor (Mythic)" },
  { zone: 'Mechagon',                expansion: 'BfA',            order: 85, type: 'world_boss', note: 'Junkheap Drifter — Rustfeather · Rusty Mechanocrawler — Arachnoid Harvester' },
  { zone: 'Nazjatar',                expansion: 'BfA',            order: 86, type: 'world_boss', note: 'Silent Glider — Soundless' },
  { zone: 'Arathi / Darkshore',      expansion: 'BfA',            order: 87, type: 'world_boss', note: 'Highland Mustang, Kaldorei Nightsaber and others from warfront rares' },
  // Shadowlands
  { zone: 'Sanctum of Domination',   expansion: 'Shadowlands',    order: 90, type: 'raid',       note: "Sanctum Gloomcharger — The Nine · Vengeance's Reins — Sylvanas (Mythic)" },
  { zone: 'Sepulcher of the First Ones', expansion: 'Shadowlands', order: 91, type: 'raid',      note: 'Zereth Overseer — The Jailer (Mythic)' },
  { zone: 'The Maw',                 expansion: 'Shadowlands',    order: 92, type: 'world_boss', note: 'Fallen Charger — Fallen Charger · Mawsworn Soulhunter — Gorged Shadehound' },
  { zone: 'Ardenweald',              expansion: 'Shadowlands',    order: 93, type: 'world_boss', note: "Arboreal Gulper — Humon'gozz · Wild Glimmerfur Prowler — Valfir the Unrelenting" },
  { zone: 'Revendreth',              expansion: 'Shadowlands',    order: 94, type: 'world_boss', note: 'Horrid Dredwing — Harika the Horrid · Hopecrusher Gargon — Hopecrusher' },
  // Dragonflight
  { zone: 'Vault of the Incarnates', expansion: 'Dragonflight',   order: 100, type: 'raid' },
  { zone: 'Aberrus, the Shadowed Crucible', expansion: 'Dragonflight', order: 101, type: 'raid' },
  { zone: "Amirdrassil, the Dream's Hope", expansion: 'Dragonflight', order: 102, type: 'raid',  note: "Anu'relos, Flame's Guidance — Fyrakk the Blazing (Mythic)" },
  { zone: 'Dragon Isles Rares',      expansion: 'Dragonflight',   order: 103, type: 'world_boss', note: 'Liberated Slyvern (Azure Span), Ancient Salamanther (Forbidden Reach) and more' },
  // The War Within
  { zone: 'Nerub-ar Palace',         expansion: 'The War Within', order: 110, type: 'raid',      note: 'Sureki Skyrazor / Ascendant Skyrazor — Queen Ansurek' },
  { zone: 'Liberation of Undermine', expansion: 'The War Within', order: 111, type: 'raid',      note: 'Prototype A.S.M.R. / The Big G — Chrome King Gallywix' },
  { zone: 'Khaz Algar Rares',        expansion: 'The War Within', order: 112, type: 'world_boss', note: "Alunira (Isle of Dorn), Ol' Mole Rufus (Ringing Deeps) and more" },
  // Non-location
  { zone: 'Reputation Vendors',      expansion: 'Various',        order: 200, type: 'reputation' },
  { zone: 'Achievements',            expansion: 'Various',        order: 201, type: 'achievement' },
  { zone: 'Vendors',                 expansion: 'Various',        order: 202, type: 'vendor' },
  { zone: 'Questlines',              expansion: 'Various',        order: 203, type: 'quest' },
];

const ZONE_ORDER     = new Map(ZONE_GEO.map(z => [z.zone, z.order]));
const ZONE_EXPANSION = new Map(ZONE_GEO.map(z => [z.zone, z.expansion]));
const ZONE_NOTE      = new Map(ZONE_GEO.map(z => [z.zone, z.note]));

// Expansion portal/travel hubs
const EXPANSION_HUBS: Record<string, string> = {
  'Classic':          'Stormwind / Orgrimmar',
  'TBC':              'Shattrath City',
  'WotLK':            'Dalaran (Northrend)',
  'Cataclysm':        'Stormwind / Orgrimmar',
  'MoP':              'Shrine of Seven Stars / Two Moons',
  'WoD':              'Ashran',
  'Legion':           'Dalaran (Broken Isles)',
  'BfA':              "Boralus / Dazar'alor",
  'Shadowlands':      'Oribos',
  'Dragonflight':     'Valdrakken',
  'The War Within':   'Dornogal',
};

const SOURCE_ZONES: Record<string, string> = {
  raid:        'Icecrown Citadel',
  dungeon:     'Sethekk Halls',
  world_boss:  'Sha of Anger',
  reputation:  'Reputation Vendors',
  achievement: 'Achievements',
  vendor:      'Vendors',
  quest:       'Questlines',
};

function getBestZone(sourceType: string) { return SOURCE_ZONES[sourceType] ?? 'Unknown'; }

// Parse boss + difficulty notes from ZONE_GEO note string
// Format: "Mount — Boss (Notes)" or multiple entries separated by " · "
function extractBossInfo(zoneName: string): { boss?: string; notes?: string } {
  const note = ZONE_NOTE.get(zoneName);
  if (!note) return {};
  const first = note.split('·')[0].trim();
  const dashIdx = first.indexOf(' — ');
  if (dashIdx === -1) return {};
  const afterDash = first.slice(dashIdx + 3).trim();
  const parenStart = afterDash.lastIndexOf(' (');
  if (parenStart === -1) return { boss: afterDash };
  return {
    boss: afterDash.slice(0, parenStart).trim(),
    notes: afterDash.slice(parenStart + 2, afterDash.lastIndexOf(')')) || undefined,
  };
}

// Build sequential steps for a set of tasks (with travel steps inserted)
function buildRouteSteps(tasksToShow: FarmTask[]): RouteStep[] {
  // Group by zone, sorted by geographic order
  const zoneMap = new Map<string, FarmTask[]>();
  for (const t of tasksToShow) {
    const z = t.zone_name || 'Unknown';
    if (!zoneMap.has(z)) zoneMap.set(z, []);
    zoneMap.get(z)!.push(t);
  }
  const sortedZones = Array.from(zoneMap.keys()).sort((a, b) =>
    (ZONE_ORDER.get(a) ?? 999) - (ZONE_ORDER.get(b) ?? 999)
  );

  const steps: RouteStep[] = [];
  let lastExpansion: string | null = null;
  let farmNum = 0;

  for (const zone of sortedZones) {
    const expansion = ZONE_EXPANSION.get(zone) ?? 'Various';
    const zoneTasks = zoneMap.get(zone)!.sort((a, b) => a.sort_order - b.sort_order);

    // Portal step at expansion boundary
    if (expansion !== 'Various' && expansion !== lastExpansion && EXPANSION_HUBS[expansion]) {
      steps.push({
        id: `portal-${expansion}`,
        kind: 'portal',
        label: `Portal to ${EXPANSION_HUBS[expansion]}`,
        subLabel: expansion,
      });
      lastExpansion = expansion;
    }

    // Fly / travel to zone step
    if (expansion !== 'Various') {
      const typeEntry = ZONE_GEO.find(g => g.zone === zone);
      const verb = typeEntry?.type === 'world_boss' ? 'Travel to' : 'Fly to';
      steps.push({
        id: `fly-${zone}`,
        kind: 'fly',
        label: `${verb} ${zone}`,
        subLabel: expansion,
      });
    }

    // Farm steps — one row per task
    const { boss, notes: bossNotes } = extractBossInfo(zone);
    for (const task of zoneTasks) {
      farmNum++;
      const defaultNotes = task.reset_type === 'weekly' ? 'Weekly' : task.reset_type === 'daily' ? 'Daily' : undefined;
      steps.push({
        id: `farm-${task.id}`,
        kind: 'farm',
        label: task.title,
        subLabel: zone,
        boss,
        notes: bossNotes ?? defaultNotes,
        taskId: task.id,
        completed: task.completed,
        stepNum: farmNum,
      });
    }
  }
  return steps;
}

const ALL_SOURCE_TYPES = ['raid', 'dungeon', 'world_boss', 'reputation', 'achievement', 'vendor', 'quest'];

export default function RoutesScreen() {
  const { collectedIds, selectedChar } = useApp();
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [mounts, setMounts] = useState<MountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Run planner modal
  const [runTitle, setRunTitle] = useState('');
  const [runZoneFilter, setRunZoneFilter] = useState<string | null>(null); // null=closed, specific zone, or 'ALL'

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
      .sort((a, b) => a.order - b.order);
  }, [tasks]);

  // Steps for the currently open run modal (derived from tasks so toggles auto-update)
  const activeSteps = useMemo((): RouteStep[] => {
    if (!runZoneFilter) return [];
    const filtered = runZoneFilter === 'ALL' ? tasks : tasks.filter(t => t.zone_name === runZoneFilter);
    return buildRouteSteps(filtered);
  }, [runZoneFilter, tasks]);

  const activeFarmSteps = activeSteps.filter(s => s.kind === 'farm');
  const activeDoneCount = activeFarmSteps.filter(s => s.completed).length;

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
      `This will remove all ${r.tasks.length} task${r.tasks.length !== 1 ? 's' : ''}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All', style: 'destructive',
          onPress: async () => {
            for (const t of r.tasks) { try { await api.deleteFarmTask(t.id); } catch {} }
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
    if (missing.length === 0) { Alert.alert('Nothing to Add', 'All selected mount types are already planned or collected.'); return; }

    const ranked = [...missing].sort((a, b) => {
      const zA = getBestZone(a.source_type || '');
      const zB = getBestZone(b.source_type || '');
      return (ZONE_ORDER.get(zA) ?? 999) - (ZONE_ORDER.get(zB) ?? 999);
    }).slice(0, maxTasks);

    setPlanning(true);
    let added = 0;
    for (const m of ranked) {
      const zone = getBestZone(m.source_type || '');
      const reset = m.source_type === 'raid' || m.source_type === 'world_boss' ? 'weekly' : m.source_type === 'dungeon' ? 'daily' : 'none';
      try { await api.createFarmTask({ title: m.name, mount_id: m.id, source_type: m.source_type, zone_name: zone, reset_type: reset }); added++; } catch {}
    }
    setPlanning(false);
    await load();
    Alert.alert('Plan Created', `Added ${added} mount${added !== 1 ? 's' : ''} to your farm routes!`);
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

  // Render a single step row in the run planner
  const renderStep = useCallback(({ item: step }: { item: RouteStep }) => {
    if (step.kind === 'portal') {
      return (
        <View style={z.portalRow}>
          <View style={z.portalIcon}><Ionicons name="planet-outline" size={16} color={colors.frost.primary} /></View>
          <View style={z.travelMid}>
            <Text style={z.portalLabel}>{step.label}</Text>
            {step.subLabel && <Text style={z.travelExp}>{step.subLabel}</Text>}
          </View>
        </View>
      );
    }
    if (step.kind === 'fly') {
      return (
        <View style={z.flyRow}>
          <View style={z.flyIcon}><Ionicons name="compass-outline" size={14} color={colors.text.tertiary} /></View>
          <Text style={z.flyLabel}>{step.label}</Text>
        </View>
      );
    }
    // Farm step
    const done = step.completed;
    return (
      <Pressable
        style={[z.farmRow, done && z.farmRowDone]}
        onPress={() => step.taskId && toggle(step.taskId)}
        onLongPress={() => {
          if (!step.taskId) return;
          Alert.alert('Remove', `Remove "${step.label}" from farm list?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => step.taskId && deleteTask(step.taskId) },
          ]);
        }}
      >
        <View style={[z.checkbox, done && z.checkboxDone]}>
          {done && <Ionicons name="checkmark" size={12} color={colors.bg.primary} />}
        </View>
        <Text style={z.stepNum}>{step.stepNum}</Text>
        <View style={z.farmMid}>
          <Text style={[z.farmName, done && z.farmNameDone]} numberOfLines={1}>{step.label}</Text>
          {step.boss && <Text style={z.bossName} numberOfLines={1}>{step.boss}</Text>}
        </View>
        {step.notes && (
          <View style={z.notesBadge}><Text style={z.notesBadgeT} numberOfLines={1}>{step.notes}</Text></View>
        )}
      </Pressable>
    );
  }, [tasks]); // tasks in dep so re-renders on toggle

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={z.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />}
      >
        <Text style={z.title}>Farm Planner</Text>
        <Text style={z.sub}>{selectedChar ? `Planning for ${selectedChar.display.split('-')[0]}` : 'Auto-plan routes or manage your farm runs'}</Text>

        <View style={z.btnRow}>
          <Pressable onPress={() => setPlanModalVisible(true)} style={({ pressed }) => [z.planBtn, pressed && { opacity: 0.85 }]} disabled={planning}>
            <Ionicons name="sparkles" size={18} color={colors.bg.primary} />
            <Text style={z.planBtnT}>{planning ? 'Planning...' : 'Auto-Plan'}</Text>
          </Pressable>
          {tasks.length > 0 && (
            <Pressable
              onPress={() => { setRunTitle('Full Route'); setRunZoneFilter('ALL'); }}
              style={({ pressed }) => [z.runAllBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="map" size={18} color={colors.gold.primary} />
              <Text style={z.runAllBtnT}>Run All</Text>
            </Pressable>
          )}
        </View>

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
              const note = ZONE_NOTE.get(r.zone);
              return (
                <View key={r.zone}>
                  <Card variant={done ? 'success' : 'default'} onPress={() => { setRunTitle(r.zone); setRunZoneFilter(r.zone); }}>
                    <View style={z.rc}>
                      <Ionicons name={done ? 'checkmark-circle' : 'navigate-circle-outline'} size={28} color={done ? colors.fel.primary : colors.gold.primary} />
                      <View style={z.rInfo}>
                        <Text style={z.rZone}>{r.zone}</Text>
                        {r.expansion && <Text style={z.rExp}>{r.expansion}</Text>}
                        {note && <Text style={z.rNote} numberOfLines={1}>{note}</Text>}
                        <Text style={z.rMeta}>{r.tasks.length} mount{r.tasks.length !== 1 ? 's' : ''} — {r.completed} done</Text>
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

      {/* ── Auto-plan filter modal ── */}
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
              {selectedChar ? `Missing mounts for ${selectedChar.display.split('-')[0]}` : 'Select what to farm'}
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
            <Pressable onPress={executePlan} style={[z.goBtn, (planPreviewCount === 0 || selectedTypes.size === 0) && {opacity:0.4}]} disabled={planPreviewCount === 0 || selectedTypes.size === 0}>
              <Ionicons name="sparkles" size={18} color={colors.bg.primary}/>
              <Text style={z.goBtnT}>Generate Route</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Step-by-step run planner (SimpleArmory style) ── */}
      <Modal visible={runZoneFilter !== null} animationType="slide" onRequestClose={() => setRunZoneFilter(null)}>
        <SafeAreaView style={z.runSafe} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={z.runHeader}>
            <View style={z.runHeaderLeft}>
              <Text style={z.runTitle} numberOfLines={1}>{runTitle}</Text>
              <Text style={z.runProg}>{activeDoneCount} / {activeFarmSteps.length} done</Text>
            </View>
            <Pressable onPress={() => setRunZoneFilter(null)} style={z.runClose}>
              <Ionicons name="close" size={22} color={colors.text.primary}/>
            </Pressable>
          </View>

          {/* Progress bar */}
          {activeFarmSteps.length > 0 && (
            <View style={z.runProgBar}>
              <View style={[z.runProgFill, { width: `${Math.round(activeDoneCount / activeFarmSteps.length * 100)}%` }]} />
            </View>
          )}

          {/* Column headers */}
          <View style={z.tableHeader}>
            <View style={z.thCheck}/>
            <View style={z.thNum}><Text style={z.thT}>#</Text></View>
            <Text style={[z.thT, {flex:1}]}>MOUNT / STEP</Text>
            <Text style={[z.thT, {width:90}]}>BOSS</Text>
            <Text style={[z.thT, {width:72}]}>NOTES</Text>
          </View>

          {/* Steps list */}
          <FlatList
            data={activeSteps}
            keyExtractor={s => s.id}
            renderItem={renderStep}
            contentContainerStyle={z.stepList}
            ItemSeparatorComponent={() => <View style={z.sep}/>}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.bg.primary},
  content:{paddingHorizontal:spacing.lg,paddingTop:spacing.md,paddingBottom:100,gap:spacing.md},
  title:{...typography.display,color:colors.frost.primary},
  sub:{...typography.caption,color:colors.text.secondary},
  btnRow:{flexDirection:'row',gap:spacing.sm},
  planBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm,backgroundColor:colors.gold.primary,borderRadius:radii.md,paddingVertical:13,...shadows.card},
  planBtnT:{fontSize:14,fontWeight:'700',color:colors.bg.primary},
  runAllBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm,paddingHorizontal:spacing.xl,paddingVertical:13,borderRadius:radii.md,borderWidth:1,borderColor:colors.gold.dim,backgroundColor:colors.gold.muted},
  runAllBtnT:{fontSize:14,fontWeight:'700',color:colors.gold.primary},
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
  rNote:{fontSize:10,color:colors.text.tertiary,fontStyle:'italic'},
  rMeta:{fontSize:11,color:colors.text.secondary},
  pBar:{height:3,backgroundColor:colors.bg.primary,borderRadius:2,marginTop:3,overflow:'hidden'},
  pFill:{height:3,borderRadius:2},
  rPct:{...typography.subheading,color:colors.gold.primary,marginRight:spacing.xs},
  trashBtn:{padding:spacing.xs},
  empty:{alignItems:'center',paddingVertical:60,gap:spacing.md},
  emptyT:{...typography.heading,color:colors.text.secondary},
  emptyS:{...typography.caption,color:colors.text.tertiary,textAlign:'center',paddingHorizontal:spacing.xl},
  // Auto-plan modal
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
  // Run planner (full screen)
  runSafe:{flex:1,backgroundColor:colors.bg.primary},
  runHeader:{flexDirection:'row',alignItems:'center',paddingHorizontal:spacing.lg,paddingVertical:spacing.md,borderBottomWidth:1,borderBottomColor:colors.border.subtle},
  runHeaderLeft:{flex:1,gap:2},
  runTitle:{...typography.heading,color:colors.gold.primary,fontSize:16},
  runProg:{...typography.caption,color:colors.text.tertiary},
  runClose:{width:36,height:36,borderRadius:18,backgroundColor:colors.bg.secondary,alignItems:'center',justifyContent:'center'},
  runProgBar:{height:3,backgroundColor:colors.bg.secondary,marginHorizontal:0},
  runProgFill:{height:3,backgroundColor:colors.gold.primary,borderRadius:0},
  tableHeader:{flexDirection:'row',alignItems:'center',paddingHorizontal:spacing.lg,paddingVertical:spacing.sm,backgroundColor:colors.bg.secondary,borderBottomWidth:1,borderBottomColor:colors.border.subtle},
  thCheck:{width:32},
  thNum:{width:28},
  thT:{...typography.label,fontSize:9,color:colors.text.tertiary},
  stepList:{paddingBottom:40},
  sep:{height:1,backgroundColor:colors.border.subtle,marginLeft:spacing.lg},
  // Step rows
  portalRow:{flexDirection:'row',alignItems:'center',gap:spacing.md,paddingHorizontal:spacing.lg,paddingVertical:spacing.md,backgroundColor:colors.frost.primary+'12'},
  portalIcon:{width:28,height:28,borderRadius:14,backgroundColor:colors.frost.primary+'25',alignItems:'center',justifyContent:'center'},
  travelMid:{flex:1,gap:1},
  portalLabel:{fontSize:13,fontWeight:'700',color:colors.frost.primary},
  travelExp:{fontSize:10,color:colors.frost.dim},
  flyRow:{flexDirection:'row',alignItems:'center',gap:spacing.md,paddingHorizontal:spacing.lg,paddingVertical:10,backgroundColor:colors.bg.secondary+'80'},
  flyIcon:{width:28,alignItems:'center'},
  flyLabel:{fontSize:12,color:colors.text.tertiary,fontStyle:'italic'},
  farmRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:spacing.lg,paddingVertical:spacing.md,backgroundColor:colors.bg.primary},
  farmRowDone:{backgroundColor:colors.fel.primary+'08'},
  checkbox:{width:24,height:24,borderRadius:12,borderWidth:1.5,borderColor:colors.border.default,alignItems:'center',justifyContent:'center'},
  checkboxDone:{backgroundColor:colors.fel.primary,borderColor:colors.fel.primary},
  stepNum:{width:24,fontSize:11,fontWeight:'700',color:colors.text.tertiary,textAlign:'center'},
  farmMid:{flex:1,gap:1,marginHorizontal:spacing.xs},
  farmName:{fontSize:13,fontWeight:'600',color:colors.text.primary},
  farmNameDone:{color:colors.text.tertiary,textDecorationLine:'line-through'},
  bossName:{fontSize:10,color:colors.text.tertiary},
  notesBadge:{paddingHorizontal:spacing.sm,paddingVertical:2,borderRadius:radii.sm,backgroundColor:colors.bg.secondary,borderWidth:1,borderColor:colors.border.subtle,maxWidth:80},
  notesBadgeT:{fontSize:9,fontWeight:'700',color:colors.text.tertiary,textAlign:'center'},
});
