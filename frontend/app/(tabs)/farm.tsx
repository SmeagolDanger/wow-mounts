/**
 * Farm Tab — Daily/weekly farm checklist with auto-reset and add task modal.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, RefreshControl,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import Card from '../../components/Card';
import FarmTaskItem from '../../components/FarmTaskItem';
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

  const loadTasks = useCallback(async () => {
    try { const d = await api.getFarmTasks(); setTasks(d.tasks); } catch (e) { console.debug('Farm load error:', e); }
    finally { setLoading(false); }
  }, []);

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadTasks(); setRefreshing(false); }, [loadTasks]);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const next = new Date(now);
      next.setUTCHours(15, 0, 0, 0);
      if (now >= next) next.setUTCDate(next.getUTCDate() + 1);
      const diff = next.getTime() - now.getTime();
      setCountdown(`${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggle = async (id: number) => {
    try {
      const r = await api.toggleFarmTask(id);
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: r.completed } : t));
    } catch {}
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Task', 'Delete this farm task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.deleteFarmTask(id); setTasks((p) => p.filter((t) => t.id !== id)); } catch {} } },
    ]);
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      const r = await api.createFarmTask({ title: newTitle.trim(), source_type: newSource.trim() || undefined, zone_name: newZone.trim() || undefined, reset_type: newReset });
      setTasks((p) => [...p, { id: r.id, title: newTitle.trim(), source_type: newSource.trim() || undefined, zone_name: newZone.trim() || undefined, reset_type: newReset, completed: false, sort_order: p.length }]);
      setNewTitle(''); setNewSource(''); setNewZone(''); setNewReset('daily'); setShowAdd(false);
    } catch {}
  };

  const groups = useMemo(() => {
    const g = [
      { title: 'Daily', key: 'daily', icon: 'sunny' as const, data: tasks.filter((t) => t.reset_type === 'daily') },
      { title: 'Weekly', key: 'weekly', icon: 'calendar' as const, data: tasks.filter((t) => t.reset_type === 'weekly') },
      { title: 'One-time', key: 'none', icon: 'infinite' as const, data: tasks.filter((t) => t.reset_type === 'none') },
    ];
    return g.filter((x) => x.data.length > 0);
  }, [tasks]);

  const dailyDone = tasks.filter((t) => t.reset_type === 'daily' && t.completed).length;
  const dailyTotal = tasks.filter((t) => t.reset_type === 'daily').length;
  const weeklyDone = tasks.filter((t) => t.reset_type === 'weekly' && t.completed).length;
  const weeklyTotal = tasks.filter((t) => t.reset_type === 'weekly').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList data={groups} keyExtractor={(i) => i.key} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Daily Farm</Text>
              <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn}><Ionicons name="add" size={20} color={colors.bg.primary} /></Pressable>
            </View>
            <Card variant="arcane">
              <View style={styles.countdownRow}>
                <View><Text style={styles.cdLabel}>DAILY RESET IN</Text><Text style={styles.cdValue}>{countdown}</Text></View>
                <View style={styles.cdStats}>
                  <View style={styles.statBlock}><Text style={styles.statVal}>{dailyDone}/{dailyTotal}</Text><Text style={styles.statLbl}>Daily</Text></View>
                  <View style={styles.statBlock}><Text style={styles.statVal}>{weeklyDone}/{weeklyTotal}</Text><Text style={styles.statLbl}>Weekly</Text></View>
                </View>
              </View>
            </Card>
          </View>
        }
        renderItem={({ item: g }) => (
          <View style={styles.group}>
            <View style={styles.groupHeader}>
              <Ionicons name={g.icon} size={16} color={colors.text.tertiary} />
              <Text style={styles.groupTitle}>{g.title}</Text>
              <Text style={styles.groupCount}>{g.data.filter((t) => t.completed).length}/{g.data.length}</Text>
            </View>
            <View style={styles.groupList}>
              {g.data.map((t) => <FarmTaskItem key={t.id} title={t.title} sourceType={t.source_type} zoneName={t.zone_name} resetType={t.reset_type} completed={t.completed} onToggle={() => handleToggle(t.id)} onDelete={() => handleDelete(t.id)} />)}
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <View style={styles.empty}><Ionicons name="checkbox-outline" size={48} color={colors.text.tertiary} /><Text style={styles.emptyText}>No farm tasks yet</Text><Text style={styles.emptyHint}>Tap + to add tasks, or add from mount details</Text></View> : null}
      />

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAdd(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Farm Task</Text>
            <View style={styles.field}><Text style={styles.fieldLabel}>TASK NAME</Text><TextInput style={styles.fieldInput} value={newTitle} onChangeText={setNewTitle} placeholder="e.g. Sha of Anger — Heavenly Onyx" placeholderTextColor={colors.text.tertiary} autoFocus /></View>
            <View style={styles.field}><Text style={styles.fieldLabel}>SOURCE TYPE</Text><TextInput style={styles.fieldInput} value={newSource} onChangeText={setNewSource} placeholder="raid, dungeon, world_boss" placeholderTextColor={colors.text.tertiary} /></View>
            <View style={styles.field}><Text style={styles.fieldLabel}>ZONE</Text><TextInput style={styles.fieldInput} value={newZone} onChangeText={setNewZone} placeholder="e.g. Kun-Lai Summit" placeholderTextColor={colors.text.tertiary} /></View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>RESET TYPE</Text>
              <View style={styles.resetRow}>
                {(['daily', 'weekly', 'none'] as const).map((rt) => (
                  <Pressable key={rt} onPress={() => setNewReset(rt)} style={[styles.resetOpt, newReset === rt && styles.resetOptActive]}>
                    <Ionicons name={(rt === 'daily' ? 'sunny-outline' : rt === 'weekly' ? 'calendar-outline' : 'infinite-outline') as any} size={16} color={newReset === rt ? colors.gold.primary : colors.text.tertiary} />
                    <Text style={[styles.resetOptText, newReset === rt && styles.resetOptTextActive]}>{rt === 'none' ? 'One-time' : rt.charAt(0).toUpperCase() + rt.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable onPress={handleAdd} style={[styles.submitBtn, !newTitle.trim() && styles.submitBtnDisabled]} disabled={!newTitle.trim()}>
              <Ionicons name="add-circle" size={20} color={colors.bg.primary} /><Text style={styles.submitBtnText}>Add Task</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  header: { gap: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.display, color: colors.arcane.light },
  addBtn: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.gold.primary, alignItems: 'center', justifyContent: 'center', ...shadows.card },
  countdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cdLabel: { ...typography.label, color: colors.arcane.light, marginBottom: spacing.xs },
  cdValue: { fontSize: 22, fontWeight: '700', color: colors.text.primary, fontVariant: ['tabular-nums'] },
  cdStats: { flexDirection: 'row', gap: spacing.xl },
  statBlock: { alignItems: 'center', gap: 2 },
  statVal: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  statLbl: { ...typography.caption, fontSize: 10 },
  group: { marginBottom: spacing.xl },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  groupTitle: { ...typography.subheading, flex: 1 },
  groupCount: { ...typography.caption, color: colors.text.tertiary },
  groupList: { gap: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl * 2, gap: spacing.md },
  emptyText: { ...typography.heading, color: colors.text.secondary },
  emptyHint: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: colors.bg.secondary, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.xl, paddingBottom: 40, gap: spacing.lg },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border.light, alignSelf: 'center', marginBottom: spacing.sm },
  modalTitle: { ...typography.heading, color: colors.gold.primary },
  field: { gap: spacing.sm },
  fieldLabel: { ...typography.label },
  fieldInput: { backgroundColor: colors.bg.input, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 15, color: colors.text.primary },
  resetRow: { flexDirection: 'row', gap: spacing.sm },
  resetOpt: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.default },
  resetOptActive: { borderColor: colors.gold.dim, backgroundColor: colors.gold.muted },
  resetOptText: { ...typography.caption, fontWeight: '600', color: colors.text.secondary },
  resetOptTextActive: { color: colors.gold.primary },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.gold.primary, borderRadius: radii.md, paddingVertical: spacing.lg, marginTop: spacing.sm },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: colors.bg.primary },
});
