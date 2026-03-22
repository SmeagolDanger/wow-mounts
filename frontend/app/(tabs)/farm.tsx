import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, RefreshControl,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import { Card, FarmTaskItem } from '../../components';
import api, { FarmTask } from '../../services/api';

export default function FarmScreen() {
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newZone, setNewZone] = useState('');
  const [newReset, setNewReset] = useState<'daily' | 'weekly' | 'none'>('daily');

  const load = useCallback(async () => {
    try {
      setTasks((await api.getFarmTasks()).tasks);
    } catch (e) {
      console.error('Failed to load farm tasks:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Daily reset countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const nextReset = new Date(now);
      nextReset.setUTCHours(15, 0, 0, 0);
      if (now >= nextReset) nextReset.setUTCDate(nextReset.getUTCDate() + 1);
      const diff = nextReset.getTime() - now.getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${hours}h ${mins}m ${secs}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTask = async (id: number) => {
    try {
      const result = await api.toggleFarmTask(id);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: result.completed } : t));
    } catch (e) {
      console.error('Failed to toggle task:', e);
    }
  };

  const deleteTask = (id: number) => Alert.alert(
    'Delete', 'Delete this task?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteFarmTask(id);
            setTasks(prev => prev.filter(t => t.id !== id));
          } catch (e) {
            console.error('Failed to delete task:', e);
          }
        },
      },
    ],
  );

  const addTask = async () => {
    if (!newTitle.trim()) return;
    try {
      const result = await api.createFarmTask({
        title: newTitle.trim(),
        source_type: newSource.trim() || undefined,
        zone_name: newZone.trim() || undefined,
        reset_type: newReset,
      });
      setTasks(prev => [...prev, {
        id: result.id,
        title: newTitle.trim(),
        source_type: newSource.trim() || undefined,
        zone_name: newZone.trim() || undefined,
        reset_type: newReset,
        completed: false,
        sort_order: prev.length,
      }]);
      setNewTitle('');
      setNewSource('');
      setNewZone('');
      setNewReset('daily');
      setShowAdd(false);
    } catch (e) {
      console.error('Failed to create task:', e);
    }
  };

  const groups = useMemo(() => [
    { title: 'Daily', key: 'daily', icon: 'sunny' as const, data: tasks.filter(t => t.reset_type === 'daily') },
    { title: 'Weekly', key: 'weekly', icon: 'calendar' as const, data: tasks.filter(t => t.reset_type === 'weekly') },
    { title: 'One-time', key: 'none', icon: 'infinite' as const, data: tasks.filter(t => t.reset_type === 'none') },
  ].filter(g => g.data.length > 0), [tasks]);

  const dailyDone = tasks.filter(t => t.reset_type === 'daily' && t.completed).length;
  const dailyTotal = tasks.filter(t => t.reset_type === 'daily').length;
  const weeklyDone = tasks.filter(t => t.reset_type === 'weekly' && t.completed).length;
  const weeklyTotal = tasks.filter(t => t.reset_type === 'weekly').length;

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <FlatList
        data={groups}
        keyExtractor={item => item.key}
        contentContainerStyle={z.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />
        }
        ListHeaderComponent={
          <View style={z.header}>
            <View style={z.titleRow}>
              <Text style={z.title}>Daily Farm</Text>
              <Pressable onPress={() => setShowAdd(true)} style={z.addBtn}>
                <Ionicons name="add" size={18} color={colors.bg.primary} />
              </Pressable>
            </View>
            <Card variant="arcane">
              <View style={z.countdownRow}>
                <View>
                  <Text style={z.countdownLabel}>DAILY RESET</Text>
                  <Text style={z.countdownValue}>{countdown}</Text>
                </View>
                <View style={z.summaryRow}>
                  <View style={z.summaryBlock}>
                    <Text style={z.summaryValue}>{dailyDone}/{dailyTotal}</Text>
                    <Text style={z.summaryLabel}>Daily</Text>
                  </View>
                  <View style={z.summaryBlock}>
                    <Text style={z.summaryValue}>{weeklyDone}/{weeklyTotal}</Text>
                    <Text style={z.summaryLabel}>Weekly</Text>
                  </View>
                </View>
              </View>
            </Card>
          </View>
        }
        renderItem={({ item: group }) => (
          <View style={z.group}>
            <View style={z.groupHeader}>
              <Ionicons name={group.icon} size={14} color={colors.text.tertiary} />
              <Text style={z.groupTitle}>{group.title}</Text>
              <Text style={z.groupCount}>
                {group.data.filter(t => t.completed).length}/{group.data.length}
              </Text>
            </View>
            <View style={z.groupList}>
              {group.data.map(task => (
                <FarmTaskItem
                  key={task.id}
                  title={task.title}
                  sourceType={task.source_type}
                  zoneName={task.zone_name}
                  resetType={task.reset_type}
                  completed={task.completed}
                  onToggle={() => toggleTask(task.id)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? (
          <View style={z.empty}>
            <Ionicons name="checkbox-outline" size={40} color={colors.text.tertiary} />
            <Text style={z.emptyTitle}>No farm tasks yet</Text>
            <Text style={z.emptySub}>Tap + or add from mount details</Text>
          </View>
        ) : null}
      />

      {/* Add Task Modal */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={z.modal}>
          <Pressable style={z.modalBackdrop} onPress={() => setShowAdd(false)} />
          <View style={z.modalContent}>
            <View style={z.modalHandle} />
            <Text style={z.modalTitle}>Add Farm Task</Text>

            <View style={z.field}>
              <Text style={z.fieldLabel}>TASK NAME</Text>
              <TextInput
                style={z.fieldInput} value={newTitle} onChangeText={setNewTitle}
                placeholder="e.g. Sha of Anger" placeholderTextColor={colors.text.tertiary} autoFocus
              />
            </View>
            <View style={z.field}>
              <Text style={z.fieldLabel}>SOURCE</Text>
              <TextInput
                style={z.fieldInput} value={newSource} onChangeText={setNewSource}
                placeholder="raid, dungeon, world_boss" placeholderTextColor={colors.text.tertiary}
              />
            </View>
            <View style={z.field}>
              <Text style={z.fieldLabel}>ZONE</Text>
              <TextInput
                style={z.fieldInput} value={newZone} onChangeText={setNewZone}
                placeholder="e.g. Kun-Lai Summit" placeholderTextColor={colors.text.tertiary}
              />
            </View>
            <View style={z.field}>
              <Text style={z.fieldLabel}>RESET</Text>
              <View style={z.resetRow}>
                {(['daily', 'weekly', 'none'] as const).map(r => (
                  <Pressable key={r} onPress={() => setNewReset(r)} style={[z.resetOption, newReset === r && z.resetOptionActive]}>
                    <Text style={[z.resetOptionText, newReset === r && z.resetOptionTextActive]}>
                      {r === 'none' ? 'One-time' : r[0].toUpperCase() + r.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable onPress={addTask} style={[z.submitBtn, !newTitle.trim() && z.submitBtnDisabled]} disabled={!newTitle.trim()}>
              <Ionicons name="add-circle" size={18} color={colors.bg.primary} />
              <Text style={z.submitBtnText}>Add Task</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  header: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.display, color: colors.arcane.light },
  addBtn: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.gold.primary, alignItems: 'center', justifyContent: 'center' },
  countdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countdownLabel: { ...typography.label, color: colors.arcane.light, marginBottom: spacing.xs },
  countdownValue: { fontSize: 20, fontWeight: '700', color: colors.text.primary, fontVariant: ['tabular-nums'] },
  summaryRow: { flexDirection: 'row', gap: spacing.xl },
  summaryBlock: { alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  summaryLabel: { ...typography.caption, fontSize: 9 },
  group: { marginBottom: spacing.xl },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  groupTitle: { ...typography.subheading, flex: 1, fontSize: 14 },
  groupCount: { ...typography.caption, color: colors.text.tertiary },
  groupList: { gap: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyTitle: { ...typography.heading, color: colors.text.secondary },
  emptySub: { ...typography.caption, color: colors.text.tertiary },
  modal: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: colors.bg.secondary, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.xl, paddingBottom: 40, gap: spacing.md },
  modalHandle: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border.subtle, alignSelf: 'center', marginBottom: spacing.sm },
  modalTitle: { ...typography.heading, color: colors.gold.primary },
  field: { gap: spacing.sm },
  fieldLabel: { ...typography.label },
  fieldInput: { backgroundColor: colors.bg.input, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 14, color: colors.text.primary },
  resetRow: { flexDirection: 'row', gap: spacing.sm },
  resetOption: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.default },
  resetOptionActive: { borderColor: colors.gold.dim, backgroundColor: colors.gold.muted },
  resetOptionText: { fontSize: 11, fontWeight: '600', color: colors.text.secondary },
  resetOptionTextActive: { color: colors.gold.primary },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.gold.primary, borderRadius: radii.md, paddingVertical: 14, marginTop: spacing.sm },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: colors.bg.primary },
});
