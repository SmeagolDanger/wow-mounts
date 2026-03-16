/**
 * Farm Tab — Daily and weekly farm task tracker with auto-reset.
 *
 * Features:
 * - Reset countdown timer (daily/weekly)
 * - Grouped task list: Daily / Weekly / One-time
 * - Add new farm task with mount linking
 * - Toggle completion with satisfying feedback
 * - Auto-reset past daily/weekly reset times
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import Card from '../../components/Card';
import FarmTaskItem from '../../components/FarmTaskItem';
import api from '../../services/api';

interface FarmTask {
  id: number;
  title: string;
  description?: string;
  mount_id?: number;
  source_type?: string;
  zone_name?: string;
  reset_type: string;
  completed: boolean;
  completed_at?: string;
  notes?: string;
  sort_order: number;
}

interface ResetInfo {
  daily_reset: string;
  weekly_reset: string;
  tasks_reset: number;
}

export default function FarmScreen() {
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [resetInfo, setResetInfo] = useState<ResetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [countdown, setCountdown] = useState('');

  // ── New task form ────────────────────────────────────────────
  const [newTitle, setNewTitle] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newZone, setNewZone] = useState('');
  const [newResetType, setNewResetType] = useState<'daily' | 'weekly' | 'none'>('daily');

  // ── Data Loading ────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    try {
      const data = await api.getFarmTasks();
      setTasks(data.tasks);
      setResetInfo(data.reset_info);

      if (data.reset_info.tasks_reset > 0) {
        // Show a brief notification that tasks were reset
      }
    } catch (err) {
      console.error('Failed to load farm tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ── Countdown Timer ─────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      // Next daily reset: 15:00 UTC
      const next = new Date(now);
      next.setUTCHours(15, 0, 0, 0);
      if (now >= next) next.setUTCDate(next.getUTCDate() + 1);

      const diff = next.getTime() - now.getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ── Actions ─────────────────────────────────────────────────
  const handleToggle = async (taskId: number) => {
    try {
      const result = await api.toggleFarmTask(taskId);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, completed: result.completed, completed_at: result.completed ? new Date().toISOString() : undefined }
            : t
        )
      );
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDelete = (taskId: number) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this farm task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteFarmTask(taskId);
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
          } catch (err) {
            console.error('Failed to delete task:', err);
          }
        },
      },
    ]);
  };

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;

    try {
      const result = await api.createFarmTask({
        title: newTitle.trim(),
        source_type: newSource.trim() || undefined,
        zone_name: newZone.trim() || undefined,
        reset_type: newResetType,
      });

      setTasks((prev) => [
        ...prev,
        {
          id: result.id,
          title: newTitle.trim(),
          source_type: newSource.trim() || undefined,
          zone_name: newZone.trim() || undefined,
          reset_type: newResetType,
          completed: false,
          sort_order: prev.length,
        },
      ]);

      setNewTitle('');
      setNewSource('');
      setNewZone('');
      setNewResetType('daily');
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  // ── Grouped tasks ───────────────────────────────────────────
  const groupedTasks = useMemo(() => {
    const groups: { title: string; key: string; data: FarmTask[] }[] = [
      { title: 'Daily', key: 'daily', data: tasks.filter((t) => t.reset_type === 'daily') },
      { title: 'Weekly', key: 'weekly', data: tasks.filter((t) => t.reset_type === 'weekly') },
      { title: 'One-time', key: 'none', data: tasks.filter((t) => t.reset_type === 'none') },
    ];
    return groups.filter((g) => g.data.length > 0);
  }, [tasks]);

  // ── Stats ───────────────────────────────────────────────────
  const dailyDone = tasks.filter((t) => t.reset_type === 'daily' && t.completed).length;
  const dailyTotal = tasks.filter((t) => t.reset_type === 'daily').length;
  const weeklyDone = tasks.filter((t) => t.reset_type === 'weekly' && t.completed).length;
  const weeklyTotal = tasks.filter((t) => t.reset_type === 'weekly').length;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={groupedTasks}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold.primary}
            progressBackgroundColor={colors.bg.secondary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Daily Farm</Text>
              <Pressable onPress={() => setShowAddModal(true)} style={styles.addButton}>
                <Ionicons name="add" size={20} color={colors.bg.primary} />
              </Pressable>
            </View>

            {/* Reset countdown */}
            <Card variant="arcane">
              <View style={styles.countdownRow}>
                <View>
                  <Text style={styles.countdownLabel}>DAILY RESET IN</Text>
                  <Text style={styles.countdownValue}>{countdown}</Text>
                </View>
                <View style={styles.countdownStats}>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>
                      {dailyDone}/{dailyTotal}
                    </Text>
                    <Text style={styles.statLabel}>Daily</Text>
                  </View>
                  <View style={styles.statBlock}>
                    <Text style={styles.statValue}>
                      {weeklyDone}/{weeklyTotal}
                    </Text>
                    <Text style={styles.statLabel}>Weekly</Text>
                  </View>
                </View>
              </View>
            </Card>
          </View>
        }
        renderItem={({ item: group }) => (
          <View style={styles.group}>
            <View style={styles.groupHeader}>
              <Ionicons
                name={
                  group.key === 'daily'
                    ? 'sunny'
                    : group.key === 'weekly'
                    ? 'calendar'
                    : 'infinite'
                }
                size={16}
                color={colors.text.tertiary}
              />
              <Text style={styles.groupTitle}>{group.title}</Text>
              <Text style={styles.groupCount}>
                {group.data.filter((t) => t.completed).length}/{group.data.length}
              </Text>
            </View>
            <View style={styles.groupList}>
              {group.data.map((task) => (
                <FarmTaskItem
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  description={task.description}
                  sourceType={task.source_type}
                  zoneName={task.zone_name}
                  resetType={task.reset_type}
                  completed={task.completed}
                  onToggle={() => handleToggle(task.id)}
                  onDelete={() => handleDelete(task.id)}
                />
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="checkbox-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No farm tasks yet</Text>
              <Text style={styles.emptyHint}>Tap + to add your first farm route</Text>
            </View>
          ) : null
        }
      />

      {/* ── Add Task Modal ─────────────────────────────────────── */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAddModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Farm Task</Text>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>TASK NAME</Text>
              <TextInput
                style={styles.formInput}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Sha of Anger — Heavenly Onyx Cloud Serpent"
                placeholderTextColor={colors.text.tertiary}
                autoFocus
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>SOURCE TYPE</Text>
              <TextInput
                style={styles.formInput}
                value={newSource}
                onChangeText={setNewSource}
                placeholder="e.g. raid, dungeon, world_boss"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>ZONE</Text>
              <TextInput
                style={styles.formInput}
                value={newZone}
                onChangeText={setNewZone}
                placeholder="e.g. Kun-Lai Summit"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>RESET TYPE</Text>
              <View style={styles.resetPicker}>
                {(['daily', 'weekly', 'none'] as const).map((rt) => (
                  <Pressable
                    key={rt}
                    onPress={() => setNewResetType(rt)}
                    style={[styles.resetOption, newResetType === rt && styles.resetOptionActive]}
                  >
                    <Ionicons
                      name={
                        rt === 'daily' ? 'sunny-outline' : rt === 'weekly' ? 'calendar-outline' : 'infinite-outline'
                      }
                      size={16}
                      color={newResetType === rt ? colors.gold.primary : colors.text.tertiary}
                    />
                    <Text
                      style={[
                        styles.resetOptionText,
                        newResetType === rt && styles.resetOptionTextActive,
                      ]}
                    >
                      {rt === 'none' ? 'One-time' : rt.charAt(0).toUpperCase() + rt.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={handleAddTask}
              style={[styles.submitBtn, !newTitle.trim() && styles.submitBtnDisabled]}
              disabled={!newTitle.trim()}
            >
              <Ionicons name="add-circle" size={20} color={colors.bg.primary} />
              <Text style={styles.submitBtnText}>Add Task</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  header: {
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.display,
    color: colors.arcane.light,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  countdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countdownLabel: {
    ...typography.label,
    color: colors.arcane.light,
    marginBottom: spacing.xs,
  },
  countdownValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  countdownStats: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  statBlock: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  group: {
    marginBottom: spacing.xl,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  groupTitle: {
    ...typography.subheading,
    flex: 1,
  },
  groupCount: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  groupList: {
    gap: spacing.sm,
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
  // ── Modal ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.light,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.gold.primary,
  },
  formField: {
    gap: spacing.sm,
  },
  formLabel: {
    ...typography.label,
  },
  formInput: {
    backgroundColor: colors.bg.input,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text.primary,
  },
  resetPicker: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resetOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  resetOptionActive: {
    borderColor: colors.gold.dim,
    backgroundColor: colors.gold.muted,
  },
  resetOptionText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  resetOptionTextActive: {
    color: colors.gold.primary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gold.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.bg.primary,
  },
});
