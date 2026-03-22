import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import { Card } from '../../components';
import { MOUNT_ROUTE, EXP_COLORS, RouteStep } from '../../data/mountRoute';
import { useApp } from '../../contexts/AppContext';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'planner_completed_steps';

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

// ── Numbered step data ─────────────────────────────────────────────────────
interface NumberedStep {
  index: number;     // original index in MOUNT_ROUTE
  stepNum: number;   // display number (1-based)
  step: RouteStep;
}

export default function PlannerScreen() {
  const { collectedIds, selectedChar } = useApp();
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [hideCompleted, setHideCompleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [, setTick] = useState(0);

  // Load saved completion state
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then(val => {
      if (val) setCompletedSteps(new Set(JSON.parse(val)));
    }).catch(() => {});
  }, []);

  // Persist completion state
  const saveCompleted = useCallback((next: Set<number>) => {
    setCompletedSteps(next);
    SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
  }, []);

  // Countdown ticker
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(i);
  }, []);

  // Build filtered steps — remove instances where ALL drops are already collected
  const steps = useMemo((): NumberedStep[] => {
    const result: NumberedStep[] = [];
    let num = 1;
    for (let i = 0; i < MOUNT_ROUTE.length; i++) {
      const step = MOUNT_ROUTE[i];
      // If instance has mount_ids, check if ALL are collected
      if (step.type === 'instance' && step.drops && step.drops.length > 0) {
        const dropsWithIds = step.drops.filter(d => d.mount_id != null);
        if (dropsWithIds.length > 0 && dropsWithIds.every(d => collectedIds.has(d.mount_id!))) {
          continue; // Skip — player already has all mounts from this instance
        }
      }
      result.push({ index: i, stepNum: num++, step });
    }
    // Remove orphaned travel steps (travel step followed by another travel step or nothing)
    // Actually keep travel steps for context — SimpleArmory does too
    return result;
  }, [collectedIds]);

  // Stats
  const instanceSteps = steps.filter(s => s.step.type === 'instance');
  const doneCount = instanceSteps.filter(s => completedSteps.has(s.index)).length;
  const totalCount = instanceSteps.length;
  const pct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;
  const dungeonSteps = instanceSteps.filter(s => s.step.reset === 'daily');
  const raidSteps = instanceSteps.filter(s => s.step.reset === 'weekly');
  const dungeonDone = dungeonSteps.filter(s => completedSteps.has(s.index)).length;
  const raidDone = raidSteps.filter(s => completedSteps.has(s.index)).length;

  const toggleStep = (idx: number) => {
    const next = new Set(completedSteps);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    saveCompleted(next);
  };

  const resetAll = () => saveCompleted(new Set());
  const resetDungeons = () => {
    const next = new Set(completedSteps);
    for (const s of dungeonSteps) next.delete(s.index);
    saveCompleted(next);
  };
  const resetRaids = () => {
    const next = new Set(completedSteps);
    for (const s of raidSteps) next.delete(s.index);
    saveCompleted(next);
  };

  const daily = fmtCountdown(getNextDailyReset());
  const weekly = fmtCountdown(getNextWeeklyReset());

  // Filter for display
  const displaySteps = useMemo(() => {
    if (!hideCompleted) return steps;
    return steps.filter(s => s.step.type === 'travel' || !completedSteps.has(s.index));
  }, [steps, hideCompleted, completedSteps]);

  const renderStep = useCallback(({ item }: { item: NumberedStep }) => {
    const { index, stepNum, step } = item;

    if (step.type === 'travel') {
      const expColor = EXP_COLORS[step.expansion || ''] || colors.text.tertiary;
      return (
        <View style={z.travelRow}>
          <Text style={z.travelDash}>—</Text>
          <Text style={z.travelNum}>{stepNum}</Text>
          <View style={z.travelContent}>
            <Ionicons name="navigate-outline" size={12} color={expColor} />
            <Text style={[z.travelText, { color: expColor }]}>{step.instruction}</Text>
          </View>
        </View>
      );
    }

    // Instance step
    const done = completedSteps.has(index);
    const expColor = EXP_COLORS[step.expansion || ''] || colors.text.tertiary;
    const isRaid = step.instance_type === 'raid';

    return (
      <Pressable onPress={() => toggleStep(index)} style={[z.instanceRow, done && z.instanceRowDone]}>
        {/* Done checkbox */}
        <View style={[z.cb, done && z.cbDone]}>
          {done && <Ionicons name="checkmark" size={12} color={colors.bg.primary} />}
        </View>
        {/* Step number */}
        <Text style={[z.stepNum, done && z.stepNumDone]}>{stepNum}</Text>
        {/* Step info */}
        <View style={z.stepInfo}>
          <View style={z.instanceHeader}>
            <Ionicons name={isRaid ? 'skull-outline' : 'key-outline'} size={12} color={isRaid ? '#C084FC' : '#38BDF8'} />
            <Text style={[z.instanceName, done && z.textDone]} numberOfLines={1}>
              {step.instance} ({step.instance_type === 'raid' ? 'Raid' : 'Dungeon'})
            </Text>
            <View style={[z.resetBadge, isRaid ? z.resetW : z.resetD]}>
              <Text style={[z.resetBadgeT, { color: isRaid ? '#C084FC' : '#38BDF8' }]}>
                {isRaid ? 'W' : 'D'}
              </Text>
            </View>
          </View>
          {step.drops?.map((drop, di) => (
            <View key={di} style={z.dropRow}>
              <Text style={[z.bossName, done && z.textDone]}>{drop.boss}</Text>
              <Text style={[z.mountName, done && z.textDone,
                drop.mount_id != null && collectedIds.has(drop.mount_id) && z.mountCollected]}>
                {drop.mount_id != null && collectedIds.has(drop.mount_id) ? '✓ ' : ''}{drop.mount}
              </Text>
              {drop.note && <Text style={z.dropNote}>{drop.note}</Text>}
            </View>
          ))}
        </View>
      </Pressable>
    );
  }, [completedSteps, collectedIds]);

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <FlatList
        data={displaySteps}
        keyExtractor={item => `${item.index}`}
        renderItem={renderStep}
        contentContainerStyle={z.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); setRefreshing(false); }} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />}
        ListHeaderComponent={
          <View style={z.header}>
            <View style={z.titleRow}>
              <Text style={z.title}>Mount Planner</Text>
              <View style={z.pctBadge}>
                <Text style={z.pctText}>{pct}%</Text>
              </View>
            </View>

            {selectedChar && (
              <Text style={z.sub}>Route for {selectedChar.display.split('-')[0]}</Text>
            )}

            {/* Reset timers */}
            <View style={z.timerRow}>
              <View style={z.timerCard}>
                <Ionicons name="sunny-outline" size={14} color="#38BDF8" />
                <Text style={z.timerLabel}>Next daily reset</Text>
                <Text style={z.timerVal}>{daily}</Text>
              </View>
              <View style={z.timerCard}>
                <Ionicons name="calendar-outline" size={14} color="#C084FC" />
                <Text style={z.timerLabel}>Next weekly reset</Text>
                <Text style={z.timerVal}>{weekly}</Text>
              </View>
            </View>

            {/* Reset + filter buttons */}
            <View style={z.btnRow}>
              <Pressable onPress={resetAll} style={z.resetBtn}>
                <Text style={z.resetBtnT}>Reset All</Text>
              </Pressable>
              <Pressable onPress={resetDungeons} style={[z.resetBtn, { borderColor: '#38BDF8' + '60' }]}>
                <Text style={[z.resetBtnT, { color: '#38BDF8' }]}>Reset Dungeons</Text>
              </Pressable>
              <Pressable onPress={resetRaids} style={[z.resetBtn, { borderColor: '#C084FC' + '60' }]}>
                <Text style={[z.resetBtnT, { color: '#C084FC' }]}>Reset Raids</Text>
              </Pressable>
              <Pressable onPress={() => setHideCompleted(h => !h)} style={[z.toggleBtn, hideCompleted && z.toggleBtnActive]}>
                <Ionicons name={hideCompleted ? 'eye-off' : 'eye'} size={14} color={hideCompleted ? colors.gold.primary : colors.text.tertiary} />
                <Text style={[z.toggleBtnT, hideCompleted && { color: colors.gold.primary }]}>
                  {hideCompleted ? 'Show' : 'Hide'} Done
                </Text>
              </Pressable>
            </View>

            {/* Progress */}
            <Card variant="gold" style={z.progCard}>
              <View style={z.progRow}>
                <View style={z.progStat}>
                  <Text style={z.progNum}>{dungeonDone}/{dungeonSteps.length}</Text>
                  <Text style={z.progLabel}>DUNGEONS</Text>
                </View>
                <View style={z.progDiv} />
                <View style={z.progStat}>
                  <Text style={z.progNum}>{raidDone}/{raidSteps.length}</Text>
                  <Text style={z.progLabel}>RAIDS</Text>
                </View>
                <View style={z.progDiv} />
                <View style={z.progStat}>
                  <Text style={[z.progNum, pct === 100 && { color: colors.fel.primary }]}>{doneCount}/{totalCount}</Text>
                  <Text style={z.progLabel}>TOTAL</Text>
                </View>
              </View>
              <View style={z.progBarOuter}>
                <View style={[z.progBarFill, { width: `${pct}%`, backgroundColor: pct === 100 ? colors.fel.primary : colors.gold.primary }]} />
              </View>
            </Card>

            {/* Start banner */}
            <View style={z.startBanner}>
              <Ionicons name="navigate" size={14} color={colors.gold.primary} />
              <Text style={z.startText}>Start in Stormwind</Text>
            </View>

            {/* Column headers */}
            <View style={z.colHeaders}>
              <Text style={[z.colH, { width: 32 }]}>Done</Text>
              <Text style={[z.colH, { width: 24 }]}>#</Text>
              <Text style={[z.colH, { flex: 1 }]}>Step</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={z.empty}>
            <Ionicons name="trophy" size={48} color={colors.gold.primary} />
            <Text style={z.emptyT}>
              {hideCompleted && totalCount > 0 ? 'All steps complete for this reset!' : 'No mounts to farm!'}
            </Text>
            <Text style={z.emptyS}>
              {hideCompleted ? `Toggle "Show Done" to see all steps. Next reset: Daily ${daily} · Weekly ${weekly}` : 'You\'ve collected all the farmable mounts. Incredible!'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  list: { paddingBottom: 100 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.display, color: colors.frost.primary },
  pctBadge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.default },
  pctText: { fontSize: 13, fontWeight: '700', color: colors.gold.primary },
  sub: { ...typography.caption, color: colors.text.secondary, marginTop: -spacing.sm },
  // Timers
  timerRow: { flexDirection: 'row', gap: spacing.sm },
  timerCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.bg.secondary, borderRadius: radii.md, paddingVertical: 10, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border.subtle },
  timerLabel: { fontSize: 11, fontWeight: '600', color: colors.text.tertiary },
  timerVal: { fontSize: 13, fontWeight: '700', color: colors.text.primary, marginLeft: 'auto' },
  // Buttons
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  resetBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.secondary },
  resetBtnT: { fontSize: 11, fontWeight: '600', color: colors.text.secondary },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.secondary, marginLeft: 'auto' },
  toggleBtnActive: { borderColor: colors.gold.dim, backgroundColor: colors.gold.muted },
  toggleBtnT: { fontSize: 11, fontWeight: '600', color: colors.text.tertiary },
  // Progress card
  progCard: { padding: spacing.lg },
  progRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  progStat: { alignItems: 'center', gap: 3 },
  progNum: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  progLabel: { ...typography.label, fontSize: 9 },
  progDiv: { width: 1, height: 24, backgroundColor: colors.border.default },
  progBarOuter: { height: 4, backgroundColor: colors.bg.primary, borderRadius: 2, marginTop: spacing.md, overflow: 'hidden' },
  progBarFill: { height: 4, borderRadius: 2 },
  // Start banner
  startBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.gold.muted, borderRadius: radii.md, borderWidth: 1, borderColor: colors.gold.dim, paddingVertical: 10, paddingHorizontal: spacing.lg },
  startText: { fontSize: 13, fontWeight: '700', color: colors.gold.primary },
  // Column headers
  colHeaders: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.default },
  colH: { fontSize: 10, fontWeight: '700', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  // Travel row
  travelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: colors.bg.secondary, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  travelDash: { width: 32, textAlign: 'center', fontSize: 14, color: colors.text.tertiary, fontWeight: '600' },
  travelNum: { width: 24, fontSize: 12, fontWeight: '600', color: colors.text.tertiary, textAlign: 'center' },
  travelContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  travelText: { fontSize: 12, fontWeight: '500' },
  // Instance row
  instanceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 12, backgroundColor: colors.bg.primary, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  instanceRowDone: { backgroundColor: colors.fel.primary + '06' },
  cb: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  cbDone: { backgroundColor: colors.fel.primary, borderColor: colors.fel.primary },
  stepNum: { width: 24, fontSize: 12, fontWeight: '700', color: colors.text.secondary, textAlign: 'center', marginTop: 4 },
  stepNumDone: { color: colors.text.tertiary },
  stepInfo: { flex: 1, gap: 4 },
  instanceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  instanceName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text.primary },
  textDone: { color: colors.text.tertiary, textDecorationLine: 'line-through' },
  resetBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  resetW: { backgroundColor: '#C084FC' + '18' },
  resetD: { backgroundColor: '#38BDF8' + '18' },
  resetBadgeT: { fontSize: 9, fontWeight: '800' },
  // Drop rows
  dropRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.lg, flexWrap: 'wrap' },
  bossName: { fontSize: 12, fontWeight: '500', color: colors.text.secondary, minWidth: 100 },
  mountName: { fontSize: 12, fontWeight: '600', color: colors.arcane.primary },
  mountCollected: { color: colors.fel.primary, textDecorationLine: 'line-through' },
  dropNote: { fontSize: 10, color: colors.text.tertiary, fontStyle: 'italic' },
  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyT: { ...typography.heading, color: colors.text.secondary, textAlign: 'center' },
  emptyS: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', lineHeight: 18 },
});
