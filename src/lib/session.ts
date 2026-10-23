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

export function newItem(q: Question): ItemState {
  return {
    flagged: false,
    step: 0,
    steps: q.steps.map(() => ({ selected: null, struck: [], wrong: [], tries: 0, hintsShown: 0, solved: false, revealed: false, firstTry: null })),
    orders: q.steps.map((s) => shuffle(s.choices.map((_, i) => i))),
    confidence: 'confident',
    done: false,
    viewedAtMs: null,
    completedAtMs: null,
  };
}

export function createSession(course: CoursePack, questions: Question[], mode: SessionMode): ActiveSession {
  const now = Date.now();
  const items: Record<string, ItemState> = {};
  for (const q of questions) items[q.id] = newItem(q);
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
