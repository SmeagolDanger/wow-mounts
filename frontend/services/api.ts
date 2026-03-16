/**
 * API service — handles all communication with the backend.
 */

import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiService {
  private token: string | null = null;

  async init() {
    try {
      this.token = await SecureStore.getItemAsync('auth_token');
    } catch {
      this.token = null;
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    params: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);

    // Add token to query params if available
    if (this.token) {
      params.token = this.token;
    }
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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
    return this.request<{ authorize_url: string; state: string }>('/auth/bnet/login');
  }

  async bnetCallback(code: string, deviceId?: string) {
    const params: Record<string, string> = { code };
    if (deviceId) params.device_id = deviceId;

    const data = await this.request<{ token: string; user_id: number; battletag: string; has_bnet: boolean }>(
      '/auth/bnet/callback',
      { method: 'POST' },
      params
    );
    this.token = data.token;
    await SecureStore.setItemAsync('auth_token', data.token);
    return data;
  }

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
