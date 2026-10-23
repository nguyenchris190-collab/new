import type { AppState, Attempt, CoursePack, SessionRecord, SyncSettings } from '../types';
import { isRecord } from './util';

/**
 * Optional, login-free cloud sync. The whole (non-device) state is stored as a
 * single JSON blob addressed by a plain-text sync key.
 *
 * Supabase: create a table once:
 *   create table drillengine_sync (sync_key text primary key, payload jsonb, updated_at timestamptz default now());
 *   (enable RLS with a permissive policy, or leave RLS off — this is a personal tool.)
 * Firebase Realtime Database: any database URL with read/write rules open for /drillengine.
 */

export type SyncPayload = Pick<AppState, 'courses' | 'attempts' | 'sessions' | 'configs' | 'removed' | 'updatedAt'>;

export const toPayload = (s: AppState): SyncPayload => ({
  courses: s.courses,
  attempts: s.attempts,
  sessions: s.sessions,
  configs: s.configs,
  removed: s.removed,
  updatedAt: s.updatedAt,
});

const trimUrl = (u: string) => u.trim().replace(/\/+$/, '');
const TABLE = 'drillengine_sync';

export const syncConfigured = (s: SyncSettings) => s.enabled && !!s.url.trim() && !!s.syncKey.trim();

export async function pull(s: SyncSettings): Promise<SyncPayload | null> {
  const key = encodeURIComponent(s.syncKey.trim());
  let res: Response;
  if (s.provider === 'firebase') {
    res = await fetch(`${trimUrl(s.url)}/drillengine/${key}.json`);
    if (!res.ok) throw new Error(`Firebase ${res.status}`);
    const body = await res.json();
    return isRecord(body) ? (body as unknown as SyncPayload) : null;
  }
  res = await fetch(`${trimUrl(s.url)}/rest/v1/${TABLE}?sync_key=eq.${key}&select=payload`, {
    headers: { apikey: s.apiKey, Authorization: `Bearer ${s.apiKey}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] && isRecord(rows[0].payload) ? (rows[0].payload as SyncPayload) : null;
}

export async function push(s: SyncSettings, payload: SyncPayload): Promise<void> {
  const key = s.syncKey.trim();
  let res: Response;
  if (s.provider === 'firebase') {
    res = await fetch(`${trimUrl(s.url)}/drillengine/${encodeURIComponent(key)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Firebase ${res.status}`);
    return;
  }
  res = await fetch(`${trimUrl(s.url)}/rest/v1/${TABLE}?on_conflict=sync_key`, {
    method: 'POST',
    headers: {
      apikey: s.apiKey,
      Authorization: `Bearer ${s.apiKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ sync_key: key, payload, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
}

function unionBy<T>(a: T[], b: T[], id: (x: T) => string, newer: (x: T, y: T) => T): T[] {
  const m = new Map<string, T>();
  for (const x of a) m.set(id(x), x);
  for (const y of b) {
    const prev = m.get(id(y));
    m.set(id(y), prev ? newer(prev, y) : y);
  }
  return [...m.values()];
}

/** Merge a remote payload into local state. History is append-only, so union is safe. */
export function merge(local: AppState, remote: SyncPayload): AppState {
  const removed = [...new Set([...(local.removed ?? []), ...(remote.removed ?? [])])];
  const courses = unionBy<CoursePack>(local.courses, remote.courses ?? [], (c) => c.id, (x, y) => (y.updatedAt > x.updatedAt ? y : x)).filter(
    (c) => !removed.includes(c.id),
  );
  const attempts = unionBy<Attempt>(local.attempts, remote.attempts ?? [], (a) => a.id, (x) => x).sort((a, b) => a.ts - b.ts);
  const sessions = unionBy<SessionRecord>(local.sessions, remote.sessions ?? [], (s) => s.id, (x, y) => (y.endedAt > x.endedAt ? y : x)).sort(
    (a, b) => a.startedAt - b.startedAt,
  );
  const configs = (remote.updatedAt ?? 0) > local.updatedAt ? { ...local.configs, ...remote.configs } : { ...remote.configs, ...local.configs };
  return { ...local, courses, attempts, sessions, configs, removed, updatedAt: Math.max(local.updatedAt, remote.updatedAt ?? 0) };
}

export function generateSyncKey(): string {
  const words = ['delta', 'sigma', 'theta', 'omega', 'lemma', 'vector', 'tensor', 'limit', 'prime', 'axiom', 'gamma', 'kappa'];
  const w = () => words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w()}-${w()}-${n}-${Math.random().toString(36).slice(2, 8)}`;
}
