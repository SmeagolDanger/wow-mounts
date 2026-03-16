/**
 * Profile Tab — Character search, favorites, Battle.net linking.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  Image, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import Card from '../../components/Card';
import api, { FavoriteChar } from '../../services/api';

interface LookupResult {
  name: string; realm: string; realm_slug: string; level: number;
  race: string; class: string; faction: string; avatar_url: string | null; mount_count: number | null;
}

export default function ProfileScreen() {
  const [favorites, setFavorites] = useState<FavoriteChar[]>([]);
  const [hasBnet, setHasBnet] = useState(false);
  const [battletag, setBattletag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [realm, setRealm] = useState('');
  const [charName, setCharName] = useState('');
  const [searching, setSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const [me, favs] = await Promise.all([api.getMe(), api.getFavorites()]);
      setHasBnet(me.has_bnet);
      setBattletag(me.battletag);
      setFavorites(favs.characters);
    } catch {
      // Auth may not be ready yet — will retry on next focus
    } finally { setLoading(false); }
  }, []);

  // Reload on every focus — catches OAuth returns
  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const handleSearch = async () => {
    if (!realm.trim() || !charName.trim()) return;
    setSearching(true); setLookupResult(null);
    try { setLookupResult(await api.lookupCharacter(realm.trim().toLowerCase(), charName.trim())); }
    catch (err: any) { Alert.alert('Not Found', err.message || 'Check realm and name.'); }
    finally { setSearching(false); }
  };

  const handleAddFavorite = async () => {
    if (!lookupResult) return;
    try { await api.addFavorite(lookupResult.realm_slug, lookupResult.name); await loadProfile(); setLookupResult(null); setRealm(''); setCharName(''); }
    catch (err: any) { Alert.alert('Error', err.message); }
  };

  const handleRemoveFavorite = (id: number, name: string) => {
    Alert.alert('Remove', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { try { await api.removeFavorite(id); setFavorites((p) => p.filter((c) => c.id !== id)); } catch {} } },
    ]);
  };

  const handleBnetLink = async () => {
    try { const { authorize_url } = await api.getBnetLoginUrl(); Linking.openURL(authorize_url); }
    catch { Alert.alert('Error', 'Failed to start Battle.net login'); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {/* Battle.net */}
        <Card variant={hasBnet ? 'gold' : 'default'}>
          <View style={styles.bnetRow}>
            <Ionicons name={hasBnet ? 'shield-checkmark' : 'shield-outline'} size={28} color={hasBnet ? colors.gold.primary : colors.text.tertiary} />
            <View style={styles.bnetInfo}>
              <Text style={styles.bnetTag}>{hasBnet ? battletag : 'Link Battle.net'}</Text>
              <Text style={styles.bnetSub}>{hasBnet ? 'Account linked' : 'Optional — enables private profiles'}</Text>
            </View>
            {!hasBnet && <Pressable onPress={handleBnetLink} style={styles.linkBtn}><Text style={styles.linkBtnText}>Link</Text></Pressable>}
          </View>
        </Card>

        {/* Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Character</Text>
          <View style={styles.searchRow}>
            <TextInput style={[styles.searchInput, { flex: 2 }]} value={realm} onChangeText={setRealm} placeholder="Realm slug" placeholderTextColor={colors.text.tertiary} autoCapitalize="none" autoCorrect={false} />
            <TextInput style={[styles.searchInput, { flex: 3 }]} value={charName} onChangeText={setCharName} placeholder="Character name" placeholderTextColor={colors.text.tertiary} autoCapitalize="none" autoCorrect={false} onSubmitEditing={handleSearch} />
            <Pressable onPress={handleSearch} style={[styles.searchBtn, (!realm.trim() || !charName.trim()) && styles.searchBtnOff]} disabled={!realm.trim() || !charName.trim() || searching}>
              {searching ? <ActivityIndicator size="small" color={colors.bg.primary} /> : <Ionicons name="search" size={18} color={colors.bg.primary} />}
            </Pressable>
          </View>
        </View>

        {/* Result */}
        {lookupResult && (
          <Card variant="arcane">
            <View style={styles.resultRow}>
              {lookupResult.avatar_url ? <Image source={{ uri: lookupResult.avatar_url }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarEmpty]}><Ionicons name="person" size={24} color={colors.text.tertiary} /></View>}
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{lookupResult.name}</Text>
                <Text style={styles.resultMeta}>Lv {lookupResult.level} <Text style={{ color: colors.classColor[lookupResult.class] || colors.text.primary }}>{lookupResult.race} {lookupResult.class}</Text></Text>
                <Text style={styles.resultRealm}>{lookupResult.realm}</Text>
                {lookupResult.mount_count != null && <Text style={styles.resultMounts}>{lookupResult.mount_count} mounts</Text>}
              </View>
              <Pressable onPress={handleAddFavorite} style={styles.favBtn}><Ionicons name="heart-outline" size={22} color={colors.fire.primary} /></Pressable>
            </View>
          </Card>
        )}

        {/* Favorites */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorites <Text style={styles.sectionCount}>({favorites.length})</Text></Text>
          {favorites.length === 0 && !loading ? (
            <View style={styles.emptyFavs}><Ionicons name="heart-outline" size={32} color={colors.text.tertiary} /><Text style={styles.emptyText}>No favorites yet</Text></View>
          ) : (
            <View style={styles.favList}>
              {favorites.map((c) => (
                <Card key={c.id} variant={c.is_primary ? 'gold' : 'default'}>
                  <View style={styles.favRow}>
                    {c.avatar_url ? <Image source={{ uri: c.avatar_url }} style={styles.favAvatar} /> : <View style={[styles.favAvatar, styles.avatarEmpty]}><Ionicons name="person" size={20} color={colors.text.tertiary} /></View>}
                    <View style={styles.favInfo}>
                      <Text style={styles.favName}>{c.character_name}</Text>
                      <Text style={[styles.favClass, { color: colors.classColor[c.class_name] || colors.text.primary }]}>{c.race_name} {c.class_name}</Text>
                      <Text style={styles.favRealm}>{c.realm_slug}</Text>
                    </View>
                    <View style={styles.favActions}>
                      {c.is_primary && <View style={styles.mainBadge}><Text style={styles.mainText}>MAIN</Text></View>}
                      <Pressable onPress={() => handleRemoveFavorite(c.id, c.character_name)} hitSlop={8}><Ionicons name="close-circle" size={20} color={colors.text.tertiary} /></Pressable>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 100, gap: spacing.xl },
  title: { ...typography.display, color: colors.frost.primary },

  bnetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  bnetInfo: { flex: 1, gap: 2 },
  bnetTag: { ...typography.subheading },
  bnetSub: { ...typography.caption, color: colors.text.secondary },
  linkBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.gold.primary },
  linkBtnText: { fontWeight: '700', fontSize: 13, color: colors.bg.primary },

  section: { gap: spacing.md },
  sectionTitle: { ...typography.heading },
  sectionCount: { color: colors.text.tertiary, fontWeight: '400' },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  searchInput: { backgroundColor: colors.bg.input, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.md, height: 44, fontSize: 14, color: colors.text.primary },
  searchBtn: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.gold.primary, alignItems: 'center', justifyContent: 'center' },
  searchBtnOff: { opacity: 0.4 },

  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.bg.tertiary },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  resultInfo: { flex: 1, gap: 2 },
  resultName: { ...typography.subheading, fontSize: 17 },
  resultMeta: { ...typography.caption, color: colors.text.secondary },
  resultRealm: { ...typography.caption, fontSize: 11, color: colors.text.tertiary },
  resultMounts: { ...typography.caption, color: colors.gold.dim, marginTop: 2 },
  favBtn: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.fire.muted, alignItems: 'center', justifyContent: 'center' },

  emptyFavs: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.md },
  emptyText: { ...typography.subheading, color: colors.text.secondary },
  favList: { gap: spacing.sm },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  favAvatar: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.bg.tertiary },
  favInfo: { flex: 1, gap: 1 },
  favName: { ...typography.subheading, textTransform: 'capitalize', fontSize: 15 },
  favClass: { ...typography.caption, fontWeight: '600' },
  favRealm: { ...typography.caption, fontSize: 11, color: colors.text.tertiary },
  favActions: { alignItems: 'flex-end', gap: spacing.sm },
  mainBadge: { backgroundColor: colors.gold.muted, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.gold.dim },
  mainText: { fontSize: 9, fontWeight: '800', color: colors.gold.primary, letterSpacing: 1 },
});
