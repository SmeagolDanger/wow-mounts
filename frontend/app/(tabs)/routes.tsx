import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl,
  Modal, Alert, SectionList, Animated, Easing, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { Card } from '../../components';
import api, { FarmTask, MountSummary, ResetInfo } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

// ── WoW geographic routing data ─────────────────────────────────────────────
const ZONE_GEO: { zone: string; expansion: string; order: number; type: string; note?: string }[] = [
  // Classic
  { zone: 'Stratholme',              expansion: 'Classic',        order:  5, type: 'dungeon',    note: "Rivendare's Deathcharger — Baron Rivendare" },
  { zone: "Onyxia's Lair",           expansion: 'Classic',        order:  6, type: 'raid',       note: 'Onyxian Drake — Onyxia' },
  { zone: 'Molten Core',             expansion: 'Classic',        order:  7, type: 'raid' },
  { zone: 'Blackwing Lair',          expansion: 'Classic',        order:  8, type: 'raid' },
  { zone: "Ruins of Ahn'Qiraj",      expansion: 'Classic',        order:  9, type: 'raid' },
  { zone: "Temple of Ahn'Qiraj",     expansion: 'Classic',        order: 10, type: 'raid',       note: 'Qiraji Battle Tanks — Trash & Bosses' },
  // TBC
  { zone: 'Sethekk Halls',           expansion: 'TBC',            order: 20, type: 'dungeon',    note: 'Raven Lord — Anzu (Heroic)' },
  { zone: "Magisters' Terrace",      expansion: 'TBC',            order: 21, type: 'dungeon',    note: "Swift White Hawkstrider — Kael'thas (Heroic)" },
  { zone: 'Karazhan',                expansion: 'TBC',            order: 22, type: 'raid',       note: 'Fiery Warhorse — Attumen the Huntsman' },
  { zone: 'Serpentshrine Cavern',    expansion: 'TBC',            order: 23, type: 'raid' },
  { zone: 'Tempest Keep',            expansion: 'TBC',            order: 24, type: 'raid',       note: "Ashes of Al'ar — Kael'thas Sunstrider" },
  { zone: 'Battle for Mount Hyjal',  expansion: 'TBC',            order: 25, type: 'raid' },
  { zone: 'Black Temple',            expansion: 'TBC',            order: 26, type: 'raid' },
  { zone: 'Sunwell Plateau',         expansion: 'TBC',            order: 27, type: 'raid' },
  // WotLK
  { zone: 'Culling of Stratholme',   expansion: 'WotLK',          order: 30, type: 'dungeon',    note: 'Bronze Drake — Infinite Corruptor (Heroic)' },
  { zone: 'Utgarde Pinnacle',        expansion: 'WotLK',          order: 31, type: 'dungeon',    note: 'Blue Proto-Drake — Skadi the Ruthless (Heroic)' },
  { zone: 'The Oculus',              expansion: 'WotLK',          order: 32, type: 'dungeon',    note: 'Blue Drake / Azure Drake — Ley-Guardian (Heroic)' },
  { zone: 'Vault of Archavon',       expansion: 'WotLK',          order: 33, type: 'raid',       note: 'Grand Black War Mammoth — any boss' },
  { zone: 'The Obsidian Sanctum',    expansion: 'WotLK',          order: 34, type: 'raid',       note: 'Black Drake / Twilight Drake — Sartharion' },
  { zone: 'The Eye of Eternity',     expansion: 'WotLK',          order: 35, type: 'raid',       note: 'Azure Drake / Blue Drake — Malygos' },
  { zone: 'Naxxramas',               expansion: 'WotLK',          order: 36, type: 'raid' },
  { zone: 'Ulduar',                  expansion: 'WotLK',          order: 37, type: 'raid',       note: "Mimiron's Head — Yogg-Saron (0 keepers)" },
  { zone: 'Trial of the Crusader',   expansion: 'WotLK',          order: 38, type: 'raid',       note: 'Grand Crusader (Heroic 25)' },
  { zone: 'Icecrown Citadel',        expansion: 'WotLK',          order: 39, type: 'raid',       note: 'Invincible — The Lich King (Heroic 25)' },
  // Cataclysm
  { zone: 'Vortex Pinnacle',         expansion: 'Cataclysm',      order: 40, type: 'dungeon',    note: 'Drake of the North Wind — Altairus' },
  { zone: 'The Stonecore',           expansion: 'Cataclysm',      order: 41, type: 'dungeon',    note: 'Vitreous Stone Drake — Slabhide' },
  { zone: "Zul'Gurub",               expansion: 'Cataclysm',      order: 42, type: 'raid',       note: 'Armored Razzashi Raptor · Swift Zulian Panther' },
  { zone: "Zul'Aman",                expansion: 'Cataclysm',      order: 43, type: 'raid',       note: 'Amani Battle Bear — timed run (Heroic)' },
  { zone: 'Blackwing Descent',       expansion: 'Cataclysm',      order: 44, type: 'raid' },
  { zone: 'Throne of the Four Winds',expansion: 'Cataclysm',      order: 45, type: 'raid',       note: "Drake of the South Wind — Al'Akir" },
  { zone: 'Firelands',               expansion: 'Cataclysm',      order: 46, type: 'raid',       note: 'Pureblood Fire Hawk — Ragnaros · Flametalon — Alysrazor' },
  { zone: 'Dragon Soul',             expansion: 'Cataclysm',      order: 47, type: 'raid',       note: "Blazing Drake / Life-Binder's Handmaiden — Deathwing" },
  // MoP
  { zone: "Mogu'shan Vaults",        expansion: 'MoP',            order: 50, type: 'raid',       note: 'Astral Cloud Serpent — Elegon' },
  { zone: 'Throne of Thunder',       expansion: 'MoP',            order: 51, type: 'raid',       note: 'Clutch of Ji-Kun · Spawn of Horridon' },
  { zone: 'Siege of Orgrimmar',      expansion: 'MoP',            order: 52, type: 'raid',       note: "Kor'kron Juggernaut — Garrosh (Mythic)" },
  { zone: 'Sha of Anger',            expansion: 'MoP',            order: 53, type: 'world_boss', note: 'Heavenly Onyx Cloud Serpent' },
  { zone: 'Nalak',                   expansion: 'MoP',            order: 54, type: 'world_boss', note: 'Thundering Cobalt Cloud Serpent' },
  { zone: 'Oondasta',                expansion: 'MoP',            order: 55, type: 'world_boss', note: 'Cobalt Primordial Direhorn' },
  { zone: 'Galleon',                 expansion: 'MoP',            order: 56, type: 'world_boss', note: "Son of Galleon" },
  { zone: 'Huolon',                  expansion: 'MoP',            order: 57, type: 'world_boss', note: 'Thundering Onyx Cloud Serpent' },
  // WoD
  { zone: 'Highmaul',                expansion: 'WoD',            order: 60, type: 'raid' },
  { zone: 'Blackrock Foundry',       expansion: 'WoD',            order: 61, type: 'raid',       note: 'Ironhoof Destroyer — Blackhand (Mythic)' },
  { zone: 'Hellfire Citadel',        expansion: 'WoD',            order: 62, type: 'raid',       note: 'Felsteel Annihilator — Archimonde (Mythic)' },
  { zone: 'Tanaan Jungle',           expansion: 'WoD',            order: 63, type: 'world_boss', note: 'Terrorfiend · Swift Breezestrider · Tundra Icehoof' },
  { zone: 'Draenor Rares',           expansion: 'WoD',            order: 64, type: 'world_boss', note: 'Rukhmar · Sunhide Gronnling · Nakk the Thunderer' },
  // Legion
  { zone: 'Return to Karazhan',      expansion: 'Legion',         order: 70, type: 'dungeon',    note: 'Ember Wyrm — Nightbane · Midnight — Attumen' },
  { zone: 'The Emerald Nightmare',   expansion: 'Legion',         order: 71, type: 'raid' },
  { zone: 'The Nighthold',           expansion: 'Legion',         order: 72, type: 'raid',       note: "Felblaze Infernal — Gul'dan" },
  { zone: 'Tomb of Sargeras',        expansion: 'Legion',         order: 73, type: 'raid',       note: "Abyss Worm — Mistress Sassz'ine" },
  { zone: 'Antorus',                 expansion: 'Legion',         order: 74, type: 'raid',       note: "Antoran Charhound · Shackled Ur'zul (Mythic)" },
  { zone: 'Argus Rares',             expansion: 'Legion',         order: 75, type: 'world_boss', note: 'World boss mounts on Argus' },
  // BfA
  { zone: 'Freehold',                expansion: 'BfA',            order: 80, type: 'dungeon',    note: 'Sharkbait — Harlan Sweete (Mythic)' },
  { zone: "Kings' Rest",             expansion: 'BfA',            order: 81, type: 'dungeon',    note: 'Tomb Stalker — King Dazar (Mythic)' },
  { zone: 'The Underrot',            expansion: 'BfA',            order: 82, type: 'dungeon',    note: 'Underrot Crawg (Mythic)' },
  { zone: "Battle of Dazar'alor",    expansion: 'BfA',            order: 83, type: 'raid',       note: 'G.M.O.D. · Glacial Tidestorm (Mythic)' },
  { zone: "Ny'alotha",               expansion: 'BfA',            order: 84, type: 'raid',       note: "Ny'alotha Allseer — N'Zoth (Mythic)" },
  { zone: 'Mechagon',                expansion: 'BfA',            order: 85, type: 'world_boss', note: 'Junkheap Drifter · Rusty Mechanocrawler' },
  { zone: 'Nazjatar',                expansion: 'BfA',            order: 86, type: 'world_boss', note: 'Silent Glider — Soundless' },
  { zone: 'Warfronts',               expansion: 'BfA',            order: 87, type: 'world_boss', note: 'Highland Mustang · Kaldorei Nightsaber' },
  // Shadowlands
  { zone: 'Sanctum of Domination',   expansion: 'Shadowlands',    order: 90, type: 'raid',       note: "Gloomcharger · Vengeance's Reins (Mythic)" },
  { zone: 'Sepulcher of the First Ones', expansion: 'Shadowlands', order: 91, type: 'raid',      note: 'Zereth Overseer — The Jailer (Mythic)' },
  { zone: 'The Maw',                 expansion: 'Shadowlands',    order: 92, type: 'world_boss', note: 'Fallen Charger · Mawsworn Soulhunter' },
  { zone: 'Ardenweald',              expansion: 'Shadowlands',    order: 93, type: 'world_boss', note: 'Arboreal Gulper · Wild Glimmerfur Prowler' },
  { zone: 'Revendreth',              expansion: 'Shadowlands',    order: 94, type: 'world_boss', note: 'Horrid Dredwing · Hopecrusher Gargon' },
  // Dragonflight
  { zone: 'Vault of the Incarnates', expansion: 'Dragonflight',   order: 100, type: 'raid' },
  { zone: 'Aberrus',                 expansion: 'Dragonflight',   order: 101, type: 'raid' },
  { zone: "Amirdrassil",             expansion: 'Dragonflight',   order: 102, type: 'raid',  note: "Anu'relos — Fyrakk (Mythic)" },
  { zone: 'Dragon Isles Rares',      expansion: 'Dragonflight',   order: 103, type: 'world_boss', note: 'Liberated Slyvern · Ancient Salamanther' },
  // The War Within
  { zone: 'Nerub-ar Palace',         expansion: 'The War Within', order: 110, type: 'raid',      note: 'Sureki Skyrazor — Queen Ansurek' },
  { zone: 'Liberation of Undermine', expansion: 'The War Within', order: 111, type: 'raid',      note: 'The Big G — Chrome King Gallywix' },
  { zone: 'Khaz Algar Rares',        expansion: 'The War Within', order: 112, type: 'world_boss', note: "Alunira · Ol' Mole Rufus" },
  // Non-location
  { zone: 'Reputation Vendors',      expansion: 'Various',        order: 200, type: 'reputation' },
  { zone: 'Achievements',            expansion: 'Various',        order: 201, type: 'achievement' },
  { zone: 'Vendors',                 expansion: 'Various',        order: 202, type: 'vendor' },
  { zone: 'Questlines',              expansion: 'Various',        order: 203, type: 'quest' },
];

const ZONE_ORDER     = new Map(ZONE_GEO.map(z => [z.zone, z.order]));
const ZONE_EXPANSION = new Map(ZONE_GEO.map(z => [z.zone, z.expansion]));
const ZONE_NOTE      = new Map(ZONE_GEO.map(z => [z.zone, z.note]));

const SOURCE_ZONES: Record<string, string> = {
  raid: 'Icecrown Citadel', dungeon: 'Sethekk Halls', world_boss: 'Sha of Anger',
  reputation: 'Reputation Vendors', achievement: 'Achievements', vendor: 'Vendors', quest: 'Questlines',
};
function getBestZone(sourceType: string) { return SOURCE_ZONES[sourceType] ?? 'Unknown'; }

const EXP_COLORS: Record<string, string> = {
  Classic: '#D4A017', TBC: '#3CB371', WotLK: '#70B8FF', Cataclysm: '#FF6347',
  MoP: '#22C55E', WoD: '#B8860B', Legion: '#4ADE80', BfA: '#F59E0B',
  Shadowlands: '#9B6FFF', Dragonflight: '#22D3EE', 'The War Within': '#C084FC', Various: '#94A3B8',
};

const TYPE_META: Record<string, { icon: string; color: string }> = {
  raid: { icon: 'skull-outline', color: '#C084FC' }, dungeon: { icon: 'key-outline', color: '#38BDF8' },
  world_boss: { icon: 'flame-outline', color: '#FB923C' }, reputation: { icon: 'people-outline', color: '#4ADE80' },
  achievement: { icon: 'trophy-outline', color: '#F5B800' }, vendor: { icon: 'cart-outline', color: '#E2E8F0' },
  quest: { icon: 'flag-outline', color: '#FDE047' },
};

const ALL_SOURCE_TYPES = ['raid', 'dungeon', 'world_boss', 'reputation', 'achievement', 'vendor', 'quest'];

// ── Reset timer helpers ─────────────────────────────────────────────────────
function getNextDailyReset(): Date {
  const now = new Date();
  const r = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15, 0, 0));
  if (now >= r) r.setUTCDate(r.getUTCDate() + 1);
  return r;
}
function getNextWeeklyReset(): Date {
  const now = new Date();
  const r = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15, 0, 0));
  const d = r.getUTCDay();
  let add = (2 - d + 7) % 7;
  if (add === 0 && now >= r) add = 7;
  r.setUTCDate(r.getUTCDate() + add);
  return r;
}
function fmtCountdown(target: Date): string {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return 'Now';
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

// ── Grouped section data ────────────────────────────────────────────────────
interface TaskRow {
  task: FarmTask;
  zone: string;
  zoneNote?: string;
  zoneType?: string;
}
interface Section {
  title: string;       // expansion name
  color: string;
  data: TaskRow[];
  completed: number;
  total: number;
}

function buildSections(tasks: FarmTask[], hideCompleted: boolean): Section[] {
  // Group tasks by zone, then group zones by expansion
  const zoneMap = new Map<string, FarmTask[]>();
  for (const t of tasks) {
    if (hideCompleted && t.completed) continue;
    const z = t.zone_name || 'Unassigned';
    if (!zoneMap.has(z)) zoneMap.set(z, []);
    zoneMap.get(z)!.push(t);
  }
  // Also need total counts including hidden completed
  const allZoneMap = new Map<string, FarmTask[]>();
  for (const t of tasks) {
    const z = t.zone_name || 'Unassigned';
    if (!allZoneMap.has(z)) allZoneMap.set(z, []);
    allZoneMap.get(z)!.push(t);
  }

  // Sort zones by geo order
  const sortedZones = Array.from(zoneMap.keys()).sort((a, b) =>
    (ZONE_ORDER.get(a) ?? 999) - (ZONE_ORDER.get(b) ?? 999)
  );

  // Group by expansion
  const expMap = new Map<string, TaskRow[]>();
  for (const zone of sortedZones) {
    const exp = ZONE_EXPANSION.get(zone) ?? 'Various';
    if (!expMap.has(exp)) expMap.set(exp, []);
    const zoneTasks = zoneMap.get(zone)!.sort((a, b) => a.sort_order - b.sort_order);
    const geo = ZONE_GEO.find(g => g.zone === zone);
    for (const task of zoneTasks) {
      expMap.get(exp)!.push({ task, zone, zoneNote: ZONE_NOTE.get(zone), zoneType: geo?.type });
    }
  }

  // Count totals per expansion (including hidden)
  const expTotals = new Map<string, { total: number; completed: number }>();
  for (const [zone, zt] of allZoneMap.entries()) {
    const exp = ZONE_EXPANSION.get(zone) ?? 'Various';
    if (!expTotals.has(exp)) expTotals.set(exp, { total: 0, completed: 0 });
    const c = expTotals.get(exp)!;
    c.total += zt.length;
    c.completed += zt.filter(t => t.completed).length;
  }

  const sections: Section[] = [];
  const expOrder: string[] = ['Classic', 'TBC', 'WotLK', 'Cataclysm', 'MoP', 'WoD', 'Legion', 'BfA', 'Shadowlands', 'Dragonflight', 'The War Within', 'Various'];
  for (const exp of expOrder) {
    const rows = expMap.get(exp);
    if (!rows || rows.length === 0) continue;
    const counts = expTotals.get(exp) || { total: rows.length, completed: 0 };
    sections.push({
      title: exp,
      color: EXP_COLORS[exp] || '#94A3B8',
      data: rows,
      completed: counts.completed,
      total: counts.total,
    });
  }
  return sections;
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function PlannerScreen() {
  const { collectedIds, selectedChar } = useApp();
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [mounts, setMounts] = useState<MountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetInfo, setResetInfo] = useState<ResetInfo | null>(null);

  // UI state
  const [hideCompleted, setHideCompleted] = useState(false);
  const [collapsedExps, setCollapsedExps] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  // Auto-plan modal
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(ALL_SOURCE_TYPES));
  const [maxTasks, setMaxTasks] = useState(30);
  const [planning, setPlanning] = useState(false);

  // Add task modal
  const [showAdd, setShowAdd] = useState(false);
  const [nTitle, setNTitle] = useState('');
  const [nSrc, setNSrc] = useState('');
  const [nZone, setNZone] = useState('');
  const [nReset, setNReset] = useState<'daily' | 'weekly' | 'none'>('weekly');

  // Countdown ticker (every 60s)
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(i);
  }, []);

  const load = useCallback(async () => {
    try {
      const [t, m] = await Promise.all([api.getFarmTasks(), api.getMounts()]);
      setTasks(t.tasks);
      setMounts(m.mounts);
      setResetInfo(t.reset_info);
    } catch {} finally { setLoading(false); }
  }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Sections ──
  const sections = useMemo(() => buildSections(tasks, hideCompleted), [tasks, hideCompleted]);

  // ── Counts ──
  const totalT = tasks.length;
  const totalD = tasks.filter(t => t.completed).length;
  const dailyT = tasks.filter(t => t.reset_type === 'daily');
  const weeklyT = tasks.filter(t => t.reset_type === 'weekly');
  const dailyDone = dailyT.filter(t => t.completed).length;
  const weeklyDone = weeklyT.filter(t => t.completed).length;
  const pct = totalT > 0 ? Math.round(totalD / totalT * 100) : 0;
  const allDone = totalT > 0 && totalD === totalT;

  // ── Actions ──
  const toggle = async (id: number) => {
    try {
      const r = await api.toggleFarmTask(id);
      setTasks(p => p.map(t => t.id === id ? { ...t, completed: r.completed, completed_at: r.completed ? new Date().toISOString() : undefined } : t));
    } catch {}
  };
  const deleteTask = async (id: number) => {
    try { await api.deleteFarmTask(id); setTasks(p => p.filter(t => t.id !== id)); } catch {}
  };

  const handleReset = (filter: 'all' | 'daily' | 'weekly' | 'dungeons' | 'raids', label: string) => {
    const ct = tasks.filter(t => {
      if (!t.completed) return false;
      if (filter === 'all') return true;
      if (filter === 'daily') return t.reset_type === 'daily';
      if (filter === 'weekly') return t.reset_type === 'weekly';
      if (filter === 'dungeons') return t.source_type === 'dungeon';
      if (filter === 'raids') return t.source_type === 'raid';
      return false;
    }).length;
    if (ct === 0) { Alert.alert('Nothing to Reset', `No completed ${label.toLowerCase()} to reset.`); return; }
    Alert.alert(`Reset ${label}?`, `Uncheck ${ct} task${ct !== 1 ? 's' : ''}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => { try { await api.resetFarmTasks(filter); await load(); } catch {} } },
    ]);
  };

  const addTask = async () => {
    if (!nTitle.trim()) return;
    try {
      await api.createFarmTask({ title: nTitle.trim(), source_type: nSrc.trim() || undefined, zone_name: nZone.trim() || undefined, reset_type: nReset });
      setNTitle(''); setNSrc(''); setNZone(''); setNReset('weekly'); setShowAdd(false);
      await load();
    } catch {}
  };

  const toggleCollapse = (exp: string) => {
    setCollapsedExps(prev => {
      const next = new Set(prev);
      if (next.has(exp)) next.delete(exp); else next.add(exp);
      return next;
    });
  };

  // ── Auto-plan ──
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
    if (missing.length === 0) { Alert.alert('Nothing to Add', 'All selected types already planned or collected.'); return; }
    const ranked = [...missing].sort((a, b) => {
      const zA = getBestZone(a.source_type || ''), zB = getBestZone(b.source_type || '');
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

  const daily = fmtCountdown(getNextDailyReset());
  const weekly = fmtCountdown(getNextWeeklyReset());

  // ── Track which zone the previous row was in (for zone subheaders) ──
  let lastZone = '';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <SectionList
        sections={sections.filter(sec => !collapsedExps.has(sec.title)).map(sec => sec)}
        // We manually render collapsed sections via stickySectionHeadersEnabled + renderSectionHeader
        keyExtractor={(item, idx) => `${item.task.id}-${idx}`}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />}

        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.title}>Farm Planner</Text>
            <Text style={s.sub}>
              {selectedChar ? `Planning for ${selectedChar.display.split('-')[0]}` : 'Build your weekly mount farm route'}
            </Text>

            {/* Reset timers */}
            <View style={s.timerRow}>
              <View style={s.timerCard}>
                <Ionicons name="sunny-outline" size={14} color="#38BDF8" />
                <Text style={s.timerLabel}>Daily</Text>
                <Text style={s.timerVal}>{daily}</Text>
              </View>
              <View style={s.timerCard}>
                <Ionicons name="calendar-outline" size={14} color="#C084FC" />
                <Text style={s.timerLabel}>Weekly</Text>
                <Text style={s.timerVal}>{weekly}</Text>
              </View>
            </View>

            {/* Progress card */}
            <Card variant={allDone ? 'success' : 'gold'} style={s.progCard}>
              <View style={s.progRow}>
                <View style={s.progStat}>
                  <Text style={s.progNum}>{dailyDone}/{dailyT.length}</Text>
                  <Text style={s.progLabel}>DAILY</Text>
                </View>
                <View style={s.progDiv} />
                <View style={s.progStat}>
                  <Text style={s.progNum}>{weeklyDone}/{weeklyT.length}</Text>
                  <Text style={s.progLabel}>WEEKLY</Text>
                </View>
                <View style={s.progDiv} />
                <View style={s.progStat}>
                  <Text style={[s.progNum, allDone && { color: colors.fel.primary }]}>{pct}%</Text>
                  <Text style={s.progLabel}>TOTAL</Text>
                </View>
              </View>
              {totalT > 0 && (
                <View style={s.progBarOuter}>
                  <View style={[s.progBarFill, { width: `${pct}%`, backgroundColor: allDone ? colors.fel.primary : colors.gold.primary }]} />
                </View>
              )}
              {allDone && totalT > 0 && (
                <View style={s.celebRow}>
                  <Ionicons name="trophy" size={16} color="#F5B800" />
                  <Text style={s.celebText}>All done! Next reset: Daily {daily} · Weekly {weekly}</Text>
                </View>
              )}
            </Card>

            {/* Action buttons */}
            <View style={s.btnRow}>
              <Pressable onPress={() => setPlanModalVisible(true)} style={({ pressed }) => [s.btn, s.btnGold, pressed && s.btnPressed]} disabled={planning}>
                <Ionicons name="sparkles" size={16} color={colors.bg.primary} />
                <Text style={s.btnGoldT}>{planning ? 'Planning...' : 'Auto-Plan'}</Text>
              </Pressable>
              <Pressable onPress={() => setShowAdd(true)} style={({ pressed }) => [s.btn, s.btnOutline, pressed && s.btnPressed]}>
                <Ionicons name="add" size={16} color={colors.gold.primary} />
                <Text style={s.btnOutlineT}>Add Task</Text>
              </Pressable>
            </View>

            {/* Filter / reset chips */}
            {totalT > 0 && (
              <View style={s.chipRow}>
                <Pressable onPress={() => setHideCompleted(h => !h)} style={[s.chip, hideCompleted && s.chipActive]}>
                  <Ionicons name={hideCompleted ? 'eye-off-outline' : 'eye-outline'} size={13} color={hideCompleted ? colors.gold.primary : colors.text.tertiary} />
                  <Text style={[s.chipT, hideCompleted && s.chipTActive]}>{hideCompleted ? 'Show Done' : 'Hide Done'}</Text>
                </Pressable>
                <Pressable onPress={() => handleReset('dungeons', 'Dungeons')} style={s.chip}>
                  <Ionicons name="key-outline" size={13} color="#38BDF8" />
                  <Text style={s.chipT}>Reset D</Text>
                </Pressable>
                <Pressable onPress={() => handleReset('raids', 'Raids')} style={s.chip}>
                  <Ionicons name="skull-outline" size={13} color="#C084FC" />
                  <Text style={s.chipT}>Reset R</Text>
                </Pressable>
                <Pressable onPress={() => handleReset('all', 'All Tasks')} style={s.chip}>
                  <Ionicons name="refresh-outline" size={13} color={colors.fire.dim} />
                  <Text style={s.chipT}>Reset All</Text>
                </Pressable>
              </View>
            )}

            {/* Collapsed expansion headers (shown as collapsed bars) */}
            {sections.filter(sec => collapsedExps.has(sec.title)).map(sec => (
              <Pressable key={sec.title} onPress={() => toggleCollapse(sec.title)} style={s.collapsedBar}>
                <View style={[s.expDot, { backgroundColor: sec.color }]} />
                <Text style={[s.collapsedTitle, { color: sec.color }]}>{sec.title}</Text>
                <Text style={s.collapsedCount}>{sec.completed}/{sec.total}</Text>
                {sec.completed === sec.total && sec.total > 0 && <Ionicons name="checkmark-circle" size={14} color={colors.fel.primary} />}
                <Ionicons name="chevron-down" size={14} color={colors.text.tertiary} />
              </Pressable>
            ))}
          </View>
        }

        renderSectionHeader={({ section }) => {
          lastZone = '';
          const sec = section as unknown as Section;
          return (
            <Pressable onPress={() => toggleCollapse(sec.title)} style={s.sectionHeader}>
              <View style={[s.expDot, { backgroundColor: sec.color }]} />
              <Text style={[s.sectionTitle, { color: sec.color }]}>{sec.title}</Text>
              <Text style={s.sectionCount}>{sec.completed}/{sec.total}</Text>
              {sec.completed === sec.total && sec.total > 0 && <Ionicons name="checkmark-circle" size={14} color={colors.fel.primary} />}
              <Ionicons name="chevron-up" size={14} color={colors.text.tertiary} />
            </Pressable>
          );
        }}

        renderItem={({ item }) => {
          const { task, zone, zoneNote, zoneType } = item;
          const done = task.completed;
          const showZoneHeader = zone !== lastZone;
          lastZone = zone;
          const typeMeta = TYPE_META[zoneType || ''] || TYPE_META[task.source_type || ''];
          return (
            <View>
              {showZoneHeader && (
                <View style={s.zoneRow}>
                  {typeMeta && <Ionicons name={typeMeta.icon as any} size={12} color={typeMeta.color} />}
                  <Text style={s.zoneName}>{zone}</Text>
                  {zoneNote && <Text style={s.zoneNote} numberOfLines={1}>{zoneNote}</Text>}
                </View>
              )}
              <Pressable
                style={[s.taskRow, done && s.taskRowDone]}
                onPress={() => toggle(task.id)}
                onLongPress={() => Alert.alert('Remove', `Remove "${task.title}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => deleteTask(task.id) },
                ])}
              >
                <View style={[s.cb, done && s.cbDone]}>
                  {done && <Ionicons name="checkmark" size={11} color={colors.bg.primary} />}
                </View>
                <Text style={[s.taskName, done && s.taskNameDone]} numberOfLines={1}>{task.title}</Text>
                {task.reset_type !== 'none' && (
                  <View style={[s.resetBadge, task.reset_type === 'weekly' ? s.resetW : s.resetD]}>
                    <Text style={[s.resetBadgeT, { color: task.reset_type === 'weekly' ? '#C084FC' : '#38BDF8' }]}>
                      {task.reset_type === 'weekly' ? 'W' : 'D'}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          );
        }}

        renderSectionFooter={() => <View style={s.sectionFooter} />}

        ListEmptyComponent={!loading ? (
          <View style={s.empty}>
            <Ionicons name="map-outline" size={48} color={colors.text.tertiary} />
            <Text style={s.emptyT}>
              {hideCompleted && totalT > 0 ? 'All tasks complete!' : 'No farm tasks yet'}
            </Text>
            <Text style={s.emptyS}>
              {hideCompleted && totalT > 0
                ? 'Toggle "Show Done" or wait for reset.'
                : 'Tap "Auto-Plan" to generate an optimized route, or "Add Task" to add one manually.'}
            </Text>
          </View>
        ) : null}
      />

      {/* ── Auto-plan modal ── */}
      <Modal visible={planModalVisible} animationType="slide" transparent onRequestClose={() => setPlanModalVisible(false)}>
        <View style={s.modalBd}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPlanModalVisible(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHdr}>
              <Text style={s.modalTitle}>Auto-Plan Route</Text>
              <Pressable onPress={() => setPlanModalVisible(false)} style={s.modalClose}>
                <Ionicons name="close" size={20} color={colors.text.secondary} />
              </Pressable>
            </View>
            <Text style={s.modalSub}>
              {selectedChar ? `Missing mounts for ${selectedChar.display.split('-')[0]}` : 'Select which source types to farm'}
            </Text>
            <Text style={s.modalLabel}>INCLUDE SOURCE TYPES</Text>
            <View style={s.typeGrid}>
              {ALL_SOURCE_TYPES.map(type => {
                const meta = TYPE_META[type];
                const on = selectedTypes.has(type);
                return (
                  <Pressable key={type} onPress={() => setSelectedTypes(prev => { const n = new Set(prev); if (n.has(type)) n.delete(type); else n.add(type); return n; })}
                    style={[s.typeChip, on && { borderColor: meta.color + '80', backgroundColor: meta.color + '18' }]}>
                    <Ionicons name={meta.icon as any} size={14} color={on ? meta.color : colors.text.tertiary} />
                    <Text style={[s.typeChipT, on && { color: meta.color }]}>{type.replace('_', ' ')}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={s.modalLabel}>MAX NEW TASKS</Text>
            <View style={s.maxRow}>
              {[10, 20, 30, 50].map(n => (
                <Pressable key={n} onPress={() => setMaxTasks(n)} style={[s.maxChip, maxTasks === n && s.maxChipA]}>
                  <Text style={[s.maxChipT, maxTasks === n && s.maxChipTA]}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.previewRow}>
              <Ionicons name="sparkles-outline" size={16} color={colors.gold.dim} />
              <Text style={s.previewT}>{Math.min(planPreviewCount, maxTasks)} mounts will be added</Text>
            </View>
            <Pressable onPress={executePlan} style={[s.goBtn, (planPreviewCount === 0 || selectedTypes.size === 0) && { opacity: 0.4 }]} disabled={planPreviewCount === 0 || selectedTypes.size === 0}>
              <Ionicons name="sparkles" size={18} color={colors.bg.primary} />
              <Text style={s.goBtnT}>Generate Route</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Add task modal ── */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalBd}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowAdd(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Add Farm Task</Text>
            <View style={s.field}><Text style={s.fieldLabel}>TASK NAME</Text><TextInput style={s.input} value={nTitle} onChangeText={setNTitle} placeholder="e.g. Invincible" placeholderTextColor={colors.text.tertiary} autoFocus /></View>
            <View style={s.field}><Text style={s.fieldLabel}>SOURCE TYPE</Text><TextInput style={s.input} value={nSrc} onChangeText={setNSrc} placeholder="raid, dungeon, world_boss" placeholderTextColor={colors.text.tertiary} /></View>
            <View style={s.field}><Text style={s.fieldLabel}>ZONE</Text><TextInput style={s.input} value={nZone} onChangeText={setNZone} placeholder="e.g. Icecrown Citadel" placeholderTextColor={colors.text.tertiary} /></View>
            <View style={s.field}>
              <Text style={s.fieldLabel}>RESET</Text>
              <View style={s.resetRow}>
                {(['daily', 'weekly', 'none'] as const).map(r => (
                  <Pressable key={r} onPress={() => setNReset(r)} style={[s.resetOpt, nReset === r && s.resetOptA]}>
                    <Text style={[s.resetOptT, nReset === r && s.resetOptTA]}>{r === 'none' ? 'One-time' : r[0].toUpperCase() + r.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable onPress={addTask} style={[s.goBtn, !nTitle.trim() && { opacity: 0.4 }]} disabled={!nTitle.trim()}>
              <Ionicons name="add-circle" size={18} color={colors.bg.primary} />
              <Text style={s.goBtnT}>Add Task</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  list: { paddingBottom: 100 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.md },
  title: { ...typography.display, color: colors.frost.primary },
  sub: { ...typography.caption, color: colors.text.secondary, marginTop: -spacing.sm },
  // Timers
  timerRow: { flexDirection: 'row', gap: spacing.sm },
  timerCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.bg.secondary, borderRadius: radii.md, paddingVertical: 10, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border.subtle },
  timerLabel: { fontSize: 11, fontWeight: '600', color: colors.text.tertiary },
  timerVal: { fontSize: 13, fontWeight: '700', color: colors.text.primary, marginLeft: 'auto' },
  // Progress card
  progCard: { padding: spacing.lg },
  progRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  progStat: { alignItems: 'center', gap: 3 },
  progNum: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  progLabel: { ...typography.label, fontSize: 9 },
  progDiv: { width: 1, height: 24, backgroundColor: colors.border.default },
  progBarOuter: { height: 4, backgroundColor: colors.bg.primary, borderRadius: 2, marginTop: spacing.md, overflow: 'hidden' },
  progBarFill: { height: 4, borderRadius: 2 },
  celebRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border.default },
  celebText: { ...typography.caption, color: colors.gold.dim, flex: 1 },
  // Buttons
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: 12, borderRadius: radii.md },
  btnGold: { backgroundColor: colors.gold.primary, ...shadows.card },
  btnGoldT: { fontSize: 13, fontWeight: '700', color: colors.bg.primary },
  btnOutline: { borderWidth: 1, borderColor: colors.gold.dim, backgroundColor: colors.gold.muted },
  btnOutlineT: { fontSize: 13, fontWeight: '700', color: colors.gold.primary },
  btnPressed: { opacity: 0.85 },
  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.tertiary },
  chipActive: { borderColor: colors.gold.dim, backgroundColor: colors.gold.muted },
  chipT: { fontSize: 10, fontWeight: '600', color: colors.text.tertiary },
  chipTActive: { color: colors.gold.primary },
  // Collapsed expansion bar
  collapsedBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: colors.bg.secondary, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border.subtle },
  collapsedTitle: { fontWeight: '700', fontSize: 13, flex: 1 },
  collapsedCount: { fontSize: 12, fontWeight: '600', color: colors.text.tertiary },
  // Section headers (expansion)
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 12, backgroundColor: colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: colors.border.subtle, marginTop: spacing.sm },
  expDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontWeight: '700', fontSize: 14, flex: 1 },
  sectionCount: { fontSize: 12, fontWeight: '600', color: colors.text.tertiary },
  sectionFooter: { height: 2 },
  // Zone sub-header
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: 6, backgroundColor: colors.bg.primary, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  zoneName: { fontSize: 11, fontWeight: '700', color: colors.text.secondary },
  zoneNote: { flex: 1, fontSize: 10, color: colors.text.tertiary, fontStyle: 'italic', textAlign: 'right' },
  // Task rows
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 11, backgroundColor: colors.bg.primary, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  taskRowDone: { backgroundColor: colors.fel.primary + '06' },
  cb: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center' },
  cbDone: { backgroundColor: colors.fel.primary, borderColor: colors.fel.primary },
  taskName: { flex: 1, fontSize: 13, fontWeight: '500', color: colors.text.primary },
  taskNameDone: { color: colors.text.tertiary, textDecorationLine: 'line-through' },
  resetBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  resetW: { backgroundColor: '#C084FC' + '18' },
  resetD: { backgroundColor: '#38BDF8' + '18' },
  resetBadgeT: { fontSize: 9, fontWeight: '800' },
  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyT: { ...typography.heading, color: colors.text.secondary },
  emptyS: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', lineHeight: 18 },
  // Modals
  modalBd: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,7,14,0.6)' },
  modalSheet: { backgroundColor: colors.bg.secondary, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: spacing.xl, paddingBottom: 50, borderTopWidth: 1, borderColor: colors.border.subtle, gap: spacing.md },
  modalHandle: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border.subtle, alignSelf: 'center', marginTop: spacing.md },
  modalHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { ...typography.heading, color: colors.gold.primary },
  modalClose: { backgroundColor: colors.bg.elevated, borderRadius: radii.full, padding: spacing.sm },
  modalSub: { ...typography.caption, color: colors.text.tertiary, marginTop: -spacing.sm },
  modalLabel: { ...typography.label, marginTop: spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.tertiary },
  typeChipT: { fontSize: 12, fontWeight: '600', color: colors.text.tertiary, textTransform: 'capitalize' },
  maxRow: { flexDirection: 'row', gap: spacing.sm },
  maxChip: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.default },
  maxChipA: { borderColor: colors.gold.dim, backgroundColor: colors.gold.muted },
  maxChipT: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
  maxChipTA: { color: colors.gold.primary },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewT: { ...typography.caption, color: colors.text.secondary },
  goBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.gold.primary, borderRadius: radii.md, paddingVertical: 14, ...shadows.card },
  goBtnT: { fontSize: 15, fontWeight: '700', color: colors.bg.primary },
  // Add task modal fields
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.label },
  input: { backgroundColor: colors.bg.input, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 14, color: colors.text.primary },
  resetRow: { flexDirection: 'row', gap: spacing.sm },
  resetOpt: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.default },
  resetOptA: { borderColor: colors.gold.dim, backgroundColor: colors.gold.muted },
  resetOptT: { fontSize: 11, fontWeight: '600', color: colors.text.secondary },
  resetOptTA: { color: colors.gold.primary },
});
