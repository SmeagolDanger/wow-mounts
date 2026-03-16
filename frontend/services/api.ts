/**
 * API service — handles all communication with the backend.
 *
 * Auth is sent via the Authorization header (preferred) rather than
 * query params to avoid token leakage in server logs and browser history.
 */

import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';
const DEVICE_ID_KEY = 'device_id';

class ApiService {
  private token: string | null = null;

  async init() {
    try {
      this.token = await SecureStore.getItemAsync('auth_token');
    } catch {
      this.token = null;
    }
  }

  /** Set token directly (used by deep link callback). */
  setToken(token: string) {
    this.token = token;
  }

  /** Get or create a stable device ID. */
  async getDeviceId(): Promise<string> {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    params: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Send auth via header, not query param
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url.toString(), {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `API error ${res.status}`);
    }

    return res.json();
  }

  // ── Auth ────────────────────────────────────────────────────

  async deviceAuth(deviceId: string) {
    const data = await this.request<{ token: string; user_id: number; battletag: string | null }>(
      '/auth/device',
      { method: 'POST' },
      { device_id: deviceId }
    );
    this.token = data.token;
    await SecureStore.setItemAsync('auth_token', data.token);
    return data;
  }

  async getBnetLoginUrl() {
    // Pass device_id so the backend can encode it in the OAuth state.
    // This lets the callback link the Battle.net account to our anonymous user.
    const deviceId = await this.getDeviceId();
    return this.request<{ authorize_url: string; state: string }>(
      '/auth/bnet/login',
      {},
      { device_id: deviceId }
    );
  }

  // Note: bnetCallback is no longer needed — the backend handles the
  // Battle.net redirect and sends the user back via deep link
  // (wowmounts://auth/callback?token=xxx). The root layout catches it.

  async getMe() {
    return this.request<{ user_id: number; battletag: string | null; has_bnet: boolean }>('/auth/me');
  }

  // ── Mounts ──────────────────────────────────────────────────

  async getMounts() {
    return this.request<{
      mounts: Array<{
        id: number;
        name: string;
        description?: string;
        source_type?: string;
        faction?: string;
        icon_url?: string;
        creature_display_id?: number;
      }>;
      total: number;
      cached: boolean;
    }>('/mounts/');
  }

  async searchMounts(query: string) {
    return this.request<{
      mounts: Array<{ id: number; name: string; description?: string; source_type?: string; icon_url?: string }>;
      total: number;
    }>('/mounts/search', {}, { q: query });
  }

  async getMountDetail(mountId: number) {
    return this.request<Record<string, any>>(`/mounts/${mountId}`);
  }

  // ── Characters ──────────────────────────────────────────────

  async lookupCharacter(realm: string, name: string, region = 'us') {
    return this.request<{
      name: string;
      realm: string;
      realm_slug: string;
      level: number;
      race: string;
      class: string;
      faction: string;
      avatar_url: string | null;
      mounts: Array<{ mount: { id: number; name: string } }> | null;
      mount_count: number | null;
    }>('/characters/lookup', {}, { realm, name, region });
  }

  async getRealms() {
    return this.request<{
      realms: Array<{ id: number; name: string; slug: string }>;
    }>('/characters/realms');
  }

  async getFavorites() {
    return this.request<{
      characters: Array<{
        id: number;
        realm_slug: string;
        character_name: string;
        region: string;
        class_name: string;
        race_name: string;
        level: number;
        avatar_url: string | null;
        is_primary: boolean;
      }>;
    }>('/characters/favorites');
  }

  async addFavorite(realmSlug: string, characterName: string, region = 'us') {
    return this.request<{ id: number }>(
      '/characters/favorites',
      { method: 'POST' },
      { realm_slug: realmSlug, character_name: characterName, region }
    );
  }

  async removeFavorite(charId: number) {
    return this.request<{ deleted: boolean }>(`/characters/favorites/${charId}`, { method: 'DELETE' });
  }

  // ── Farm Tasks ──────────────────────────────────────────────

  async getFarmTasks() {
    return this.request<{
      tasks: Array<{
        id: number;
        title: string;
        description?: string;
        mount_id?: number;
        source_type?: string;
        zone_name?: string;
        reset_type: string;
        completed: boolean;
        completed_at?: string;
        notes?: string;
        sort_order: number;
      }>;
      reset_info: {
        daily_reset: string;
        weekly_reset: string;
        tasks_reset: number;
      };
    }>('/farm/');
  }

  async createFarmTask(task: {
    title: string;
    description?: string;
    mount_id?: number;
    source_type?: string;
    zone_name?: string;
    reset_type?: string;
    notes?: string;
  }) {
    return this.request<{ id: number; title: string }>(
      '/farm/',
      { method: 'POST', body: JSON.stringify(task) }
    );
  }

  async toggleFarmTask(taskId: number) {
    return this.request<{ id: number; completed: boolean }>(
      `/farm/${taskId}/complete`,
      { method: 'PATCH' }
    );
  }

  async updateFarmTask(taskId: number, data: Record<string, any>) {
    return this.request<{ id: number; updated: boolean }>(
      `/farm/${taskId}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
  }

  async deleteFarmTask(taskId: number) {
    return this.request<{ deleted: boolean }>(`/farm/${taskId}`, { method: 'DELETE' });
  }
}

export const api = new ApiService();
export default api;
