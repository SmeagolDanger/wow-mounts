import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiService {
  private token: string | null = null;
  async init() { try { this.token = await SecureStore.getItemAsync('auth_token'); } catch { this.token = null; } }
  setToken(t: string) { this.token = t; }
  async getDeviceId(): Promise<string> {
    let id = await SecureStore.getItemAsync('device_id');
    if (!id) { id = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`; await SecureStore.setItemAsync('device_id', id); }
    return id;
  }
  private async request<T>(path: string, opts: RequestInit = {}, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(url.toString(), { ...opts, headers: { ...h, ...opts.headers } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(typeof err?.detail === 'string' ? err.detail : `API error ${res.status}`);
    }
    return res.json();
  }
  async deviceAuth(did: string) { const d = await this.request<{token:string;user_id:number;battletag:string|null}>('/auth/device',{method:'POST'},{device_id:did}); this.token=d.token; await SecureStore.setItemAsync('auth_token',d.token); return d; }
  async getBnetLoginUrl() { const did=await this.getDeviceId(); const cb=Linking.createURL('auth/callback'); return this.request<{authorize_url:string;state:string}>('/auth/bnet/login',{},{device_id:did,app_redirect:cb}); }
  async getMe() { return this.request<{user_id:number;battletag:string|null;has_bnet:boolean}>('/auth/me'); }
  async getMounts() { return this.request<{mounts:MountSummary[];total:number;cached:boolean}>('/mounts/'); }
  async getMountIcons(ids:number[]) { return this.request<{icons:Record<string,string|null>}>('/mounts/icons',{},{ids:ids.join(',')}); }
  async searchMounts(q:string) { return this.request<{mounts:MountSummary[];total:number}>('/mounts/search',{},{q}); }
  async getMountDetail(id:number) { return this.request<any>(`/mounts/${id}`); }
  async lookupCharacter(realm:string,name:string,region='us') { return this.request<CharLookup>('/characters/lookup',{},{realm,name,region}); }
  async getRealms() { return this.request<{realms:{id:number;name:string;slug:string}[]}>('/characters/realms'); }
  async getMyCharacters() { return this.request<{characters:WowChar[];has_bnet:boolean}>('/characters/mine'); }
  async getFavorites() { return this.request<{characters:FavChar[]}>('/characters/favorites'); }
  async addFavorite(rs:string,cn:string,r='us') { return this.request<{id:number}>('/characters/favorites',{method:'POST'},{realm_slug:rs,character_name:cn,region:r}); }
  async removeFavorite(id:number) { return this.request<{deleted:boolean}>(`/characters/favorites/${id}`,{method:'DELETE'}); }
  async getFarmTasks() { return this.request<{tasks:FarmTask[];reset_info:ResetInfo}>('/farm/'); }
  async createFarmTask(t:Partial<FarmTask>) { return this.request<{id:number;title:string}>('/farm/',{method:'POST',body:JSON.stringify(t)}); }
  async toggleFarmTask(id:number) { return this.request<{id:number;completed:boolean}>(`/farm/${id}/complete`,{method:'PATCH'}); }
  async deleteFarmTask(id:number) { return this.request<{deleted:boolean}>(`/farm/${id}`,{method:'DELETE'}); }
}

export interface MountSummary { id:number; name:string; description?:string; source_type?:string; faction?:string; icon_url?:string; }
export interface WowChar { name:string; realm_slug:string; realm:string; level:number; class_name:string; race_name:string; faction:string; }
export interface CharLookup { name:string; realm:string; realm_slug:string; level:number; race:string; class:string; faction:string; avatar_url:string|null; mounts:{mount:{id:number;name:string}}[]|null; mount_count:number|null; }
export interface FavChar { id:number; realm_slug:string; character_name:string; region:string; class_name:string; race_name:string; level:number; avatar_url:string|null; is_primary:boolean; }
export interface FarmTask { id:number; title:string; description?:string; mount_id?:number; source_type?:string; zone_name?:string; reset_type:string; completed:boolean; completed_at?:string; notes?:string; sort_order:number; }
export interface ResetInfo { daily_reset:string; weekly_reset:string; tasks_reset:number; }
export const api = new ApiService();
export default api;
