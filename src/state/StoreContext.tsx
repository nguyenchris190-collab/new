import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ActiveSession, AppState, Attempt, CourseConfig, CoursePack, Question, SessionMode, SessionRecord, SyncSettings } from '../types';
import { liveElapsed } from '../lib/analytics';
import { createSession, DEFAULT_CONFIG, isCleanSolve } from '../lib/session';
import { clearState, initialState, loadState, saveState } from '../lib/storage';
import { merge, pull, push, syncConfigured, toPayload } from '../lib/sync';
import { uid } from '../lib/util';
import { BUNDLED_PACKS, BUNDLED_VERSION, RETIRED_PACKS } from '../data/bundledPacks';
import { parseCoursePacks } from '../lib/parser';
import { fatigueQuote, sessionStartQuote } from '../lib/quotes';

export type SyncStatus = 'off' | 'synced' | 'syncing' | 'offline' | 'error';

type Updater = (s: AppState) => AppState;

const SHORT_BREAK_MS = 2 * 60 * 1000;
const LONG_BREAK_MS = 10 * 60 * 1000;

interface Store {
  state: AppState;
  syncStatus: SyncStatus;
  syncError: string | null;
  storageOk: boolean;
  courseById: (id: string) => CoursePack | undefined;
  configFor: (courseId: string) => CourseConfig;
  importCourses: (courses: CoursePack[]) => void;
  removeCourse: (id: string) => void;
  setConfig: (courseId: string, patch: Partial<CourseConfig>) => void;
  startSession: (course: CoursePack, questions: Question[], mode: SessionMode) => void;
  patchActive: (fn: (a: ActiveSession) => ActiveSession) => void;
  completeQuestion: (questionId: string) => void;
  setPaused: (paused: boolean, at?: number) => void;
  finishSession: () => void;
  closeSession: () => void;
  setSync: (patch: Partial<SyncSettings>) => void;
  syncNow: () => Promise<void>;
  replaceAll: (state: AppState) => void;
  resetAll: () => void;
}

const Ctx = createContext<Store | null>(null);

/**
 * Install or refresh the bundled packs when their version is newer than what this
 * state has seen, and purge retired placeholder packs. Courses the user removed stay removed.
 */
function seed(s: AppState): AppState {
  if ((s.bundledVersion ?? 0) >= BUNDLED_VERSION) return s;
  const now = Date.now();
  let courses = s.courses;
  const removed = new Set(s.removed);
  for (const r of RETIRED_PACKS) {
    const c = courses.find((x) => x.id === r.id);
    if (c && c.questions.some((q) => q.id === r.signature)) {
      courses = courses.filter((x) => x !== c);
      removed.add(r.id);
    }
  }
  for (const raw of BUNDLED_PACKS) {
    for (const pack of parseCoursePacks(raw).courses) {
      if (removed.has(pack.id)) continue;
      const i = courses.findIndex((c) => c.id === pack.id);
      if (i >= 0) courses = courses.map((c, j) => (j === i ? { ...pack, installedAt: c.installedAt, updatedAt: now } : c));
      else courses = [...courses, pack];
    }
  }
  const active = s.active && courses.some((c) => c.id === s.active?.courseId) ? s.active : null;
  return { ...s, courses, active, removed: [...removed], bundledVersion: BUNDLED_VERSION };
}

/** Write the active session's running totals back into its SessionRecord. */
function syncRecord(s: AppState, active: ActiveSession, now: number, extra: Partial<SessionRecord> = {}): SessionRecord[] {
  return s.sessions.map((r) =>
    r.id === active.id ? { ...r, activeMs: liveElapsed(active, now), endedAt: Math.max(r.endedAt, now), ...extra } : r,
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => seed(loadState()));
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('off');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  const update = useCallback((fn: Updater, touch = true) => {
    setState((s) => {
      const next = fn(s);
      return touch && next !== s ? { ...next, updatedAt: Date.now() } : next;
    });
  }, []);

  // ---- persistence --------------------------------------------------------
  useEffect(() => {
    const t = setTimeout(() => setStorageOk(saveState(state)), 150);
    return () => clearTimeout(t);
  }, [state]);
  useEffect(() => {
    const flush = () => saveState(stateRef.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  // ---- cloud sync ----------------------------------------------------------
  const syncing = useRef(false);
  const lastPushed = useRef<number>(-1);

  const syncNow = useCallback(async () => {
    const s = stateRef.current.sync;
    if (!syncConfigured(s)) {
      setSyncStatus('off');
      return;
    }
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    if (syncing.current) return;
    syncing.current = true;
    setSyncStatus('syncing');
    try {
      const remote = await pull(s);
      let merged = stateRef.current;
      if (remote) merged = merge(merged, remote);
      await push(s, toPayload(merged));
      const now = Date.now();
      lastPushed.current = merged.updatedAt;
      setState((cur) => ({ ...(remote ? merge(cur, remote) : cur), sync: { ...cur.sync, lastSyncedAt: now } }));
      setSyncError(null);
      setSyncStatus('synced');
    } catch (e) {
      setSyncError((e as Error).message || 'Sync failed');
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      syncing.current = false;
    }
  }, []);

  const syncSig = `${state.sync.enabled}|${state.sync.provider}|${state.sync.url}|${state.sync.syncKey}|${state.sync.apiKey}`;
  useEffect(() => {
    void syncNow();
  }, [syncSig, syncNow]);

  useEffect(() => {
    const on = () => void syncNow();
    const off = () => syncConfigured(stateRef.current.sync) && setSyncStatus('offline');
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [syncNow]);

  // Debounced background push whenever synced data changes.
  useEffect(() => {
    if (!syncConfigured(state.sync) || state.updatedAt === lastPushed.current) return;
    const t = setTimeout(() => void syncNow(), 4000);
    return () => clearTimeout(t);
  }, [state.updatedAt, state.sync, syncNow]);

  // ---- actions ------------------------------------------------------------
  // Actions are created once so effects depending on them don't re-fire on every state change.
  const actions = useMemo<Omit<Store, 'state' | 'syncStatus' | 'syncError' | 'storageOk' | 'courseById' | 'configFor'>>(
    () => ({
      importCourses: (incoming) =>
        update((s) => {
          const courses = s.courses.slice();
          for (const c of incoming) {
            const i = courses.findIndex((x) => x.id === c.id);
            if (i >= 0) courses[i] = { ...c, installedAt: courses[i].installedAt, updatedAt: Date.now() };
            else courses.push(c);
          }
          const ids = new Set(incoming.map((c) => c.id));
          return { ...s, courses, removed: s.removed.filter((r) => !ids.has(r)) };
        }),

      removeCourse: (id) =>
        update((s) => ({
          ...s,
          courses: s.courses.filter((c) => c.id !== id),
          removed: [...new Set([...s.removed, id])],
          active: s.active?.courseId === id ? null : s.active,
        })),

      setConfig: (courseId, patch) =>
        update((s) => ({ ...s, configs: { ...s.configs, [courseId]: { ...DEFAULT_CONFIG, ...s.configs[courseId], ...patch } } })),

      startSession: (course, questions, mode) =>
        update((s) => {
          const lastAt = s.sessions.reduce<number | null>((t, r) => (r.answered > 0 && (t === null || r.endedAt > t) ? r.endedAt : t), null);
          const created = createSession(course, questions, mode);
          const active: ActiveSession = { ...created, startQuoteId: sessionStartQuote(lastAt, created.startedAt, created.id).id };
          const record: SessionRecord = {
            id: active.id,
            courseId: course.id,
            courseTitle: course.title,
            mode,
            startedAt: active.startedAt,
            endedAt: active.startedAt,
            activeMs: 0,
            planned: questions.length,
            answered: 0,
            correct: 0,
            topics: [],
            finished: false,
          };
          // Close out any previous unfinished session's record.
          let sessions = s.sessions;
          if (s.active) sessions = syncRecord(s, s.active, Date.now());
          return { ...s, active, sessions: [...sessions, record] };
        }),

      patchActive: (fn) => update((s) => (s.active ? { ...s, active: fn(s.active) } : s), false),

      completeQuestion: (qid) =>
        update((s) => {
          const a = s.active;
          const course = a && s.courses.find((c) => c.id === a.courseId);
          const q = course?.questions.find((x) => x.id === qid);
          const item = a?.items[qid];
          if (!a || !q || !item || item.done) return s;
          const now = Date.now();
          const elapsed = liveElapsed(a, now);
          const correct = isCleanSolve({ ...item, done: true });
          const attempt: Attempt = {
            id: uid('a_'),
            sessionId: a.id,
            courseId: a.courseId,
            questionId: q.id,
            topic: q.topic,
            category: q.category,
            correct,
            tries: item.steps.reduce((n, st) => n + st.tries, 0),
            hintsUsed: item.steps.reduce((n, st) => n + st.hintsShown, 0),
            revealed: item.steps.some((st) => st.revealed),
            confidence: item.confidence,
            durationMs: Math.max(0, elapsed - (item.viewedAtMs ?? elapsed)),
            ts: now,
          };
          const active: ActiveSession = { ...a, breakQuoteId: null, items: { ...a.items, [qid]: { ...item, done: true, completedAtMs: elapsed } } };
          const rec = s.sessions.find((r) => r.id === a.id);
          const sessions = syncRecord(s, active, now, {
            answered: (rec?.answered ?? 0) + 1,
            correct: (rec?.correct ?? 0) + (correct ? 1 : 0),
            topics: rec?.topics.includes(q.topic) ? rec.topics : [...(rec?.topics ?? []), q.topic],
          });
          return { ...s, active, attempts: [...s.attempts, attempt], sessions };
        }),

      setPaused: (paused, at) =>
        update((s) => {
          const a = s.active;
          if (!a || a.finished) return s;
          const now = at ?? Date.now();
          if (paused && a.runningSince) {
            const active = { ...a, elapsedMs: a.elapsedMs + Math.max(0, now - a.runningSince), runningSince: null, pausedAt: now };
            return { ...s, active, sessions: syncRecord(s, active, now) };
          }
          if (!paused && !a.runningSince) {
            // A real break earns a fatigue-recovery quote on return.
            const away = a.pausedAt ? now - a.pausedAt : 0;
            const breakQuoteId = away >= LONG_BREAK_MS ? fatigueQuote('long-break').id : away >= SHORT_BREAK_MS ? fatigueQuote('short-break').id : a.breakQuoteId ?? null;
            return { ...s, active: { ...a, runningSince: now, pausedAt: null, breakQuoteId } };
          }
          return s;
        }),

      finishSession: () =>
        update((s) => {
          const a = s.active;
          if (!a) return s;
          const now = Date.now();
          const active = { ...a, elapsedMs: liveElapsed(a, now), runningSince: null, finished: true };
          return { ...s, active, sessions: syncRecord(s, active, now, { finished: true }) };
        }),

      closeSession: () =>
        update((s) => {
          if (!s.active) return s;
          const now = Date.now();
          return { ...s, active: null, sessions: syncRecord(s, s.active, now) };
        }),

      setSync: (patch) => update((s) => ({ ...s, sync: { ...s.sync, ...patch } }), false),
      syncNow,
      replaceAll: (next) => update(() => ({ ...initialState(), ...next, bundledVersion: BUNDLED_VERSION })),
      resetAll: () => {
        clearState();
        update(() => seed(initialState()));
      },
    }),
    [update, syncNow],
  );

  const store = useMemo<Store>(
    () => ({
      ...actions,
      state,
      syncStatus,
      syncError,
      storageOk,
      courseById: (id) => state.courses.find((c) => c.id === id),
      configFor: (courseId) => ({ ...DEFAULT_CONFIG, ...state.configs[courseId] }),
    }),
    [actions, state, syncStatus, syncError, storageOk],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore outside StoreProvider');
  return c;
}
