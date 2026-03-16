/**
 * Profile Tab — Character search, favorites management, Battle.net linking.
 *
 * Features:
 * - Character search by realm + name
 * - Favorite characters list
 * - Battle.net OAuth linking
 * - Character card with class color, avatar, mount count
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { colors, spacing, typography, radii, shadows } from '../../theme';
import Card from '../../components/Card';
import api from '../../services/api';

// WoW class colors
const classColors: Record<string, string> = {
  Warrior: '#C79C6E',
  Paladin: '#F58CBA',
  Hunter: '#ABD473',
  Rogue: '#FFF569',
  Priest: '#FFFFFF',
  'Death Knight': '#C41F3B',
  Shaman: '#0070DE',
  Mage: '#69CCF0',
  Warlock: '#9482C9',
  Monk: '#00FF96',
  Druid: '#FF7D0A',
  'Demon Hunter': '#A330C9',
  Evoker: '#33937F',
};

interface FavoriteChar {
  id: number;
  realm_slug: string;
  character_name: string;
  region: string;
  class_name: string;
  race_name: string;
  level: number;
  avatar_url: string | null;
  is_primary: boolean;
}

interface LookupResult {
  name: string;
  realm: string;
  realm_slug: string;
  level: number;
  race: string;
  class: string;
  faction: string;
  avatar_url: string | null;
  mount_count: number | null;
}

export default function ProfileScreen() {
  const [favorites, setFavorites] = useState<FavoriteChar[]>([]);
  const [hasBnet, setHasBnet] = useState(false);
  const [battletag, setBattletag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Search state
  const [realm, setRealm] = useState('');
  const [charName, setCharName] = useState('');
  const [searching, setSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);

  // ── Load Data ───────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    try {
      const [me, favs] = await Promise.all([api.getMe(), api.getFavorites()]);
      setHasBnet(me.has_bnet);
      setBattletag(me.battletag);
      setFavorites(favs.characters);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Reload profile every time this tab gains focus.
  // This catches the case where the user just completed OAuth
  // and the deep link handler stored a new token.
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  // ── Character Search ────────────────────────────────────────
  const handleSearch = async () => {
    if (!realm.trim() || !charName.trim()) return;

    setSearching(true);
    setLookupResult(null);
    try {
      const result = await api.lookupCharacter(realm.trim().toLowerCase(), charName.trim());
      setLookupResult(result);
    } catch (err: any) {
      Alert.alert('Not Found', err.message || 'Character not found. Check realm and name.');
    } finally {
      setSearching(false);
    }
  };

  const handleAddFavorite = async () => {
    if (!lookupResult) return;
    try {
      await api.addFavorite(lookupResult.realm_slug, lookupResult.name);
      await loadProfile();
      setLookupResult(null);
      setRealm('');
      setCharName('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add favorite');
    }
  };

  const handleRemoveFavorite = (charId: number, name: string) => {
    Alert.alert('Remove Favorite', `Remove ${name} from favorites?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.removeFavorite(charId);
            setFavorites((prev) => prev.filter((c) => c.id !== charId));
          } catch (err) {
            console.error('Failed to remove favorite:', err);
          }
        },
      },
    ]);
  };

  // ── Battle.net Link ─────────────────────────────────────────
  const handleBnetLink = async () => {
    try {
      const { authorize_url } = await api.getBnetLoginUrl();
      Linking.openURL(authorize_url);
    } catch (err) {
      Alert.alert('Error', 'Failed to initiate Battle.net login');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {/* ── Battle.net Card ─────────────────────────────────── */}
        <Card variant={hasBnet ? 'gold' : 'default'}>
          <View style={styles.bnetCard}>
            <Ionicons
              name={hasBnet ? 'shield-checkmark' : 'shield-outline'}
              size={28}
              color={hasBnet ? colors.gold.primary : colors.text.tertiary}
            />
            <View style={styles.bnetInfo}>
              {hasBnet ? (
                <>
                  <Text style={styles.bnetTag}>{battletag}</Text>
                  <Text style={styles.bnetStatus}>Battle.net linked</Text>
                </>
              ) : (
                <>
                  <Text style={styles.bnetTag}>Link Battle.net</Text>
                  <Text style={styles.bnetStatus}>Optional — enables private profile access</Text>
                </>
              )}
            </View>
            {!hasBnet && (
              <Pressable onPress={handleBnetLink} style={styles.linkBtn}>
                <Text style={styles.linkBtnText}>Link</Text>
              </Pressable>
            )}
          </View>
        </Card>

        {/* ── Character Search ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Character</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.searchInput, { flex: 2 }]}
              value={realm}
              onChangeText={setRealm}
              placeholder="Realm (e.g. area-52)"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={[styles.searchInput, { flex: 3 }]}
              value={charName}
              onChangeText={setCharName}
              placeholder="Character name"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSearch}
            />
            <Pressable
              onPress={handleSearch}
              style={[styles.searchBtn, (!realm.trim() || !charName.trim()) && styles.searchBtnDisabled]}
              disabled={!realm.trim() || !charName.trim() || searching}
            >
              {searching ? (
                <ActivityIndicator size="small" color={colors.bg.primary} />
              ) : (
                <Ionicons name="search" size={18} color={colors.bg.primary} />
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Search Result ───────────────────────────────────── */}
        {lookupResult && (
          <Card variant="arcane" style={styles.resultCard}>
            <View style={styles.resultRow}>
              {lookupResult.avatar_url ? (
                <Image source={{ uri: lookupResult.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={24} color={colors.text.tertiary} />
                </View>
              )}
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{lookupResult.name}</Text>
                <Text style={styles.resultMeta}>
                  Level {lookupResult.level}{' '}
                  <Text style={{ color: classColors[lookupResult.class] || colors.text.primary }}>
                    {lookupResult.race} {lookupResult.class}
                  </Text>
                </Text>
                <Text style={styles.resultRealm}>{lookupResult.realm}</Text>
                {lookupResult.mount_count != null && (
                  <Text style={styles.resultMounts}>
                    <Ionicons name="trophy" size={12} color={colors.gold.dim} />{' '}
                    {lookupResult.mount_count} mounts
                  </Text>
                )}
              </View>
              <Pressable onPress={handleAddFavorite} style={styles.favBtn}>
                <Ionicons name="heart-outline" size={22} color={colors.fire.primary} />
              </Pressable>
            </View>
          </Card>
        )}

        {/* ── Favorites ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Favorite Characters{' '}
            <Text style={styles.sectionCount}>({favorites.length})</Text>
          </Text>

          {favorites.length === 0 && !loading ? (
            <View style={styles.emptyFavs}>
              <Ionicons name="heart-outline" size={32} color={colors.text.tertiary} />
              <Text style={styles.emptyText}>No favorite characters yet</Text>
              <Text style={styles.emptyHint}>Search for a character above to add them</Text>
            </View>
          ) : (
            <View style={styles.favList}>
              {favorites.map((char) => {
                const classColor = classColors[char.class_name] || colors.text.primary;
                return (
                  <Card key={char.id} variant={char.is_primary ? 'gold' : 'default'} onPress={() => {}}>
                    <View style={styles.favRow}>
                      {char.avatar_url ? (
                        <Image source={{ uri: char.avatar_url }} style={styles.favAvatar} />
                      ) : (
                        <View style={[styles.favAvatar, styles.avatarPlaceholder]}>
                          <Ionicons name="person" size={20} color={colors.text.tertiary} />
                        </View>
                      )}
                      <View style={styles.favInfo}>
                        <Text style={styles.favName}>{char.character_name}</Text>
                        <Text style={[styles.favClass, { color: classColor }]}>
                          {char.race_name} {char.class_name}
                        </Text>
                        <Text style={styles.favRealm}>{char.realm_slug}</Text>
                      </View>
                      <View style={styles.favActions}>
                        {char.is_primary && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryText}>MAIN</Text>
                          </View>
                        )}
                        <Pressable
                          onPress={() => handleRemoveFavorite(char.id, char.character_name)}
                          hitSlop={8}
                        >
                          <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
                        </Pressable>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 100,
    gap: spacing.xl,
  },
  title: {
    ...typography.display,
    color: colors.frost.primary,
  },
  // ── Battle.net ────────────────────────────────────────────
  bnetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  bnetInfo: {
    flex: 1,
    gap: 2,
  },
  bnetTag: {
    ...typography.subheading,
  },
  bnetStatus: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  linkBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.gold.primary,
  },
  linkBtnText: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.bg.primary,
  },
  // ── Search ────────────────────────────────────────────────
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
  },
  sectionCount: {
    color: colors.text.tertiary,
    fontWeight: '400',
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.bg.input,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    height: 44,
    fontSize: 14,
    color: colors.text.primary,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.4,
  },
  // ── Result ────────────────────────────────────────────────
  resultCard: {
    marginTop: -spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.bg.tertiary,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    ...typography.subheading,
    fontSize: 17,
  },
  resultMeta: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  resultRealm: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.tertiary,
  },
  resultMounts: {
    ...typography.caption,
    color: colors.gold.dim,
    marginTop: 2,
  },
  favBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.fire.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Favorites ─────────────────────────────────────────────
  emptyFavs: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.subheading,
    color: colors.text.secondary,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  favList: {
    gap: spacing.sm,
  },
  favRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  favAvatar: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.bg.tertiary,
  },
  favInfo: {
    flex: 1,
    gap: 1,
  },
  favName: {
    ...typography.subheading,
    textTransform: 'capitalize',
    fontSize: 15,
  },
  favClass: {
    ...typography.caption,
    fontWeight: '600',
  },
  favRealm: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.tertiary,
  },
  favActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  primaryBadge: {
    backgroundColor: colors.gold.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.gold.dim,
  },
  primaryText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.gold.primary,
    letterSpacing: 1,
  },
});
