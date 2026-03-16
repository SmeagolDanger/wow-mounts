/**
 * API service — all backend communication.
 * Auth via Authorization header, Expo-aware OAuth deep links.
 */

import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';
const DEVICE_ID_KEY = 'device_id';

class ApiService {
  private token: string | null = null;

  async init() {
    try { this.token = await SecureStore.getItemAsync('auth_token'); } catch { this.token = null; }
  }

  setToken(t: string) { this.token = t; }

  async getDeviceId(): Promise<string> {
    let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!id) { id = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`; await SecureStore.setItemAsync(DEVICE_ID_KEY, id); }
    return id;
  }

  private async request<T>(path: string, options: RequestInit = {}, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(url.toString(), { ...options, headers: { ...headers, ...options.headers } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err?.detail === 'string' ? err.detail : typeof err === 'string' ? err : `API error ${res.status}`;
      throw new Error(msg);
    }
    return res.json();
  }

  // ── Auth ────────────────────────────────────────────────
  async deviceAuth(deviceId: string) {
    const data = await this.request<{ token: string; user_id: number; battletag: string | null }>('/auth/device', { method: 'POST' }, { device_id: deviceId });
    this.token = data.token;
    await SecureStore.setItemAsync('auth_token', data.token);
    return data;
  }

  async getBnetLoginUrl() {
    const deviceId = await this.getDeviceId();
    const appCallback = Linking.createURL('auth/callback');
    return this.request<{ authorize_url: string; state: string }>('/auth/bnet/login', {}, { device_id: deviceId, app_redirect: appCallback });
  }

  async getMe() {
    return this.request<{ user_id: number; battletag: string | null; has_bnet: boolean }>('/auth/me');
  }

  // ── Mounts ──────────────────────────────────────────────
  async getMounts() {
    return this.request<{ mounts: MountSummary[]; total: number; cached: boolean }>('/mounts/');
  }

  async getMountIcons(ids: number[]) {
    return this.request<{ icons: Record<string, string | null> }>('/mounts/icons', {}, { ids: ids.join(',') });
  }

  async searchMounts(query: string) {
    return this.request<{ mounts: MountSummary[]; total: number }>('/mounts/search', {}, { q: query });
  }

  async getMountDetail(mountId: number) {
    return this.request<Record<string, any>>(`/mounts/${mountId}`);
  }

  // ── Characters ──────────────────────────────────────────
  async lookupCharacter(realm: string, name: string, region = 'us') {
    return this.request<CharacterLookup>('/characters/lookup', {}, { realm, name, region });
  }

  async getRealms() {
    return this.request<{ realms: Array<{ id: number; name: string; slug: string }> }>('/characters/realms');
  }

  async getFavorites() {
    return this.request<{ characters: FavoriteChar[] }>('/characters/favorites');
  }

  async addFavorite(realmSlug: string, characterName: string, region = 'us') {
    return this.request<{ id: number }>('/characters/favorites', { method: 'POST' }, { realm_slug: realmSlug, character_name: characterName, region });
  }

  async removeFavorite(charId: number) {
    return this.request<{ deleted: boolean }>(`/characters/favorites/${charId}`, { method: 'DELETE' });
  }

  // ── Farm Tasks ──────────────────────────────────────────
  async getFarmTasks() {
    return this.request<{ tasks: FarmTask[]; reset_info: ResetInfo }>('/farm/');
  }

  async createFarmTask(task: Partial<FarmTask>) {
    return this.request<{ id: number; title: string }>('/farm/', { method: 'POST', body: JSON.stringify(task) });
  }

  async toggleFarmTask(taskId: number) {
    return this.request<{ id: number; completed: boolean }>(`/farm/${taskId}/complete`, { method: 'PATCH' });
  }

  async updateFarmTask(taskId: number, data: Partial<FarmTask>) {
    return this.request<{ id: number; updated: boolean }>(`/farm/${taskId}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteFarmTask(taskId: number) {
    return this.request<{ deleted: boolean }>(`/farm/${taskId}`, { method: 'DELETE' });
  }
}

// ── Types ──────────────────────────────────────────────────
export interface MountSummary {
  id: number; name: string; description?: string; source_type?: string;
  faction?: string; icon_url?: string;
}

export interface CharacterLookup {
  name: string; realm: string; realm_slug: string; level: number;
  race: string; class: string; faction: string; avatar_url: string | null;
  mounts: Array<{ mount: { id: number; name: string } }> | null;
  mount_count: number | null;
}

export interface FavoriteChar {
  id: number; realm_slug: string; character_name: string; region: string;
  class_name: string; race_name: string; level: number;
  avatar_url: string | null; is_primary: boolean;
}

export interface FarmTask {
  id: number; title: string; description?: string; mount_id?: number;
  source_type?: string; zone_name?: string; reset_type: string;
  completed: boolean; completed_at?: string; notes?: string; sort_order: number;
}

export interface ResetInfo {
  daily_reset: string; weekly_reset: string; tasks_reset: number;
}

export const api = new ApiService();
export default api;
