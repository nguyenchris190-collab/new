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
