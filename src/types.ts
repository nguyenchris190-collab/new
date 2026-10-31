export type ThemeName = 'canvas' | 'sepia' | 'slate' | 'contrast';

export type Category = 'theory' | 'practice';
export type QuestionMode = 'exam' | 'context';

export interface ImageRef {
  src: string;
  alt: string;
}
export type SessionMode = 'balanced' | 'theory' | 'practice';
export type Confidence = 'confident' | 'guess' | 'low';

/** One answerable stage. A single multiple-choice question is a question with one step. */
export interface Step {
  prompt?: string;
  choices: string[];
  answer: number;
  hints: string[];
  solution?: string;
  /** Per-choice feedback, parallel to `choices`. */
  feedback?: string[];
  /** Per-choice image metadata, parallel to `choices`. */
  images?: ImageRef[];
  /** Printed Methods & Algebra sheet references. */
  methodRefs?: string[];
}

/** Optional real-world skin shown by the Examen / Contexte toggle. */
export interface Scenario {
  prompt: string;
  /** Instructions parallel to the shared `Question.steps`. */
  instructions?: string[];
  /** Contexte-only interpretation steps appended after the shared steps. */
  extraSteps?: Step[];
  interpretation?: string;
}

export interface Question {
  id: string;
  kind: 'mc' | 'sequential';
  topic: string;
  category: Category;
  prompt: string;
  steps: Step[];
  /** Full derivation shown once the whole question is solved. */
  solution?: string;
  difficulty?: number;
  /** Where the problem comes from, e.g. "Intra H24 · Q1.a". */
  source?: string;
  /** Figure shown under the prompt in both modes. */
  promptImage?: ImageRef;
  /** Printed Methods & Algebra sheet references. */
  methodRefs?: string[];
  scenario?: Scenario;
}

export interface CheatSection {
  title?: string;
  items: string[];
}

export interface CoursePack {
  id: string;
  title: string;
  code?: string;
  description?: string;
  icon?: string;
  cheatSheet: CheatSection[];
  questions: Question[];
  installedAt: number;
  updatedAt: number;
}

export interface Attempt {
  id: string;
  sessionId: string;
  courseId: string;
  questionId: string;
  topic: string;
  category: Category;
  /** Solved every step on the first try, without revealing. */
  correct: boolean;
  tries: number;
  hintsUsed: number;
  revealed: boolean;
  confidence: Confidence;
  durationMs: number;
  ts: number;
  /** True when the attempt was solved in Contexte mode; Examen stats ignore it. */
  contextMode?: boolean;
}

export interface SessionRecord {
  id: string;
  courseId: string;
  courseTitle: string;
  mode: SessionMode;
  startedAt: number;
  endedAt: number;
  activeMs: number;
  planned: number;
  answered: number;
  correct: number;
  topics: string[];
  finished: boolean;
}

export interface StepState {
  selected: number | null;
  struck: number[];
  wrong: number[];
  tries: number;
  hintsShown: number;
  solved: boolean;
  revealed: boolean;
  firstTry: boolean | null;
}

export interface ItemState {
  /** A diagnostic "Report / Fix" prompt was copied for this question. */
  reported: boolean;
  step: number;
  steps: StepState[];
  /** Display order of choices per step (indices into Step.choices). */
  orders: number[][];
  confidence: Confidence;
  done: boolean;
  viewedAtMs: number | null;
  completedAtMs: number | null;
  /** Whether this item was initialized for Contexte mode. */
  contextMode?: boolean;
}

export interface ActiveSession {
  id: string;
  courseId: string;
  mode: SessionMode;
  questionIds: string[];
  current: number;
  startedAt: number;
  elapsedMs: number;
  /** Epoch ms when the clock last resumed; null while paused. */
  runningSince: number | null;
  items: Record<string, ItemState>;
  warningDismissed: boolean;
  finished: boolean;
  /** Quote shown while the session warms up (sessionStart tier). */
  startQuoteId?: string;
  startQuoteDismissed?: boolean;
  /** Set once the burnout/fatigue notice has fired; gates some streak quotes. */
  fatigueFired?: boolean;
  /** Epoch ms when the clock was paused, used to detect real breaks. */
  pausedAt?: number | null;
  /** Fatigue quote to show after returning from a break. */
  breakQuoteId?: string | null;
}

export interface CourseConfig {
  count: number;
  mode: SessionMode;
  excluded: string[];
}

export type SyncProvider = 'supabase' | 'firebase';

export interface SyncSettings {
  enabled: boolean;
  provider: SyncProvider;
  url: string;
  apiKey: string;
  syncKey: string;
  lastSyncedAt: number | null;
}

export interface AppState {
  version: 1;
  courses: CoursePack[];
  attempts: Attempt[];
  sessions: SessionRecord[];
  configs: Record<string, CourseConfig>;
  active: ActiveSession | null;
  sync: SyncSettings;
  /** Version of the bundled course packs last installed into this state. */
  bundledVersion: number;
  /** Last Examen / Contexte choice, remembered globally. */
  lastQuestionMode: QuestionMode;
  /** Ids of courses the user removed, so sync does not resurrect them. */
  removed: string[];
  updatedAt: number;
}
