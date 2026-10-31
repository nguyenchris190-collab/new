import type { ActiveSession, Attempt, CourseConfig, CoursePack, ItemState, Question, SessionMode } from '../types';
import { lastResultByQuestion } from './analytics';
import { shuffle, uid } from './util';

export const DEFAULT_CONFIG: CourseConfig = { count: 20, mode: 'balanced', excluded: [] };

export function eligibleQuestions(course: CoursePack, mode: SessionMode, excluded: string[]): Question[] {
  const ex = new Set(excluded);
  return course.questions.filter((q) => !ex.has(q.topic) && (mode === 'balanced' || q.category === mode));
}

/**
 * Pick questions weighted toward what needs attention: never-seen and
 * previously-missed questions first, then low-confidence wins, then mastered ones.
 */
export function pickQuestions(pool: Question[], count: number, attempts: Attempt[], courseId: string, mode: SessionMode): Question[] {
  const last = lastResultByQuestion(attempts, courseId);
  const score = (q: Question) => {
    const a = last.get(q.id);
    let s: number;
    if (!a) s = 3;
    else if (!a.correct) s = 2.5;
    else if (a.confidence !== 'confident' || a.hintsUsed > 0) s = 1.5;
    else s = 0.5;
    return s + Math.random() * 1.2;
  };
  const ranked = pool.map((q) => ({ q, s: score(q) })).sort((a, b) => b.s - a.s);

  let chosen: Question[];
  if (mode === 'balanced') {
    // Keep a theory/practice mix proportional to the pool.
    const theory = ranked.filter((r) => r.q.category === 'theory').map((r) => r.q);
    const practice = ranked.filter((r) => r.q.category === 'practice').map((r) => r.q);
    const wantTheory = Math.round((count * theory.length) / Math.max(1, pool.length));
    chosen = [...theory.slice(0, wantTheory), ...practice.slice(0, count - Math.min(wantTheory, theory.length))];
    if (chosen.length < count) {
      const ids = new Set(chosen.map((q) => q.id));
      chosen.push(...ranked.map((r) => r.q).filter((q) => !ids.has(q.id)).slice(0, count - chosen.length));
    }
  } else {
    chosen = ranked.slice(0, count).map((r) => r.q);
  }
  return shuffle(chosen);
}

/** Steps shown for an item: shared steps, plus scenario interpretation steps in Contexte mode. */
export function runtimeSteps(q: Question, contextMode = false): Question['steps'] {
  const extra = contextMode ? (q.scenario?.extraSteps ?? []) : [];
  return extra.length ? [...q.steps, ...extra] : q.steps;
}

export function newItem(q: Question, contextMode = false): ItemState {
  const steps = runtimeSteps(q, contextMode);
  return {
    reported: false,
    step: 0,
    steps: steps.map(() => ({ selected: null, struck: [], wrong: [], tries: 0, hintsShown: 0, solved: false, revealed: false, firstTry: null })),
    orders: steps.map((s) => shuffle(s.choices.map((_, i) => i))),
    confidence: 'confident',
    done: false,
    viewedAtMs: null,
    completedAtMs: null,
    ...(contextMode && q.scenario ? { contextMode: true } : {}),
  };
}

/** First-try, unassisted solve: no misses, no hints, no reveals on any step. */
export function isCleanSolve(item: ItemState): boolean {
  return item.done && item.steps.every((s) => s.firstTry === true && !s.revealed && s.hintsShown === 0);
}

export function createSession(course: CoursePack, questions: Question[], mode: SessionMode, contextMode = false): ActiveSession {
  const now = Date.now();
  const items: Record<string, ItemState> = {};
  for (const q of questions) items[q.id] = newItem(q, contextMode);
  const first = questions[0];
  if (first) items[first.id].viewedAtMs = 0;
  return {
    id: uid('s_'),
    courseId: course.id,
    mode,
    questionIds: questions.map((q) => q.id),
    current: 0,
    startedAt: now,
    elapsedMs: 0,
    runningSince: now,
    items,
    warningDismissed: false,
    finished: false,
  };
}
