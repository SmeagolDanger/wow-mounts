import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { CollectionSummary, ReputationEntry } from '../services/api';

export interface SelectedChar {
  realm_slug: string;
  character_name: string; // always lowercase
  display: string;
  avatar_url?: string | null;
  faction?: string | null; // 'alliance' | 'horde' | null
  class_name?: string | null;
  race_name?: string | null;
}

interface AppContextType {
  isReady: boolean;
  userId: number | null;
  battletag: string | null;
  hasBnet: boolean;
  selectedChar: SelectedChar | null;
  collectedIds: Set<number>;
  collectedPetIds: Set<number>;
  collectedToyIds: Set<number>;
  collectedTitleIds: Set<number>;
  collectedHeirloomIds: Set<number>;
  transmogCount: number;
  recipeCount: number;
  achievementCount: number;
  achievementPoints: number;
  collectionSummary: CollectionSummary | null;
  loadingCollected: boolean;
  // Detailed character data for requirement checking
  characterClass: string | null;
  characterRace: string | null;
  reputationStandings: Map<number, { name: string; standing: string }>;
  completedAchievementIds: Set<number>;
  characterProfessions: Set<string>;
  selectCharacter: (char: SelectedChar) => Promise<void>;
  clearCharacter: () => void;
  refreshMe: () => Promise<void>;
  refreshCollections: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [battletag, setBattletag] = useState<string | null>(null);
  const [hasBnet, setHasBnet] = useState(false);
  const [selectedChar, setSelectedChar] = useState<SelectedChar | null>(null);
  const [collectedIds, setCollectedIds] = useState<Set<number>>(new Set());
  const [collectedPetIds, setCollectedPetIds] = useState<Set<number>>(new Set());
  const [collectedToyIds, setCollectedToyIds] = useState<Set<number>>(new Set());
  const [collectedTitleIds, setCollectedTitleIds] = useState<Set<number>>(new Set());
  const [collectedHeirloomIds, setCollectedHeirloomIds] = useState<Set<number>>(new Set());
  const [transmogCount, setTransmogCount] = useState(0);
  const [recipeCount, setRecipeCount] = useState(0);
  const [achievementCount, setAchievementCount] = useState(0);
  const [achievementPoints, setAchievementPoints] = useState(0);
  const [collectionSummary, setCollectionSummary] = useState<CollectionSummary | null>(null);
  const [loadingCollected, setLoadingCollected] = useState(false);
  const [characterClass, setCharacterClass] = useState<string | null>(null);
  const [characterRace, setCharacterRace] = useState<string | null>(null);
  const [reputationStandings, setReputationStandings] = useState<Map<number, { name: string; standing: string }>>(new Map());
  const [completedAchievementIds, setCompletedAchievementIds] = useState<Set<number>>(new Set());
  const [characterProfessions, setCharacterProfessions] = useState<Set<string>>(new Set());
  const init = useRef(false);

  const refreshMe = useCallback(async () => {
    try {
      const me = await api.getMe();
      setUserId(me.user_id);
      setBattletag(me.battletag);
      setHasBnet(me.has_bnet);
    } catch {}
  }, []);

  const loadCollected = useCallback(async (char: SelectedChar) => {
    setLoadingCollected(true);
    try {
      // Fetch mounts + summary in parallel
      const [mountData, summary] = await Promise.all([
        api.lookupCharacter(char.realm_slug, char.character_name),
        api.getCollectionSummary(char.realm_slug, char.character_name).catch(() => null),
      ]);
      setCollectedIds(new Set((mountData.mounts || []).map((m: any) => m.mount.id)));
      if (summary) setCollectionSummary(summary);

      // Extract class and race from the lookup response
      if (mountData.class) setCharacterClass(mountData.class);
      if (mountData.race) setCharacterRace(mountData.race);

      // Load other collections in the background (non-blocking)
      Promise.allSettled([
        api.getCharacterPets(char.realm_slug, char.character_name),
        api.getCharacterToys(char.realm_slug, char.character_name),
        api.getCharacterTitles(char.realm_slug, char.character_name),
        api.getCharacterHeirlooms(char.realm_slug, char.character_name),
        api.getCharacterAchievements(char.realm_slug, char.character_name),
        api.getCharacterTransmog(char.realm_slug, char.character_name),
        api.getCharacterProfessions(char.realm_slug, char.character_name),
        api.getCharacterReputations(char.realm_slug, char.character_name),
      ]).then(([pets, toys, titles, heirlooms, achievements, transmog, professions, reputations]) => {
        if (pets.status === 'fulfilled') setCollectedPetIds(new Set(pets.value.pets.map(p => p.species_id)));
        if (toys.status === 'fulfilled') setCollectedToyIds(new Set(toys.value.toys.map(t => t.id)));
        if (titles.status === 'fulfilled') setCollectedTitleIds(new Set(titles.value.titles.map(t => t.id)));
        if (heirlooms.status === 'fulfilled') setCollectedHeirloomIds(new Set(heirlooms.value.heirlooms.map(h => h.id)));
        if (achievements.status === 'fulfilled') {
          setAchievementCount(achievements.value.total_quantity);
          setAchievementPoints(achievements.value.total_points);
          // Store individual completed achievement IDs
          setCompletedAchievementIds(new Set(
            achievements.value.achievements
              .filter(a => a.completed_timestamp)
              .map(a => a.id)
          ));
        }
        if (transmog.status === 'fulfilled') setTransmogCount(transmog.value.appearance_count);
        if (professions.status === 'fulfilled') {
          setRecipeCount(professions.value.total_recipes);
          // Store profession names for requirement checking
          const profNames = new Set<string>();
          for (const p of [...professions.value.primaries, ...professions.value.secondaries]) {
            profNames.add(p.name.toLowerCase());
          }
          setCharacterProfessions(profNames);
        }
        if (reputations.status === 'fulfilled') {
          const repMap = new Map<number, { name: string; standing: string }>();
          for (const r of reputations.value.reputations) {
            if (r.faction_id && r.standing_name) {
              repMap.set(r.faction_id, { name: r.faction_name, standing: r.standing_name });
            }
          }
          setReputationStandings(repMap);
        }
      });
    } catch {
      setCollectedIds(new Set());
    } finally {
      setLoadingCollected(false);
    }
  }, []);

  const refreshCollections = useCallback(async () => {
    if (selectedChar) await loadCollected(selectedChar);
  }, [selectedChar, loadCollected]);

  const selectCharacter = useCallback(async (char: SelectedChar) => {
    const normalized: SelectedChar = { ...char, character_name: char.character_name.toLowerCase() };
    setSelectedChar(normalized);
    await SecureStore.setItemAsync('selected_char', JSON.stringify(normalized));
    await loadCollected(normalized);
  }, [loadCollected]);

  const clearCharacter = useCallback(() => {
    setSelectedChar(null);
    setCollectedIds(new Set());
    setCollectedPetIds(new Set());
    setCollectedToyIds(new Set());
    setCollectedTitleIds(new Set());
    setCollectedHeirloomIds(new Set());
    setTransmogCount(0);
    setRecipeCount(0);
    setAchievementCount(0);
    setAchievementPoints(0);
    setCollectionSummary(null);
    setCharacterClass(null);
    setCharacterRace(null);
    setReputationStandings(new Map());
    setCompletedAchievementIds(new Set());
    setCharacterProfessions(new Set());
    SecureStore.deleteItemAsync('selected_char').catch(() => {});
  }, []);

  useEffect(() => {
    if (init.current) return;
    init.current = true;
    (async () => {
      await api.init();
      try {
        const me = await api.getMe();
        setUserId(me.user_id);
        setBattletag(me.battletag);
        setHasBnet(me.has_bnet);
      } catch {
        const deviceId = await api.getDeviceId();
        await api.deviceAuth(deviceId);
      }
      try {
        const saved = await SecureStore.getItemAsync('selected_char');
        if (saved) {
          const char = JSON.parse(saved) as SelectedChar;
          setSelectedChar(char);
          loadCollected(char); // fire and forget — don't delay ready
        } else {
          // No saved character — try to auto-select primary favorite
          try {
            const favs = await api.getFavorites();
            const primary = favs.characters.find(c => c.is_primary) || favs.characters[0];
            if (primary) {
              const char: SelectedChar = {
                realm_slug: primary.realm_slug,
                character_name: primary.character_name,
                display: `${primary.character_name}-${primary.realm_slug}`,
                avatar_url: primary.avatar_url,
              };
              setSelectedChar(char);
              await SecureStore.setItemAsync('selected_char', JSON.stringify(char));
              loadCollected(char);
            }
          } catch {}
        }
      } catch {}
      setIsReady(true);
    })();
  }, [loadCollected]);

  return (
    <AppContext.Provider value={{
      isReady, userId, battletag, hasBnet,
      selectedChar, collectedIds, collectedPetIds, collectedToyIds,
      collectedTitleIds, collectedHeirloomIds, transmogCount, recipeCount,
      achievementCount, achievementPoints, collectionSummary,
      loadingCollected,
      characterClass, characterRace, reputationStandings, completedAchievementIds, characterProfessions,
      selectCharacter, clearCharacter, refreshMe, refreshCollections,
    }}>
      {children}
    </AppContext.Provider>
  );
}
