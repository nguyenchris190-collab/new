import type { ActiveSession, Attempt, CoursePack, SessionRecord } from '../types';
import { median, startOfDay } from './util';

export type TopicStatus = 'solid' | 'needs-work' | 'unexplored';

export interface TopicStat {
  topic: string;
  available: number;
  attempts: number;
  correct: number;
  accuracy: number | null;
  status: TopicStatus;
}

export const SOLID_ACCURACY = 0.7;
/** A topic is "unexplored" when its volume is below this fraction of the course median. */
export const UNEXPLORED_RATIO = 0.5;

export function topicStats(course: CoursePack, attempts: Attempt[]): { stats: TopicStat[]; median: number } {
  const byTopic = new Map<string, TopicStat>();
  for (const q of course.questions) {
    const s = byTopic.get(q.topic) ?? { topic: q.topic, available: 0, attempts: 0, correct: 0, accuracy: null, status: 'unexplored' as TopicStatus };
    s.available++;
    byTopic.set(q.topic, s);
  }
  for (const a of attempts) {
    if (a.courseId !== course.id || a.contextMode) continue;
    const s = byTopic.get(a.topic);
    if (!s) continue;
    s.attempts++;
    if (a.correct) s.correct++;
  }
  const stats = [...byTopic.values()];
  const med = median(stats.map((s) => s.attempts));
  for (const s of stats) {
    s.accuracy = s.attempts ? s.correct / s.attempts : null;
    if (s.attempts === 0 || s.attempts < med * UNEXPLORED_RATIO) s.status = 'unexplored';
    else s.status = (s.accuracy ?? 0) >= SOLID_ACCURACY ? 'solid' : 'needs-work';
  }
  return { stats, median: med };
}

export function statusCounts(stats: TopicStat[]): Record<TopicStatus, number> {
  const c: Record<TopicStatus, number> = { solid: 0, 'needs-work': 0, unexplored: 0 };
  for (const s of stats) c[s.status]++;
  return c;
}

export function liveElapsed(active: ActiveSession, now = Date.now()): number {
  return active.elapsedMs + (active.runningSince ? Math.max(0, now - active.runningSince) : 0);
}

export interface DayActivity {
  day: number;
  minutes: number;
  sessions: number;
  solved: number;
}

/** Activity for the last `days` calendar days, oldest first. Includes the running session's live time. */
export function dailyActivity(
  sessions: SessionRecord[],
  attempts: Attempt[],
  active: ActiveSession | null,
  days = 7,
  now = Date.now(),
): DayActivity[] {
  const today = startOfDay(now);
  const out: DayActivity[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({ day: d.getTime(), minutes: 0, sessions: 0, solved: 0 });
  }
  const idx = (ts: number) => out.findIndex((o) => o.day === startOfDay(ts));
  for (const s of sessions) {
    const i = idx(s.startedAt);
    if (i < 0) continue;
    let ms = s.activeMs;
    if (active && active.id === s.id) ms = liveElapsed(active, now);
    out[i].minutes += ms / 60000;
    if (s.answered > 0 || ms > 60000) out[i].sessions++;
  }
  for (const a of attempts) {
    const i = idx(a.ts);
    if (i >= 0) out[i].solved++;
  }
  return out;
}

export function lastActive(sessions: SessionRecord[], attempts: Attempt[]): number | null {
  let t = 0;
  for (const s of sessions) if (s.answered > 0) t = Math.max(t, s.endedAt);
  for (const a of attempts) t = Math.max(t, a.ts);
  return t || null;
}

/** Most recent result per question, used to prioritise what to drill next. */
export function lastResultByQuestion(attempts: Attempt[], courseId: string): Map<string, Attempt> {
  const m = new Map<string, Attempt>();
  for (const a of attempts) {
    if (a.courseId !== courseId || a.contextMode) continue;
    const prev = m.get(a.questionId);
    if (!prev || prev.ts < a.ts) m.set(a.questionId, a);
  }
  return m;
}

/**
 * Pacing check: true when the recent per-question time is much slower than
 * the session's own early baseline.
 */
export function pacingDropped(active: ActiveSession): boolean {
  const done = Object.values(active.items)
    .filter((i) => i.done && i.completedAtMs !== null && i.viewedAtMs !== null)
    .sort((a, b) => (a.completedAtMs ?? 0) - (b.completedAtMs ?? 0))
    .map((i) => (i.completedAtMs ?? 0) - (i.viewedAtMs ?? 0));
  if (done.length < 6) return false;
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const early = avg(done.slice(0, 3));
  const recent = avg(done.slice(-3));
  return early > 0 && recent > early * 2 && recent > 90_000;
}

/**
 * Clean (first-try, unassisted) streak ending at this question's attempt in the
 * session, and whether that attempt hit a Captain's Log daily milestone.
 */
export function cleanStreakAt(attempts: Attempt[], sessionId: string, questionId: string, milestones: number[]): { count: number; milestone: boolean } | null {
  const mine = attempts.filter((a) => a.sessionId === sessionId && !a.contextMode).sort((a, b) => a.ts - b.ts);
  const idx = mine.findIndex((a) => a.questionId === questionId);
  if (idx < 0 || !mine[idx].correct) return null;
  let count = 0;
  for (let i = idx; i >= 0 && mine[i].correct; i--) count++;
  const at = mine[idx].ts;
  const day = startOfDay(at);
  const solvedToday = attempts.filter((a) => !a.contextMode && a.ts <= at && startOfDay(a.ts) === day).length;
  return { count, milestone: milestones.includes(solvedToday) };
}
