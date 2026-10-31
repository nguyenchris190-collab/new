# MAT1903 Finals Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the MAT1903 final-exam scenario, image, prompt-image, and method-reference features without migrating the existing pack or changing its core schema.

**Architecture:** Extend the existing `choices`/`answer`/`steps` runtime with optional parallel metadata. Parse only the supplied `q-h25-q2` content into that runtime, preserving the intra questions unchanged.

**Tech Stack:** React 19, TypeScript, Tailwind, KaTeX, static JSON pack, existing Node pack validator.

**Spec:** `DrillEngine_Finals_Spec.md` and the user's follow-up correction in this session.

## Global Constraints

- Do not migrate the pack to an `options`/`isCorrect` schema.
- Keep existing fields and validator rules, including duplicate-choice rejection.
- Add only optional `scenario`, `images`, `promptImage`, and `methodRefs` fields.
- Use unique neutral sketch labels `Graphe 1`–`Graphe 4`; store images in a parallel `images` array.
- Convert only `q-h25-q2`; leave existing questions untouched.
- Shared-step cap: 6; Contexte extra steps: up to 2.
- `npm run validate:packs` and `npm run build` must pass.

## Review Focus

- Contexte-mode step counts must include exactly the supplied two interpretation steps after six shared steps.
- Switching Examen/Contexte must be unavailable after any answer check, hint, or reveal.
- Image choices must preserve the existing high-contrast and wrong-answer cues.
- Context attempts must not create Examen mastery in topic stats or question-selection history.
- Existing imported packs without the new fields must parse and render exactly as before.

---

### Task 1: Finals schema and parser support

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/parser.ts`
- Modify: `src/lib/session.ts`
- Modify: `src/state/StoreContext.tsx`

- [ ] Add optional `ImageRef`, `Scenario`, `Step.images`, `Step.feedback`, `Step.methodRefs`, `Question.promptImage`, `Question.methodRefs`, and `Question.scenario` in repo naming.
- [ ] Add optional `ItemState.contextMode` and `Attempt.contextMode`.
- [ ] Parse `images`, `feedback`, `methodRefs`, `promptImage`, and `scenario` without requiring them.
- [ ] Initialize Contexte items with six shared states plus two scenario states.
- [ ] Record `contextMode` on completed attempts.
- [ ] Run `npm run typecheck`; expected PASS.

### Task 2: Scenario mode and stats behaviour

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/storage.ts`
- Modify: `src/lib/analytics.ts`
- Modify: `src/state/StoreContext.tsx`
- Modify: `src/screens/QuizRunner.tsx`
- Modify: `src/screens/questionShared.tsx`
- Modify: `src/screens/SequentialQuestion.tsx`
- Modify: `src/screens/SingleMCQuestion.tsx`

- [ ] Add a global persisted last mode, defaulting to Examen.
- [ ] Render the toggle only when `question.scenario` exists and disable it after the first answer, hint, or reveal.
- [ ] Swap the question prompt and shared-step prompts for `scenario.prompt` and `scenario.instructions` in Contexte mode.
- [ ] Append the two scenario steps after the shared steps in Contexte mode.
- [ ] Render question- and step-level `methodRefs`, `promptImage`, and the scenario interpretation.
- [ ] Exclude Contexte attempts from Examen mastery, last-result selection, and clean-streak calculations.
- [ ] Run `npm run typecheck`; expected PASS.

### Task 3: Image option grid and per-choice feedback

**Files:**
- Modify: `src/screens/ChoiceStep.tsx`

- [ ] When `step.images` has entries, render choices in a responsive 2-column card grid, falling back to one column on narrow screens.
- [ ] Show the image above its neutral choice label and preserve letter badges, selection, wrong, correct, and high-contrast states.
- [ ] Render the parallel `feedback` entry for a checked wrong choice.
- [ ] Run `npm run typecheck`; expected PASS.

### Task 4: Convert and bundle only `q-h25-q2`

**Files:**
- Create: `public/packs/mat1903-calc/img/h25-q2-sketch-A.svg`
- Create: `public/packs/mat1903-calc/img/h25-q2-sketch-B.svg`
- Create: `public/packs/mat1903-calc/img/h25-q2-sketch-C.svg`
- Create: `public/packs/mat1903-calc/img/h25-q2-sketch-D.svg`
- Modify: `src/data/packs/mat1903-calc.json`
- Modify: `src/data/bundledPacks.ts`
- Modify: `scripts/validate-packs.mjs`

- [ ] Copy the four supplied SVG assets to the public asset path.
- [ ] Append `q-h25-q2` under `Pilier 6 · Étude complète d'une fonction rationnelle`, preserving six shared steps and two scenario steps.
- [ ] Convert its original option metadata into `choices`, `answer`, parallel `images`, parallel `feedback`, `methodRefs`, `prompt`, and `solution` using repo naming.
- [ ] Use `Graphe 1`, `Graphe 2`, `Graphe 3`, and `Graphe 4` for the sketch step choices.
- [ ] Validate image paths, scenario instruction length, four options, exactly one correct answer, and shared/extra step caps.
- [ ] Raise the multi-step cap only as needed for 6 shared + 2 scenario steps while keeping the duplicate-choice rule unchanged.
- [ ] Bump the bundled refresh version and pack metadata without touching existing questions.
- [ ] Run `npm run validate:packs`; expected `All packs valid.`

### Task 5: End-to-end verification

- [ ] Run `npm run build`; expected validator, typecheck, and Vite build PASS.
- [ ] Inspect the built output for the four SVG assets.
- [ ] Check `git diff --stat` and ensure existing question JSON is untouched apart from allowed top-level metadata and the appended question.
- [ ] Report any visual/browser checks that could not be performed.

### Task 6: Author derivative and piecewise finals questions

**Files:**
- Modify: `src/data/packs/mat1903-calc.json`

- [ ] Append `q-h25-1a` … `q-h25-1e`, `q-h24-1a` … `q-h24-1e`, and `q-a23-1a` … `q-a23-1e` under `Pilier 5 · Dérivées transcendantes & dérivabilité` as single questions with exactly four choices and one correct answer.
- [ ] Use the verified key’s correct derivatives and ready-made mistakes; add one catalog-based distractor where the key supplies only two.
- [ ] Give each item concise hints, per-choice feedback, and the key’s method references.
- [ ] Append `q-a23-1-2` as a four-step piecewise/dérivabilité question using the verified piecewise, continuity, one-sided derivative and point-anguleux answers.
- [ ] Run `npm run validate:packs`; expected PASS.

### Task 7: Author rational-study questions and sketch assets

**Files:**
- Create: `public/packs/mat1903-calc/img/h24-q2-sketch-{A,B,C,D}.svg`
- Create: `public/packs/mat1903-calc/img/a23-q2-sketch-{A,B,C,D}.svg`
- Modify: `src/data/packs/mat1903-calc.json`

- [ ] Append `q-h24-q2` and `q-a23-q2` under `Pilier 6 · Étude complète d'une fonction rationnelle` with six shared steps: domain, asymptotes, critical numbers, second-derivative values, tableau, sketch.
- [ ] Use the verified key’s exact values; for A23, include the requested “Montrez que” algebra for $f'$ and $f''$.
- [ ] Author four parity-matched sketch SVGs for each question, differing only in asymptote side/position, horizontal asymptote, extremum or concavity.
- [ ] Use neutral `Graphe 1`–`Graphe 4` labels with parallel image metadata and feedback.
- [ ] Run `npm run validate:packs`; expected PASS.

### Task 8: Author interval-study questions and sketch assets

**Files:**
- Create: `public/packs/mat1903-calc/img/h25-q3-sketch-{A,B,C,D}.svg`
- Create: `public/packs/mat1903-calc/img/a23-q3-sketch-{A,B,C,D}.svg`
- Create: `public/packs/mat1903-calc/img/h24-q3-sketch-{A,B,C,D}.svg`
- Modify: `src/data/packs/mat1903-calc.json`

- [ ] Append `q-h25-q3`, `q-a23-q3`, and `q-h24-q3` under `Pilier 7 · Étude sur un intervalle & fonctions exponentielles` with the verified endpoint, critical-number and concavity conventions.
- [ ] Add the supplied natural scenarios to H25 Q3 and H24 Q3, including Contexte-only interpretation steps and interpretation text; do not add a scenario to A23 Q3.
- [ ] Author four parity-matched sketch SVGs for each question.
- [ ] Use neutral `Graphe 1`–`Graphe 4` labels with parallel image metadata and feedback.
- [ ] Run `npm run validate:packs`; expected PASS.

### Task 9: Author optimization questions and prompt figures

**Files:**
- Create: `public/packs/mat1903-calc/img/h25-q4-triangle.svg`
- Create: `public/packs/mat1903-calc/img/a23-q4-rectangle.svg`
- Modify: `src/data/packs/mat1903-calc.json`

- [ ] Append `q-h25-q4`, `q-h24-q4`, and `q-a23-q4` under `Pilier 8 · Optimisation` with five shared steps following M17.
- [ ] Use the verified key’s functions, domains, derivatives, critical numbers, tests and contextual final answers.
- [ ] Include the H25 triangle and A23 rectangle prompt images; no scenario field is needed because the exam prompts are already contextual.
- [ ] Highlight closed-interval endpoint comparison for A23 Q4, including the two maximum points.
- [ ] Run `npm run validate:packs`; expected PASS.

### Task 10: Full-pack verification and handoff

- [ ] Bump the pack and bundled refresh versions for the completed inventory.
- [ ] Run `npm run validate:packs` and `npm run build`; both PASS.
- [ ] Inspect built output for every new SVG asset.
- [ ] Run a headless-browser smoke check that reaches representative new questions and image options without page errors.
- [ ] Check the final diff confirms the original 27 intra questions remain semantically untouched.
