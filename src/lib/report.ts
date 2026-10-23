import type { Question } from '../types';

export const ISSUE_TYPES = [
  'Incorrect Answer Key / Math Error',
  'KaTeX Rendering Glitch',
  'Ambiguous Prompt / Weak Distractors',
  'Formatting / Typo',
] as const;

/** Serialize a question back into the canonical pack schema (unshuffled choice order). */
export function questionToPackJson(q: Question): Record<string, unknown> {
  const base: Record<string, unknown> = { id: q.id, topic: q.topic, category: q.category };
  if (q.difficulty !== undefined) base.difficulty = q.difficulty;
  base.question = q.prompt;
  if (q.kind === 'sequential') {
    base.steps = q.steps.map((s) => ({
      ...(s.prompt ? { prompt: s.prompt } : {}),
      choices: s.choices,
      answer: s.answer,
      hints: s.hints,
      ...(s.solution ? { solution: s.solution } : {}),
    }));
    if (q.solution) base.solution = q.solution;
  } else {
    const s = q.steps[0];
    base.choices = s.choices;
    base.answer = s.answer;
    base.hints = s.hints;
    if (s.solution) base.solution = s.solution;
  }
  return base;
}

export function buildAgentPrompt(packId: string, q: Question, issues: string[], note: string): string {
  const fence = '```';
  return [
    `Fix the following question in course pack \`${packId}\`:`,
    `- Question ID: ${q.id}`,
    `- Topic: ${q.topic}`,
    `- Reported Issue: ${issues.length ? issues.join('; ') : 'Unspecified'}`,
    `- Notes: ${note.trim() || 'None'}`,
    '',
    'Current Question JSON:',
    `${fence}json`,
    JSON.stringify(questionToPackJson(q), null, 2),
    fence,
    '',
    'Please output the corrected, valid JSON object matching the DrillEngine schema.',
  ].join('\n');
}

/** Clipboard write with a textarea fallback for non-secure contexts and older WebViews. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
