import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, ScrollView, Pressable,
  RefreshControl, ActivityIndicator, Dimensions, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import { SearchBar, MountCard, ProgressRing, MountDetailModal, Card } from '../../components';
import api, { MountSummary, FavChar, WowChar } from '../../services/api';
import { useApp } from '../../contexts/AppContext';

const { width: SW } = Dimensions.get('window');
const GAP = spacing.sm;
const PAD = spacing.lg;
const COL = (SW - PAD * 2 - GAP * 2) / 3;

type Filter = 'all' | 'collected' | 'missing';

export default function CollectionScreen() {
  const { selectedChar, collectedIds, loadingCollected, selectCharacter, clearCharacter } = useApp();

  const [mounts, setMounts] = useState<MountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [srcFilter, setSrcFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [iconCache, setIconCache] = useState<Record<number, string | null>>({});

  // Character picker
  const [charPickerVisible, setCharPickerVisible] = useState(false);
  const [myChars, setMyChars] = useState<WowChar[]>([]);
  const [favorites, setFavorites] = useState<FavChar[]>([]);
  const [hasBnet, setHasBnet] = useState(false);
  const [loadingPicker, setLoadingPicker] = useState(false);

  const iconQ = useRef<Set<number>>(new Set());
  const iconT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchIcons = useCallback(async (ids: number[]) => {
    try {
      const d = await api.getMountIcons(ids);
      setIconCache(p => { const n = { ...p }; for (const [k, v] of Object.entries(d.icons)) n[Number(k)] = v; return n; });
    } catch {}
  }, []);

  const queueIcons = useCallback((ids: number[]) => {
    for (const id of ids) if (iconCache[id] === undefined) iconQ.current.add(id);
    if (iconT.current || iconQ.current.size === 0) return;
    iconT.current = setTimeout(() => {
      const b = Array.from(iconQ.current).slice(0, 20);
      iconQ.current = new Set(Array.from(iconQ.current).slice(20));
      iconT.current = null;
      if (b.length) fetchIcons(b);
    }, 250);
  }, [iconCache, fetchIcons]);

  const load = useCallback(async () => {
    try {
      const d = await api.getMounts();
      setMounts(d.mounts);
      const seed: Record<number, string | null> = {};
      for (const m of d.mounts) if (m.icon_url) seed[m.id] = m.icon_url;
      setIconCache(p => ({ ...p, ...seed }));
    } catch (e) { console.error('Load mounts:', e); }
    finally { setLoading(false); }
  }, []);

  const openPicker = useCallback(async () => {
    setCharPickerVisible(true);
    setLoadingPicker(true);
    try {
      const [charsRes, favsRes] = await Promise.allSettled([
        api.getMyCharacters(),
        api.getFavorites(),
      ]);
      if (charsRes.status === 'fulfilled') { setMyChars(charsRes.value.characters); setHasBnet(charsRes.value.has_bnet); }
      if (favsRes.status === 'fulfilled') setFavorites(favsRes.value.characters);
    } catch {} finally { setLoadingPicker(false); }
  }, []);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let r = mounts;
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(m => m.name.toLowerCase().includes(q)); }
    if (filter === 'collected') r = r.filter(m => collectedIds.has(m.id));
    else if (filter === 'missing') r = r.filter(m => !collectedIds.has(m.id));
    if (srcFilter) r = r.filter(m => m.source_type === srcFilter);
    return r;
  }, [mounts, search, filter, srcFilter, collectedIds]);

  const srcTypes = useMemo(() => {
    const s = new Set<string>(); mounts.forEach(m => m.source_type && s.add(m.source_type)); return Array.from(s).sort();
  }, [mounts]);

  const addToFarm = useCallback(async (m: { id: number; name: string; source_type?: string }) => {
    try { await api.createFarmTask({ title: m.name, mount_id: m.id, source_type: m.source_type, reset_type: 'weekly' }); setSelected(null); } catch {}
  }, []);

  const onView = useRef(({ viewableItems }: any) => {
    const ids = viewableItems.map((v: any) => v.item.id).filter((id: number) => iconCache[id] === undefined);
    if (ids.length) queueIcons(ids);
  }).current;
  const viewCfg = useRef({ itemVisiblePercentThreshold: 20 }).current;

  const renderMount = useCallback(({ item }: { item: MountSummary }) => {
    const icon = iconCache[item.id] || item.icon_url || null;
    return (
      <View style={{ width: COL }}>
        <MountCard id={item.id} name={item.name} iconUrl={icon} sourceType={item.source_type}
          collected={selectedChar ? collectedIds.has(item.id) : undefined}
          onPress={() => setSelected(item.id)} />
      </View>
    );
  }, [collectedIds, iconCache, selectedChar]);

  if (loading) return (
    <SafeAreaView style={z.loadC}>
      <ActivityIndicator size="large" color={colors.gold.primary} />
      <Text style={z.loadT}>Loading mounts...</Text>
    </SafeAreaView>
  );

  const collectedPct = selectedChar && mounts.length > 0 ? Math.round((collectedIds.size / mounts.length) * 100) : 0;

  return (
    <SafeAreaView style={z.safe} edges={['top']}>
      <FlatList
        data={filtered} renderItem={renderMount} keyExtractor={i => String(i.id)}
        numColumns={3} columnWrapperStyle={z.row} contentContainerStyle={z.list}
        onViewableItemsChanged={onView} viewabilityConfig={viewCfg}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold.primary} progressBackgroundColor={colors.bg.secondary} />}
        ListHeaderComponent={
          <View style={z.hdr}>
            <View style={z.titleRow}>
              <Text style={z.title}>Mounts</Text>
              <Pressable onPress={openPicker} style={[z.charBtn, selectedChar && z.charBtnActive]}>
                {loadingCollected
                  ? <ActivityIndicator size="small" color={colors.gold.primary} />
                  : selectedChar
                    ? <>
                        <Ionicons name="person-circle" size={14} color={colors.gold.primary} />
                        <Text style={z.charBtnText} numberOfLines={1}>{selectedChar.display.split('-')[0]}</Text>
                        <Pressable onPress={clearCharacter} hitSlop={8}>
                          <Ionicons name="close-circle" size={14} color={colors.text.tertiary} />
                        </Pressable>
                      </>
                    : <>
                        <Ionicons name="person-circle-outline" size={14} color={colors.text.secondary} />
                        <Text style={z.charBtnTextDim}>Select Character</Text>
                        <Ionicons name="chevron-down" size={12} color={colors.text.tertiary} />
                      </>
                }
              </Pressable>
            </View>

            {selectedChar && (
              <Card variant="gold" style={z.progCard}>
                <View style={z.progRow}>
                  <ProgressRing collected={collectedIds.size} total={mounts.length} size={76} />
                  <View style={z.progInfo}>
                    <Text style={z.progLabel}>{selectedChar.display.split('-')[0].toUpperCase()}</Text>
                    <Text style={z.progVal}>{collectedIds.size}<Text style={z.progTotal}> / {mounts.length}</Text></Text>
                    <Text style={z.progHint}>{mounts.length - collectedIds.size} not yet collected</Text>
                    <Text style={z.progPct}>{collectedPct}% complete</Text>
                  </View>
                </View>
              </Card>
            )}

            <SearchBar value={search} onChangeText={setSearch} placeholder="Search mounts..." />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={z.chips}>
              {(['all', 'collected', 'missing'] as Filter[]).map(f => (
                <Pressable key={f} onPress={() => setFilter(f)}
                  style={[z.chip, filter === f && z.chipA]}
                  disabled={f !== 'all' && !selectedChar}>
                  <Text style={[z.chipT, filter === f && z.chipTA, f !== 'all' && !selectedChar && z.chipDim]}>
                    {f === 'all' ? 'All' : f === 'collected' ? 'Collected' : 'Missing'}
                  </Text>
                </Pressable>
              ))}
              <View style={z.chipDiv} />
              {srcTypes.map(s => (
                <Pressable key={s} onPress={() => setSrcFilter(srcFilter === s ? null : s)} style={[z.chip, srcFilter === s && z.chipA]}>
                  <View style={[z.srcDot, { backgroundColor: colors.source[s] || colors.text.tertiary }]} />
                  <Text style={[z.chipT, srcFilter === s && z.chipTA]}>{s.replace('_', ' ')}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={z.cnt}>{filtered.length} mount{filtered.length !== 1 ? 's' : ''}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={z.empty}>
            <Ionicons name="search-outline" size={40} color={colors.text.tertiary} />
            <Text style={z.emptyT}>No mounts found</Text>
          </View>
        }
      />

      <MountDetailModal mountId={selected} visible={selected !== null} onClose={() => setSelected(null)} onAddToFarm={addToFarm} />

      {/* Character picker */}
      <Modal visible={charPickerVisible} animationType="slide" transparent onRequestClose={() => setCharPickerVisible(false)}>
        <View style={z.pickerBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setCharPickerVisible(false)} />
          <View style={z.pickerSheet}>
            <View style={z.pickerHandle} />
            <View style={z.pickerHeader}>
              <Text style={z.pickerTitle}>Select Character</Text>
              <Pressable onPress={() => setCharPickerVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text.secondary} />
              </Pressable>
            </View>
            <Text style={z.pickerSub}>Track mount collection progress for a character</Text>

            {loadingPicker ? (
              <View style={z.pickerLoading}><ActivityIndicator size="large" color={colors.gold.primary} /></View>
            ) : (
              <ScrollView style={z.pickerList} showsVerticalScrollIndicator={false}>
                {selectedChar && (
                  <Pressable onPress={() => { clearCharacter(); setCharPickerVisible(false); }} style={z.pickerClear}>
                    <Ionicons name="grid-outline" size={18} color={colors.text.secondary} />
                    <Text style={z.pickerClearT}>Show all mounts (no filter)</Text>
                  </Pressable>
                )}

                {myChars.length > 0 && (
                  <>
                    <Text style={z.pickerSection}>YOUR CHARACTERS</Text>
                    {myChars.map(char => {
                      const isActive = selectedChar?.character_name === char.name?.toLowerCase() && selectedChar?.realm_slug === char.realm_slug;
                      return (
                        <Pressable key={`${char.realm_slug}-${char.name}`}
                          onPress={() => { selectCharacter({ realm_slug: char.realm_slug, character_name: char.name, display: `${char.name}-${char.realm_slug}` }); setCharPickerVisible(false); }}
                          style={[z.favRow, isActive && z.favRowActive]}>
                          <View style={[z.favAvatar, z.favAvatarPh]}>
                            <Ionicons name="person" size={16} color={colors.classColor[char.class_name] || colors.text.tertiary} />
                          </View>
                          <View style={z.favInfo}>
                            <Text style={z.favName}>{char.name}</Text>
                            <Text style={[z.favClass, { color: colors.classColor[char.class_name] || colors.text.secondary }]}>
                              Lv {char.level} · {char.race_name} {char.class_name}
                            </Text>
                            <Text style={z.favRealm}>{char.realm}</Text>
                          </View>
                          {isActive && <Ionicons name="checkmark-circle" size={20} color={colors.gold.primary} />}
                        </Pressable>
                      );
                    })}
                  </>
                )}

                {favorites.length > 0 && (
                  <>
                    <Text style={z.pickerSection}>{myChars.length > 0 ? 'FAVORITES' : 'FAVORITE CHARACTERS'}</Text>
                    {favorites.map(fav => {
                      const isActive = selectedChar?.character_name === fav.character_name && selectedChar?.realm_slug === fav.realm_slug;
                      return (
                        <Pressable key={fav.id}
                          onPress={() => { selectCharacter({ realm_slug: fav.realm_slug, character_name: fav.character_name, display: `${fav.character_name}-${fav.realm_slug}`, avatar_url: fav.avatar_url }); setCharPickerVisible(false); }}
                          style={[z.favRow, isActive && z.favRowActive]}>
                          {fav.avatar_url
                            ? <Image source={{ uri: fav.avatar_url }} style={z.favAvatar} />
                            : <View style={[z.favAvatar, z.favAvatarPh]}><Ionicons name="person" size={16} color={colors.text.tertiary} /></View>
                          }
                          <View style={z.favInfo}>
                            <Text style={z.favName}>{fav.character_name}</Text>
                            <Text style={[z.favClass, { color: colors.classColor[fav.class_name] || colors.text.secondary }]}>
                              {fav.race_name} {fav.class_name}
                            </Text>
                            <Text style={z.favRealm}>{fav.realm_slug}</Text>
                          </View>
                          {fav.is_primary && <View style={z.mainBadge}><Text style={z.mainBadgeT}>MAIN</Text></View>}
                          {isActive && <Ionicons name="checkmark-circle" size={20} color={colors.gold.primary} />}
                        </Pressable>
                      );
                    })}
                  </>
                )}

                {myChars.length === 0 && favorites.length === 0 && !loadingPicker && (
                  <View style={z.pickerEmpty}>
                    <Ionicons name="person-add-outline" size={32} color={colors.text.tertiary} />
                    <Text style={z.pickerEmptyT}>{hasBnet ? 'No characters found' : 'Link Battle.net to auto-load characters'}</Text>
                    <Text style={z.pickerEmptySub}>{hasBnet ? 'Make sure your WoW profile is set to public' : 'Or search a character on the Profile tab and save as a favorite'}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const z = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loadC: { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  loadT: { ...typography.body, color: colors.text.secondary },
  list: { paddingHorizontal: PAD, paddingBottom: 100 },
  hdr: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.display, color: colors.gold.primary },
  charBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.bg.secondary, maxWidth: SW * 0.45 },
  charBtnActive: { borderColor: colors.gold.dim, backgroundColor: colors.gold.muted },
  charBtnText: { fontSize: 12, fontWeight: '600', color: colors.gold.primary, flex: 1 },
  charBtnTextDim: { fontSize: 12, fontWeight: '500', color: colors.text.secondary, flex: 1 },
  progCard: { padding: spacing.lg },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  progInfo: { flex: 1, gap: spacing.xs },
  progLabel: { ...typography.label, color: colors.gold.dim, letterSpacing: 1 },
  progVal: { fontSize: 24, fontWeight: '700', color: colors.text.primary },
  progTotal: { fontSize: 16, fontWeight: '400', color: colors.text.tertiary },
  progHint: { ...typography.caption, color: colors.text.secondary },
  progPct: { fontSize: 11, fontWeight: '700', color: colors.gold.primary },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.full, backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.default },
  chipA: { backgroundColor: colors.gold.muted, borderColor: colors.gold.dim },
  chipT: { fontSize: 11, color: colors.text.secondary, fontWeight: '600', textTransform: 'capitalize' },
  chipTA: { color: colors.gold.primary },
  chipDim: { opacity: 0.4 },
  chipDiv: { width: 1, height: 20, backgroundColor: colors.border.default, alignSelf: 'center' },
  srcDot: { width: 6, height: 6, borderRadius: 3 },
  cnt: { ...typography.caption, color: colors.text.tertiary },
  row: { gap: GAP, marginBottom: GAP },
  empty: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyT: { ...typography.heading, color: colors.text.secondary },
  pickerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,7,14,0.6)' },
  pickerSheet: { backgroundColor: colors.bg.secondary, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, borderTopWidth: 1, borderColor: colors.border.subtle, paddingBottom: 40, maxHeight: '72%' },
  pickerHandle: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border.subtle, alignSelf: 'center', marginTop: spacing.md },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xs },
  pickerTitle: { ...typography.heading },
  pickerSub: { ...typography.caption, color: colors.text.tertiary, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  pickerLoading: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  pickerSection: { ...typography.label, color: colors.text.tertiary, paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  pickerClear: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.default },
  pickerClearT: { ...typography.body, color: colors.text.secondary },
  pickerList: { paddingHorizontal: spacing.xl },
  pickerEmpty: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.md },
  pickerEmptyT: { ...typography.subheading, color: colors.text.secondary, textAlign: 'center' },
  pickerEmptySub: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', lineHeight: 18 },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radii.md, marginBottom: spacing.sm, backgroundColor: colors.bg.tertiary, borderWidth: 1, borderColor: colors.border.default },
  favRowActive: { borderColor: colors.gold.dim, backgroundColor: colors.gold.muted },
  favAvatar: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.bg.elevated },
  favAvatarPh: { alignItems: 'center', justifyContent: 'center' },
  favInfo: { flex: 1, gap: 2 },
  favName: { ...typography.subheading, textTransform: 'capitalize', fontSize: 14 },
  favClass: { ...typography.caption, fontWeight: '600', fontSize: 11 },
  favRealm: { fontSize: 10, color: colors.text.tertiary },
  mainBadge: { backgroundColor: colors.gold.muted, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.gold.dim },
  mainBadgeT: { fontSize: 8, fontWeight: '800', color: colors.gold.primary, letterSpacing: 1 },
});
