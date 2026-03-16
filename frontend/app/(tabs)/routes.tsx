/**
 * Routes Tab — Farm route planner.
 * Groups farm tasks by zone into "routes" with a step-through run mode.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import Card from '../../components/Card';
import api, { FarmTask } from '../../services/api';

interface Route {
  zone: string;
  tasks: FarmTask[];
  completed: number;
}

export default function RoutesScreen() {
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRoute, setActiveRoute] = useState<Route | null>(null);
  const [runStep, setRunStep] = useState(0);

  const loadTasks = useCallback(async () => {
    try { const d = await api.getFarmTasks(); setTasks(d.tasks); } catch {}
    finally { setLoading(false); }
  }, []);

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadTasks(); setRefreshing(false); }, [loadTasks]);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Group tasks by zone
  const routes = useMemo(() => {
    const map = new Map<string, FarmTask[]>();
    for (const t of tasks) {
      const zone = t.zone_name || 'Unassigned';
      if (!map.has(zone)) map.set(zone, []);
      map.get(zone)!.push(t);
    }
    return Array.from(map.entries()).map(([zone, zoneTasks]) => ({
      zone,
      tasks: zoneTasks.sort((a, b) => a.sort_order - b.sort_order),
      completed: zoneTasks.filter((t) => t.completed).length,
    })).sort((a, b) => {
      // Incomplete routes first
      const aPct = a.completed / a.tasks.length;
      const bPct = b.completed / b.tasks.length;
      return aPct - bPct;
    });
  }, [tasks]);

  const totalTasks = tasks.length;
  const totalDone = tasks.filter((t) => t.completed).length;

  const handleToggle = async (taskId: number) => {
    try {
      const r = await api.toggleFarmTask(taskId);
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, completed: r.completed } : t));
    } catch {}
  };

  const startRoute = (route: Route) => {
    setActiveRoute(route);
    // Start at first incomplete task
    const firstIncomplete = route.tasks.findIndex((t) => !t.completed);
    setRunStep(firstIncomplete >= 0 ? firstIncomplete : 0);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />}
      >
        <Text style={styles.title}>Farm Routes</Text>
        <Text style={styles.subtitle}>Routes are auto-generated from your farm tasks grouped by zone.</Text>

        {/* Overview card */}
        <Card variant="gold" style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewNum}>{routes.length}</Text>
              <Text style={styles.overviewLabel}>ROUTES</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewStat}>
              <Text style={styles.overviewNum}>{totalDone}/{totalTasks}</Text>
              <Text style={styles.overviewLabel}>COMPLETE</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewStat}>
              <Text style={styles.overviewNum}>{Math.round(totalTasks > 0 ? (totalDone / totalTasks) * 100 : 0)}%</Text>
              <Text style={styles.overviewLabel}>PROGRESS</Text>
            </View>
          </View>
        </Card>

        {routes.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={56} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No routes yet</Text>
            <Text style={styles.emptyHint}>Add farm tasks with zone names in the Farm tab, and they'll appear here as routes automatically.</Text>
          </View>
        ) : (
          <View style={styles.routeList}>
            {routes.map((route) => {
              const pct = Math.round((route.completed / route.tasks.length) * 100);
              const isComplete = pct === 100;

              return (
                <Card key={route.zone} variant={isComplete ? 'success' : 'default'} onPress={() => startRoute(route)}>
                  <View style={styles.routeCard}>
                    <View style={styles.routeIcon}>
                      <Ionicons name={isComplete ? 'checkmark-circle' : 'navigate-circle-outline'} size={32} color={isComplete ? colors.fel.primary : colors.gold.primary} />
                    </View>
                    <View style={styles.routeInfo}>
                      <Text style={styles.routeZone}>{route.zone}</Text>
                      <Text style={styles.routeMeta}>{route.tasks.length} task{route.tasks.length !== 1 ? 's' : ''} — {route.completed} done</Text>
                      {/* Progress bar */}
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: isComplete ? colors.fel.primary : colors.gold.primary }]} />
                      </View>
                    </View>
                    <View style={styles.routePct}>
                      <Text style={[styles.routePctText, isComplete && { color: colors.fel.primary }]}>{pct}%</Text>
                    </View>
                    <Ionicons name="play-circle" size={28} color={colors.gold.dim} />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Route Run Mode Modal */}
      <Modal visible={activeRoute !== null} animationType="slide" transparent onRequestClose={() => setActiveRoute(null)}>
        <View style={styles.runBackdrop}>
          <View style={styles.runSheet}>
            <View style={styles.runHandle} />
            {activeRoute && (
              <>
                <View style={styles.runHeader}>
                  <View>
                    <Text style={styles.runZone}>{activeRoute.zone}</Text>
                    <Text style={styles.runProgress}>Step {runStep + 1} of {activeRoute.tasks.length}</Text>
                  </View>
                  <Pressable onPress={() => setActiveRoute(null)} style={styles.runClose}>
                    <Ionicons name="close" size={22} color={colors.text.secondary} />
                  </Pressable>
                </View>

                {/* Step progress dots */}
                <View style={styles.dots}>
                  {activeRoute.tasks.map((t, i) => (
                    <Pressable key={t.id} onPress={() => setRunStep(i)} style={[styles.dot, i === runStep && styles.dotActive, t.completed && styles.dotDone]} />
                  ))}
                </View>

                {/* Current task */}
                <View style={styles.runTask}>
                  <View style={[styles.runTaskCircle, activeRoute.tasks[runStep]?.completed && styles.runTaskCircleDone]}>
                    {activeRoute.tasks[runStep]?.completed
                      ? <Ionicons name="checkmark" size={32} color={colors.bg.primary} />
                      : <Text style={styles.runTaskNum}>{runStep + 1}</Text>
                    }
                  </View>
                  <Text style={styles.runTaskTitle}>{activeRoute.tasks[runStep]?.title}</Text>
                  {activeRoute.tasks[runStep]?.notes && <Text style={styles.runTaskNotes}>{activeRoute.tasks[runStep].notes}</Text>}
                  {activeRoute.tasks[runStep]?.source_type && (
                    <View style={styles.runSourceBadge}>
                      <Text style={styles.runSourceText}>{activeRoute.tasks[runStep].source_type}</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.runActions}>
                  <Pressable onPress={() => setRunStep(Math.max(0, runStep - 1))} style={[styles.runNav, runStep === 0 && styles.runNavDisabled]} disabled={runStep === 0}>
                    <Ionicons name="arrow-back" size={20} color={runStep === 0 ? colors.text.tertiary : colors.text.primary} />
                  </Pressable>

                  <Pressable
                    onPress={() => { handleToggle(activeRoute.tasks[runStep].id); if (runStep < activeRoute.tasks.length - 1) setRunStep(runStep + 1); }}
                    style={[styles.runComplete, activeRoute.tasks[runStep]?.completed && styles.runCompleteDone]}
                  >
                    <Ionicons name={activeRoute.tasks[runStep]?.completed ? 'checkmark-done' : 'checkmark'} size={24} color={colors.bg.primary} />
                    <Text style={styles.runCompleteText}>{activeRoute.tasks[runStep]?.completed ? 'Done!' : 'Mark Complete'}</Text>
                  </Pressable>

                  <Pressable onPress={() => setRunStep(Math.min(activeRoute.tasks.length - 1, runStep + 1))} style={[styles.runNav, runStep >= activeRoute.tasks.length - 1 && styles.runNavDisabled]} disabled={runStep >= activeRoute.tasks.length - 1}>
                    <Ionicons name="arrow-forward" size={20} color={runStep >= activeRoute.tasks.length - 1 ? colors.text.tertiary : colors.text.primary} />
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 100 },
  title: { ...typography.display, color: colors.frost.primary },
  subtitle: { ...typography.caption, color: colors.text.tertiary, marginTop: spacing.xs, marginBottom: spacing.lg },

  overviewCard: { padding: spacing.lg, marginBottom: spacing.xl },
  overviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  overviewStat: { alignItems: 'center', gap: 4 },
  overviewNum: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  overviewLabel: { ...typography.label, fontSize: 10 },
  overviewDivider: { width: 1, height: 30, backgroundColor: colors.border.default },

  routeList: { gap: spacing.md },
  routeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  routeIcon: { width: 40, alignItems: 'center' },
  routeInfo: { flex: 1, gap: 4 },
  routeZone: { ...typography.subheading },
  routeMeta: { ...typography.caption, color: colors.text.secondary },
  progressBar: { height: 4, backgroundColor: colors.bg.primary, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  routePct: { marginRight: spacing.sm },
  routePctText: { ...typography.subheading, color: colors.gold.primary },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl * 2, gap: spacing.md },
  emptyTitle: { ...typography.heading, color: colors.text.secondary },
  emptyHint: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', paddingHorizontal: spacing.xl },

  // Run mode
  runBackdrop: { flex: 1, backgroundColor: colors.bg.modal, justifyContent: 'flex-end' },
  runSheet: { backgroundColor: colors.bg.secondary, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: spacing.xl, paddingBottom: 50 },
  runHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border.light, alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.lg },
  runHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  runZone: { ...typography.heading, color: colors.frost.primary },
  runProgress: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  runClose: { backgroundColor: colors.bg.tertiary, borderRadius: radii.full, padding: spacing.sm },

  dots: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginVertical: spacing.xl },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border.default },
  dotActive: { backgroundColor: colors.gold.primary, width: 24 },
  dotDone: { backgroundColor: colors.fel.dim },

  runTask: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.lg },
  runTaskCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.bg.tertiary, borderWidth: 2, borderColor: colors.gold.dim, alignItems: 'center', justifyContent: 'center' },
  runTaskCircleDone: { backgroundColor: colors.fel.primary, borderColor: colors.fel.primary },
  runTaskNum: { fontSize: 24, fontWeight: '700', color: colors.gold.primary },
  runTaskTitle: { ...typography.heading, textAlign: 'center' },
  runTaskNotes: { ...typography.body, color: colors.text.secondary, textAlign: 'center' },
  runSourceBadge: { backgroundColor: colors.bg.tertiary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full },
  runSourceText: { ...typography.caption, fontWeight: '700', textTransform: 'uppercase', color: colors.text.secondary },

  runActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, justifyContent: 'center' },
  runNav: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bg.tertiary, alignItems: 'center', justifyContent: 'center' },
  runNavDisabled: { opacity: 0.4 },
  runComplete: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.gold.primary, borderRadius: radii.md, paddingVertical: spacing.lg, ...shadows.card },
  runCompleteDone: { backgroundColor: colors.fel.primary },
  runCompleteText: { fontSize: 16, fontWeight: '700', color: colors.bg.primary },
});
