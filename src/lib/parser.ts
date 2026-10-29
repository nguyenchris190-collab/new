import type { Category, CheatSection, CoursePack, Question, Step } from '../types';
import { hash, isRecord } from './util';

/**
 * Permissive, duck-typed course pack parser.
 *
 * Accepts many shapes:
 *   - a single pack:            { title, questions: [...], cheatSheet? }
 *   - several packs:            { courses: [...] } or [ {title, questions}, ... ]
 *   - a bare question array:    [ {question, choices, answer}, ... ]
 * Unknown fields are ignored, missing optional fields are simply left out,
 * and malformed questions are skipped with a warning instead of failing the import.
 */

export interface ParseReport {
  courses: CoursePack[];
  warnings: string[];
  skipped: number;
}

type Obj = Record<string, unknown>;

const pick = (o: Obj, keys: string[]): unknown => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
  return undefined;
};

const str = (v: unknown): string | undefined => {
  if (typeof v === 'string') return v.trim() || undefined;
  if (typeof v === 'number') return String(v);
  return undefined;
};

const textOf = (v: unknown): string | undefined => {
  if (isRecord(v)) return str(pick(v, ['text', 'latex', 'tex', 'label', 'value', 'content', 'body']));
  return str(v);
};

const strList = (v: unknown): string[] => {
  if (v === undefined || v === null) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.map(textOf).filter((s): s is string => !!s);
};

const PROMPT_KEYS = ['prompt', 'question', 'stem', 'text', 'body', 'q', 'title'];
const CHOICE_KEYS = ['choices', 'options', 'answers', 'alternatives', 'responses'];
const ANSWER_KEYS = ['answer', 'correct', 'correctIndex', 'correct_index', 'correctAnswer', 'correct_answer', 'key', 'solutionIndex'];
const HINT_KEYS = ['hints', 'hint', 'clues', 'tips'];
const SOLUTION_KEYS = ['solution', 'explanation', 'derivation', 'rationale', 'workedSolution', 'worked_solution', 'feedback'];

function parseChoices(raw: unknown): { choices: string[]; flagged: number } {
  let flagged = -1;
  if (isRecord(raw)) {
    // { A: "...", B: "..." }
    const entries = Object.entries(raw);
    return { choices: entries.map(([, v]) => textOf(v) ?? '').filter(Boolean), flagged };
  }
  if (!Array.isArray(raw)) return { choices: [], flagged };
  const choices: string[] = [];
  raw.forEach((c) => {
    const t = textOf(c);
    if (!t) return;
    if (isRecord(c) && (c.correct === true || c.isCorrect === true || c.is_correct === true)) flagged = choices.length;
    choices.push(t);
  });
  return { choices, flagged };
}

const norm = (s: string) => s.replace(/\s+/g, '').replace(/^\$+|\$+$/g, '').toLowerCase();

function resolveAnswer(raw: unknown, choices: string[], flagged: number): number {
  if (flagged >= 0) return flagged;
  if (raw === undefined) return -1;
  if (Array.isArray(raw)) raw = raw[0];
  if (isRecord(raw)) raw = pick(raw, ['index', 'id', 'text', 'value', 'label']);
  if (typeof raw === 'number' && Number.isInteger(raw)) {
    if (raw >= 0 && raw < choices.length) return raw;
    if (raw === choices.length) return raw - 1; // tolerate 1-based last option
    return -1;
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (/^[A-Ha-h]$/.test(s)) return s.toUpperCase().charCodeAt(0) - 65;
    if (/^\d+$/.test(s)) {
      const n = parseInt(s, 10);
      return n >= 0 && n < choices.length ? n : -1;
    }
    const target = norm(s);
    return choices.findIndex((c) => norm(c) === target);
  }
  return -1;
}

function parseStep(o: Obj, fallbackPrompt?: string): Step | string {
  const { choices, flagged } = parseChoices(pick(o, CHOICE_KEYS));
  if (choices.length < 2) return 'fewer than 2 choices';
  const answer = resolveAnswer(pick(o, ANSWER_KEYS), choices, flagged);
  if (answer < 0) return 'answer could not be matched to a choice';
  const step: Step = {
    choices,
    answer,
    hints: strList(pick(o, HINT_KEYS)),
  };
  const prompt = textOf(pick(o, PROMPT_KEYS)) ?? fallbackPrompt;
  if (prompt) step.prompt = prompt;
  const sol = textOf(pick(o, SOLUTION_KEYS));
  if (sol) step.solution = sol;
  return step;
}

function parseCategory(o: Obj): Category {
  const raw = [o.category, o.mode, o.kind, o.type, o.tag, ...(Array.isArray(o.tags) ? o.tags : [])]
    .filter((v) => typeof v === 'string')
    .join(' ')
    .toLowerCase();
  return /theor|concept|defin|proof|understand/.test(raw) ? 'theory' : 'practice';
}

function parseQuestion(o: Obj, _index: number, defaultTopic: string): Question | string {
  const prompt = textOf(pick(o, PROMPT_KEYS));
  const topic = str(pick(o, ['topic', 'section', 'chapter', 'unit', 'module', 'skill'])) ?? defaultTopic;
  const category = parseCategory(o);
  const rawSteps = pick(o, ['steps', 'parts', 'stages', 'subquestions']);
  const steps: Step[] = [];

  if (Array.isArray(rawSteps) && rawSteps.length) {
    for (let i = 0; i < rawSteps.length; i++) {
      const s = rawSteps[i];
      if (!isRecord(s)) return `step ${i + 1} is not an object`;
      const parsed = parseStep(s);
      if (typeof parsed === 'string') return `step ${i + 1}: ${parsed}`;
      steps.push(parsed);
    }
    if (!prompt && !steps[0].prompt) return 'missing prompt';
  } else {
    if (!prompt) return 'missing prompt';
    const parsed = parseStep({ ...o, prompt: undefined, question: undefined, stem: undefined, text: undefined, body: undefined, q: undefined, title: undefined });
    if (typeof parsed === 'string') return parsed;
    steps.push(parsed);
  }

  const id = str(pick(o, ['id', 'uid', 'slug'])) ?? `q${hash((prompt ?? '') + JSON.stringify(steps.map((s) => [s.prompt, s.choices])))}`;
  const q: Question = {
    id: String(id),
    kind: steps.length > 1 || Array.isArray(rawSteps) ? 'sequential' : 'mc',
    topic,
    category,
    prompt: prompt ?? '',
    steps,
  };
  const sol = Array.isArray(rawSteps) ? textOf(pick(o, SOLUTION_KEYS)) : undefined;
  if (sol) q.solution = sol;
  const diff = Number(pick(o, ['difficulty', 'level']));
  if (Number.isFinite(diff)) q.difficulty = diff;
  const source = str(pick(o, ['source', 'exam', 'ref', 'reference']));
  if (source) q.source = source;
  return q;
}

/**
 * Minimal Markdown → sections: `#` headings start a section, `-`/`*` bullets and
 * blank-line-separated paragraphs become items, and `$$…$$` blocks may span lines.
 */
export function parseMarkdownSheet(md: string): CheatSection[] {
  const sections: CheatSection[] = [];
  let cur: CheatSection = { items: [] };
  let para: string[] = [];
  let inDisplay = false;
  const flushPara = () => {
    const text = para.join(' ').trim();
    if (text) cur.items.push(text);
    para = [];
  };
  const flushSection = () => {
    flushPara();
    if (cur.items.length || cur.title) sections.push(cur);
  };
  for (const rawLine of md.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (inDisplay) {
      para.push(line);
      if ((line.match(/\$\$/g) ?? []).length % 2 === 1) {
        inDisplay = false;
        flushPara();
      }
      continue;
    }
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    const bullet = /^(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (heading) {
      flushSection();
      cur = { title: heading[1].trim(), items: [] };
    } else if (!line) {
      flushPara();
    } else if (bullet) {
      flushPara();
      para.push(bullet[1]);
      flushPara();
    } else {
      if (line.startsWith('$$') && para.length) flushPara();
      para.push(line);
      if ((line.match(/\$\$/g) ?? []).length % 2 === 1) inDisplay = true;
      else if (line.startsWith('$$')) flushPara();
    }
  }
  flushSection();
  return sections.filter((sec) => sec.items.length);
}

function parseCheatSheet(raw: unknown, markdown?: unknown): CheatSection[] {
  const fromMd = typeof markdown === 'string' && markdown.trim() ? parseMarkdownSheet(markdown) : [];
  if (raw === undefined || raw === null) return fromMd;
  return [...parseCheatSheetValue(raw), ...fromMd];
}

function parseCheatSheetValue(raw: unknown): CheatSection[] {
  if (typeof raw === 'string') return raw.trim() ? parseMarkdownSheet(raw) : [];
  if (Array.isArray(raw)) {
    const loose: string[] = [];
    const sections: CheatSection[] = [];
    for (const entry of raw) {
      if (typeof entry === 'string') loose.push(entry);
      else if (isRecord(entry)) {
        const items = strList(pick(entry, ['items', 'formulas', 'formula', 'entries', 'content', 'body', 'lines']));
        const title = str(pick(entry, ['title', 'heading', 'name', 'section', 'topic']));
        // { name: "Power rule", formula: "..." } style: one item per entry
        if (items.length) sections.push({ title, items });
      }
    }
    if (loose.length) sections.unshift({ items: loose });
    return sections;
  }
  if (isRecord(raw)) {
    if (pick(raw, ['sections', 'groups'])) return parseCheatSheetValue(pick(raw, ['sections', 'groups']));
    // { "Derivatives": ["...", "..."], "Limits": "..." }
    return Object.entries(raw)
      .map(([title, v]) => ({ title, items: strList(v) }))
      .filter((s) => s.items.length);
  }
  return [];
}

function looksLikeQuestion(v: unknown): boolean {
  return isRecord(v) && (pick(v, CHOICE_KEYS) !== undefined || Array.isArray(pick(v, ['steps', 'parts', 'stages'])));
}

function parseCourse(o: Obj, warnings: string[], fallbackTitle: string): { course: CoursePack | null; skipped: number } {
  const title = str(pick(o, ['title', 'name', 'course', 'courseTitle', 'course_title'])) ?? fallbackTitle;
  const code = str(pick(o, ['code', 'courseCode', 'course_code', 'shortName']));
  const rawQs = pick(o, ['questions', 'items', 'problems', 'bank', 'questionBank']);
  let rawList: unknown[] = Array.isArray(rawQs) ? rawQs : [];

  // { topics: [{ name, questions: [...] }] }
  const rawTopics = pick(o, ['topics', 'sections', 'chapters', 'units']);
  if (Array.isArray(rawTopics)) {
    for (const t of rawTopics) {
      if (!isRecord(t)) continue;
      const tName = str(pick(t, ['name', 'title', 'topic']));
      const tq = pick(t, ['questions', 'items', 'problems']);
      if (Array.isArray(tq)) rawList = rawList.concat(tq.map((q) => (isRecord(q) && tName && !q.topic ? { ...q, topic: tName } : q)));
    }
  }

  const questions: Question[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  rawList.forEach((raw, i) => {
    if (!isRecord(raw)) {
      skipped++;
      warnings.push(`${title}: item ${i + 1} skipped (not an object)`);
      return;
    }
    const q = parseQuestion(raw, i, str(pick(o, ['defaultTopic'])) ?? 'General');
    if (typeof q === 'string') {
      skipped++;
      warnings.push(`${title}: question ${i + 1} skipped (${q})`);
      return;
    }
    while (seen.has(q.id)) q.id = `${q.id}_${i}`;
    seen.add(q.id);
    questions.push(q);
  });

  if (!questions.length) {
    warnings.push(`${title}: no usable questions found`);
    return { course: null, skipped };
  }
  const now = Date.now();
  const id = str(pick(o, ['id', 'courseId', 'course_id', 'slug'])) ?? code ?? `c${hash(title)}`;
  const course: CoursePack = {
    id: String(id),
    title,
    cheatSheet: parseCheatSheet(
      pick(o, ['cheatSheet', 'cheatsheet', 'cheat_sheet', 'formulas', 'formulaSheet', 'formula_sheet', 'reference']),
      pick(o, ['cheatSheetMarkdown', 'cheatsheetMarkdown', 'cheat_sheet_markdown', 'formulaSheetMarkdown']),
    ),
    questions,
    installedAt: now,
    updatedAt: now,
  };
  if (code) course.code = code;
  const desc = str(pick(o, ['description', 'summary', 'subtitle']));
  if (desc) course.description = desc;
  const icon = str(pick(o, ['icon', 'glyph']));
  if (icon) course.icon = icon;
  return { course, skipped };
}

export function parseCoursePacks(input: unknown, fallbackTitle = 'Imported Course'): ParseReport {
  const warnings: string[] = [];
  const courses: CoursePack[] = [];
  let skipped = 0;

  let data = input;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data.replace(/^﻿/, ''));
    } catch (e) {
      return { courses, skipped, warnings: [`Invalid JSON: ${(e as Error).message}`] };
    }
  }

  let packs: unknown[] = [];
  if (Array.isArray(data)) {
    packs = data.length && data.every(looksLikeQuestion) ? [{ title: fallbackTitle, questions: data }] : data;
  } else if (isRecord(data)) {
    const many = pick(data, ['courses', 'packs', 'coursePacks']);
    packs = Array.isArray(many) ? many : [data];
  } else {
    return { courses, skipped, warnings: ['Expected a JSON object or array.'] };
  }

  packs.forEach((p, i) => {
    if (!isRecord(p)) {
      warnings.push(`Pack ${i + 1} skipped (not an object)`);
      return;
    }
    const res = parseCourse(p, warnings, packs.length > 1 ? `${fallbackTitle} ${i + 1}` : fallbackTitle);
    skipped += res.skipped;
    if (res.course) courses.push(res.course);
  });
  return { courses, warnings, skipped };
}
