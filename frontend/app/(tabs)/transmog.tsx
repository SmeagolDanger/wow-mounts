import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../theme';
import { Card } from '../../components';
import api, { TransmogData } from '../../services/api';
import { useApp } from '../../contexts/AppContext';
import { CLASS_ARMOR_TYPE } from '../../data/collectionRequirements';

const ACCENT = '#E879F9';

export default function TransmogScreen() {
  const router = useRouter();
  const { selectedChar, characterClass } = useApp();
  const [data, setData] = useState<TransmogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!selectedChar) { setLoading(false); return; }
    try {
      setData(await api.getCharacterTransmog(selectedChar.realm_slug, selectedChar.character_name));
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [selectedChar]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  useEffect(() => { load(); }, [load]);

  if (!selectedChar) return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <View style={z.emptyFull}>
        <Ionicons name="shirt-outline" size={48} color={colors.text.tertiary} />
        <Text style={z.emptyTitle}>Select a Character</Text>
        <Text style={z.emptySub}>Choose a character from the Collection tab to view their transmog collection.</Text>
      </View>
    </SafeAreaView>
  );

  if (loading) return (
    <SafeAreaView style={z.loadC}>
      <ActivityIndicator size="large" color={ACCENT} />
      <Text style={z.loadT}>Loading transmog...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <FlatList
        data={data?.sets || []}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={z.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} progressBackgroundColor={colors.bg.secondary} />}
        ListHeaderComponent={
          <View style={z.hdr}>
            <Pressable onPress={() => router.back()} style={z.back}>
              <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
            </Pressable>
            <Text style={z.title}>Transmog</Text>
            {characterClass && (
              <View style={z.armorRow}>
                <Ionicons name="shield-outline" size={14} color={ACCENT} />
                <Text style={z.armorText}>{characterClass} — {CLASS_ARMOR_TYPE[characterClass] || 'Unknown'} armor</Text>
              </View>
            )}
            <Card variant="default" style={z.heroCard}>
              <View style={z.heroRow}>
                <View style={z.heroStat}>
                  <View style={[z.heroIcon, { backgroundColor: ACCENT + '18' }]}>
                    <Ionicons name="shirt" size={20} color={ACCENT} />
                  </View>
                  <Text style={z.heroNum}>{(data?.appearance_count || 0).toLocaleString()}</Text>
                  <Text style={z.heroLabel}>APPEARANCES</Text>
                </View>
                <View style={z.heroDivider} />
                <View style={z.heroStat}>
                  <View style={[z.heroIcon, { backgroundColor: ACCENT + '18' }]}>
                    <Ionicons name="layers" size={20} color={ACCENT} />
                  </View>
                  <Text style={z.heroNum}>{(data?.set_count || 0).toLocaleString()}</Text>
                  <Text style={z.heroLabel}>SETS</Text>
                </View>
              </View>
            </Card>
            {(data?.sets?.length || 0) > 0 && <Text style={z.sectionTitle}>Collected Sets</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={z.setRow}>
            <View style={[z.setIcon, { backgroundColor: ACCENT + '18' }]}>
              <Ionicons name="layers-outline" size={14} color={ACCENT} />
            </View>
            <Text style={z.setName} numberOfLines={1}>{item.name}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={z.empty}>
            <Ionicons name="shirt-outline" size={40} color={colors.text.tertiary} />
            <Text style={z.emptyT}>{data ? 'No transmog data available' : 'Failed to load transmog'}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loadC: { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  loadT: { ...typography.body, color: colors.text.secondary },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  hdr: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.display, color: ACCENT },
  heroCard: { padding: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  heroStat: { alignItems: 'center', gap: spacing.xs },
  heroIcon: { width: 40, height: 40, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  heroNum: { fontSize: 24, fontWeight: '700', color: colors.text.primary },
  heroLabel: { ...typography.label, fontSize: 9 },
  heroDivider: { width: 1, height: 40, backgroundColor: colors.border.default },
  sectionTitle: { ...typography.heading, marginTop: spacing.sm },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12, paddingHorizontal: spacing.md, marginBottom: spacing.xs, backgroundColor: colors.bg.secondary, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default },
  setIcon: { width: 28, height: 28, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  setName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text.primary },
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyT: { ...typography.heading, color: colors.text.secondary },
  emptyFull: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.text.secondary },
  emptySub: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', lineHeight: 18 },
  back: { width: 32, height: 32, borderRadius: radii.full, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  armorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  armorText: { ...typography.caption, color: ACCENT, fontWeight: '600' },
});
