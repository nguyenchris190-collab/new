import data from '../data/quotes.json';
import { hash, startOfDay } from './util';

/**
 * Tiered stoic quote engine. Every pick is deterministic for a given seed, so a
 * quote stays put across re-renders and reloads instead of flickering.
 * Tier thresholds are documented in AGENT_GUIDELINES.md.
 */

export interface Quote {
  id: string;
  text: string;
  source: string;
  trigger?: string;
}

export type QuoteTier = 1 | 2 | 3;

const Q = data as {
  fatigue: Quote[];
  error: { tier1_first_miss: Quote[]; tier2_repeated_misses: Quote[]; tier3_stuck: Quote[] };
  streak: { tier1_clean_solve: Quote[]; tier2_sustained_run: Quote[]; tier3_milestone: Quote[] };
  sessionStart: { same_day: Quote[]; new_day: Quote[] };
  gaps: Quote[];
};

/** The "footless bird" line is suppressed once fatigue has been flagged in a session. */
export const FATIGUE_SUPPRESSED = new Set(['strk-t3-02']);

/** Captain's Log milestones: today's solved count reaching one of these unlocks tier 3. */
export const DAILY_MILESTONES = [10, 25, 50, 100];

function pick(pool: Quote[], seed: string, exclude?: Set<string>): Quote {
  const usable = exclude ? pool.filter((q) => !exclude.has(q.id)) : pool;
  const list = usable.length ? usable : pool;
  return list[parseInt(hash(seed), 36) % list.length];
}

export const quoteById = (id: string | null | undefined): Quote | undefined => {
  if (!id) return undefined;
  const all = [
    ...Q.fatigue,
    ...Object.values(Q.error).flat(),
    ...Object.values(Q.streak).flat(),
    ...Object.values(Q.sessionStart).flat(),
    ...Q.gaps,
  ];
  return all.find((q) => q.id === id);
};

/** Misses on the active step: 1 → tier 1, 2–3 → tier 2, 4+ → tier 3 ("stuck"). */
export function errorQuote(misses: number, seed: string): { quote: Quote; tier: QuoteTier } | null {
  if (misses < 1) return null;
  if (misses === 1) return { quote: pick(Q.error.tier1_first_miss, seed), tier: 1 };
  if (misses <= 3) return { quote: pick(Q.error.tier2_repeated_misses, seed), tier: 2 };
  return { quote: pick(Q.error.tier3_stuck, seed), tier: 3 };
}

/** Clean first-try streak: 1–4 → tier 1, 5–9 → tier 2, 10+ or a daily milestone → tier 3. */
export function streakQuote(streak: number, milestone: boolean, fatigueFired: boolean, seed: string): { quote: Quote; tier: QuoteTier } | null {
  if (streak < 1) return null;
  if (streak >= 10 || milestone) {
    return { quote: pick(Q.streak.tier3_milestone, seed, fatigueFired ? FATIGUE_SUPPRESSED : undefined), tier: 3 };
  }
  if (streak >= 5) return { quote: pick(Q.streak.tier2_sustained_run, seed), tier: 2 };
  return { quote: pick(Q.streak.tier1_clean_solve, seed), tier: 1 };
}

/** Same calendar day as the last logged session → same_day; otherwise (or first launch) → new_day. */
export function sessionStartQuote(lastSessionAt: number | null, now: number, seed: string): Quote {
  const sameDay = lastSessionAt !== null && startOfDay(lastSessionAt) === startOfDay(now);
  return pick(sameDay ? Q.sessionStart.same_day : Q.sessionStart.new_day, seed);
}

export type FatigueReason = 'long-session' | 'pacing' | 'short-break' | 'long-break';

const FATIGUE_BY_REASON: Record<FatigueReason, string> = {
  'long-session': 'fatigue-01',
  pacing: 'fatigue-02',
  'long-break': 'fatigue-03',
  'short-break': 'fatigue-04',
};

export function fatigueQuote(reason: FatigueReason): Quote {
  return Q.fatigue.find((q) => q.id === FATIGUE_BY_REASON[reason]) ?? Q.fatigue[0];
}

export function gapQuote(seed: string): Quote {
  return pick(Q.gaps, seed);
}
