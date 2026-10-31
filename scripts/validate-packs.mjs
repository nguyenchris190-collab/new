#!/usr/bin/env node
// Validates every course pack in src/data/packs/: JSON shape, answer keys,
// distractor uniqueness, and that every $…$ / $$…$$ segment renders in KaTeX
// with throwOnError enabled. Run: npm run validate:packs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import katex from 'katex';

import { fileURLToPath } from 'node:url';
const DIR = fileURLToPath(new URL('../src/data/packs/', import.meta.url));
const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const METHOD_REFS = new Set([
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11',
  'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17',
]);
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

function checkMethodRefs(where, refs) {
  if (refs === undefined) return;
  if (!Array.isArray(refs)) return fail(where, 'methodRefs must be an array');
  refs.forEach((ref, i) => {
    if (typeof ref !== 'string' || !ref) fail(`${where} methodRefs[${i}]`, 'method reference must be a non-empty string');
    else if (!METHOD_REFS.has(ref)) fail(`${where} methodRefs[${i}]`, `unknown method reference ${ref}`);
  });
}

function checkImageRef(where, image) {
  if (!image || typeof image !== 'object') return fail(where, 'image must be an object with src and alt');
  if (typeof image.src !== 'string' || !image.src) return fail(where, 'image src must be a non-empty string');
  if (typeof image.alt !== 'string' || !image.alt) fail(where, 'image alt must be a non-empty string');
  if (image.src && !/^(?:https?:)?\/\//.test(image.src)) {
    const local = image.src.replace(/^\//, '');
    if (!existsSync(join(PUBLIC_DIR, local))) fail(where, `image file not found: ${image.src}`);
  }
}

function checkStep(where, s) {
  if (!Array.isArray(s.choices) || s.choices.length < 2) return fail(where, 'needs at least 2 choices');
  if (new Set(s.choices.map((c) => c.replace(/\s+/g, ''))).size !== s.choices.length) fail(where, 'duplicate choices');
  if (!Number.isInteger(s.answer) || s.answer < 0 || s.answer >= s.choices.length) fail(where, `answer index ${s.answer} out of range`);
  const hasParallelMetadata = Array.isArray(s.feedback) || Array.isArray(s.images);
  if (hasParallelMetadata && s.choices.length !== 4) fail(where, 'finals choices with feedback/images need exactly 4 options');
  if (Array.isArray(s.feedback)) {
    if (s.feedback.length !== s.choices.length) fail(where, `feedback length ${s.feedback.length} does not match choices length ${s.choices.length}`);
    s.feedback.forEach((t, i) => checkMath(`${where} feedback ${i}`, t));
  }
  if (Array.isArray(s.images)) {
    if (s.images.length !== s.choices.length) fail(where, `images length ${s.images.length} does not match choices length ${s.choices.length}`);
    s.images.forEach((img, i) => checkImageRef(`${where} image ${i}`, img));
  }
  checkMethodRefs(where, s.methodRefs);
  [s.prompt, s.solution, ...(s.choices ?? []), ...(s.hints ?? [])].forEach((t, i) => checkMath(`${where}#${i}`, t));
}

function checkScenario(where, q) {
  const scenario = q.scenario;
  if (scenario === undefined) return;
  if (!scenario || typeof scenario !== 'object') return fail(where, 'scenario must be an object');
  checkMath(`${where} scenario prompt`, scenario.prompt);
  if (Array.isArray(scenario.instructions) && scenario.instructions.length !== q.steps.length) {
    fail(where, `scenario has ${scenario.instructions.length} instructions for ${q.steps.length} shared steps`);
  }
  (scenario.instructions ?? []).forEach((t, i) => checkMath(`${where} scenario instruction ${i}`, t));
  const extra = scenario.extraSteps ?? [];
  if (!Array.isArray(extra)) fail(where, 'scenario.extraSteps must be an array');
  else {
    if (extra.length > 2) fail(where, `scenario has ${extra.length} extra steps (maximum 2)`);
    extra.forEach((s, i) => checkStep(`${where} scenario step ${i + 1}`, s));
  }
  checkMath(`${where} scenario interpretation`, scenario.interpretation);
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
    checkMethodRefs(where, q.methodRefs);
    if (q.promptImage !== undefined) checkImageRef(`${where} promptImage`, q.promptImage);
    checkScenario(where, q);
    if (Array.isArray(q.steps)) {
      if (q.steps.length < 2 || q.steps.length > 6) fail(where, `multi-step questions use 2–6 steps (has ${q.steps.length})`);
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
