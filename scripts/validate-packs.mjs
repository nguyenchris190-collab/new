#!/usr/bin/env node
// Validates every course pack in src/data/packs/: JSON shape, answer keys,
// distractor uniqueness, and that every $…$ / $$…$$ segment renders in KaTeX
// with throwOnError enabled. Run: npm run validate:packs
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import katex from 'katex';

const DIR = new URL('../src/data/packs/', import.meta.url).pathname;
let errors = 0;
const fail = (where, msg) => {
  errors++;
  console.error(`  ✗ ${where}: ${msg}`);
};

function mathSegments(s) {
  const out = [];
  const re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<!\\)\$((?:\\\$|[^$])+?)\$/g;
  let m;
  while ((m = re.exec(s))) {
    const display = m[1] !== undefined || m[2] !== undefined;
    out.push({ tex: m[1] ?? m[2] ?? m[3] ?? m[4], display });
  }
  return out;
}

function checkMath(where, s) {
  if (typeof s !== 'string') return;
  const stripped = s.replace(/\$\$[\s\S]+?\$\$|(?<!\\)\$(?:\\\$|[^$])+?\$/g, '');
  if (/(?<!\\)\$/.test(stripped)) fail(where, `unbalanced $ delimiter in: ${s.slice(0, 80)}`);
  for (const { tex, display } of mathSegments(s)) {
    try {
      katex.renderToString(tex, { displayMode: display, throwOnError: true, strict: 'error' });
    } catch (e) {
      fail(where, `KaTeX: ${e.message.split('\n')[0]}  ⟵  ${tex.slice(0, 80)}`);
    }
  }
}

function checkStep(where, s) {
  if (!Array.isArray(s.choices) || s.choices.length < 2) return fail(where, 'needs at least 2 choices');
  if (new Set(s.choices.map((c) => c.replace(/\s+/g, ''))).size !== s.choices.length) fail(where, 'duplicate choices');
  if (!Number.isInteger(s.answer) || s.answer < 0 || s.answer >= s.choices.length) fail(where, `answer index ${s.answer} out of range`);
  [s.prompt, s.solution, ...(s.choices ?? []), ...(s.hints ?? [])].forEach((t, i) => checkMath(`${where}#${i}`, t));
}

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  console.log(`• ${file}`);
  let pack;
  try {
    pack = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  } catch (e) {
    fail(file, `invalid JSON: ${e.message}`);
    continue;
  }
  if (!pack.id || !pack.title) fail(file, 'pack needs id and title');
  checkMath(`${file} cheatSheetMarkdown`, pack.cheatSheetMarkdown);
  const ids = new Set();
  const tally = { theory: 0, practice: 0 };
  for (const q of pack.questions ?? []) {
    const where = `${file} ${q.id}`;
    if (!q.id) fail(file, 'question without id');
    if (ids.has(q.id)) fail(where, 'duplicate id');
    ids.add(q.id);
    if (!q.topic) fail(where, 'missing topic');
    if (q.category !== 'theory' && q.category !== 'practice') fail(where, `category must be theory|practice, got ${q.category}`);
    else tally[q.category]++;
    checkMath(`${where} question`, q.question);
    checkMath(`${where} solution`, q.solution);
    if (Array.isArray(q.steps)) {
      if (q.steps.length < 2 || q.steps.length > 4) fail(where, `multi-step questions use 2–4 steps (has ${q.steps.length})`);
      q.steps.forEach((s, i) => checkStep(`${where} step ${i + 1}`, s));
    } else checkStep(where, q);
  }
  console.log(`  ${ids.size} questions · ${tally.theory} theory · ${tally.practice} practice`);
}

if (errors) {
  console.error(`\n${errors} problem(s) found.`);
  process.exit(1);
}
console.log('\nAll packs valid.');
