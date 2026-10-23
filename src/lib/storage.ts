import type { AppState } from '../types';
import { isRecord } from './util';

const KEY = 'drillengine:v1';

export const initialState = (): AppState => ({
  version: 1,
  courses: [],
  attempts: [],
  sessions: [],
  configs: {},
  active: null,
  sync: { enabled: false, provider: 'supabase', url: '', apiKey: '', syncKey: '', lastSyncedAt: null },
  bundledVersion: 0,
  removed: [],
  updatedAt: 0,
});

export function loadState(): AppState {
  const base = initialState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return base;
    // Shallow-merge so new fields added in later versions get defaults.
    return {
      ...base,
      ...parsed,
      sync: { ...base.sync, ...(isRecord(parsed.sync) ? parsed.sync : {}) },
      courses: Array.isArray(parsed.courses) ? parsed.courses : [],
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      removed: Array.isArray(parsed.removed) ? parsed.removed : [],
      configs: isRecord(parsed.configs) ? parsed.configs : {},
    } as AppState;
  } catch {
    return base;
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
