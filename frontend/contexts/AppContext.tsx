import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export interface SelectedChar {
  realm_slug: string;
  character_name: string; // always lowercase
  display: string;
  avatar_url?: string | null;
}

interface AppContextType {
  isReady: boolean;
  userId: number | null;
  battletag: string | null;
  hasBnet: boolean;
  selectedChar: SelectedChar | null;
  collectedIds: Set<number>;
  loadingCollected: boolean;
  selectCharacter: (char: SelectedChar) => Promise<void>;
  clearCharacter: () => void;
  refreshMe: () => Promise<void>;
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
      const data = await api.lookupCharacter(char.realm_slug, char.character_name);
      setCollectedIds(new Set((data.mounts || []).map((m: any) => m.mount.id)));
    } catch {
      setCollectedIds(new Set());
    } finally {
      setLoadingCollected(false);
    }
  }, []);

  const selectCharacter = useCallback(async (char: SelectedChar) => {
    const normalized: SelectedChar = { ...char, character_name: char.character_name.toLowerCase() };
    setSelectedChar(normalized);
    await SecureStore.setItemAsync('selected_char', JSON.stringify(normalized));
    await loadCollected(normalized);
  }, [loadCollected]);

  const clearCharacter = useCallback(() => {
    setSelectedChar(null);
    setCollectedIds(new Set());
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
      selectedChar, collectedIds, loadingCollected,
      selectCharacter, clearCharacter, refreshMe,
    }}>
      {children}
    </AppContext.Provider>
  );
}
