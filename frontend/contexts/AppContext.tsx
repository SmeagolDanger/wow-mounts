import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { CollectionSummary } from '../services/api';

export interface SelectedChar {
  realm_slug: string;
  character_name: string; // always lowercase
  display: string;
  avatar_url?: string | null;
  faction?: string | null; // 'alliance' | 'horde' | null
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
  achievementCount: number;
  achievementPoints: number;
  collectionSummary: CollectionSummary | null;
  loadingCollected: boolean;
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
  const [achievementCount, setAchievementCount] = useState(0);
  const [achievementPoints, setAchievementPoints] = useState(0);
  const [collectionSummary, setCollectionSummary] = useState<CollectionSummary | null>(null);
  const [loadingCollected, setLoadingCollected] = useState(false);
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

      // Load other collections in the background (non-blocking)
      Promise.allSettled([
        api.getCharacterPets(char.realm_slug, char.character_name),
        api.getCharacterToys(char.realm_slug, char.character_name),
        api.getCharacterTitles(char.realm_slug, char.character_name),
        api.getCharacterHeirlooms(char.realm_slug, char.character_name),
        api.getCharacterAchievements(char.realm_slug, char.character_name),
      ]).then(([pets, toys, titles, heirlooms, achievements]) => {
        if (pets.status === 'fulfilled') setCollectedPetIds(new Set(pets.value.pets.map(p => p.species_id)));
        if (toys.status === 'fulfilled') setCollectedToyIds(new Set(toys.value.toys.map(t => t.id)));
        if (titles.status === 'fulfilled') setCollectedTitleIds(new Set(titles.value.titles.map(t => t.id)));
        if (heirlooms.status === 'fulfilled') setCollectedHeirloomIds(new Set(heirlooms.value.heirlooms.map(h => h.id)));
        if (achievements.status === 'fulfilled') {
          setAchievementCount(achievements.value.total_quantity);
          setAchievementPoints(achievements.value.total_points);
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
    setAchievementCount(0);
    setAchievementPoints(0);
    setCollectionSummary(null);
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
        }
      } catch {}
      setIsReady(true);
    })();
  }, [loadCollected]);

  return (
    <AppContext.Provider value={{
      isReady, userId, battletag, hasBnet,
      selectedChar, collectedIds, collectedPetIds, collectedToyIds,
      collectedTitleIds, collectedHeirloomIds,
      achievementCount, achievementPoints, collectionSummary,
      loadingCollected, selectCharacter, clearCharacter, refreshMe, refreshCollections,
    }}>
      {children}
    </AppContext.Provider>
  );
}
