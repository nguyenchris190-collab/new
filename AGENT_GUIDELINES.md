---
title: DrillEngine Agent Guidelines
tags: [drillengine, manual, agents]
---

# DrillEngine: Agent Guidelines

This is the permanent developer manual for any AI agent (or human) working on DrillEngine. Read it before changing code or authoring course packs. If a rule here conflicts with a one-off request, ask before breaking the rule.

> [!summary] TL;DR
> - DrillEngine is a local-first tool for one person. Browser `localStorage` is the source of truth.
> - There are no auth walls, no database migrations, and no backend you have to run.
> - The parser accepts loose input and must never crash on a missing optional field.
> - All problems are static, pre-verified JSON. Runtime math generators are forbidden.
> - `npm run build` must pass. It runs the pack validator, the type checker, and the bundler.

---

## 1. System core principles

### 1.1 Single-user, local-first
- All state lives in `localStorage` under `drillengine:v1` (see `src/lib/storage.ts`). The theme is stored separately under `drillengine:theme`.
- Cloud sync (`src/lib/sync.ts`) is optional and best-effort. It pushes and pulls the whole state as one JSON document, addressed by a plain-text sync key, to Supabase or a Firebase RTDB. Sync must never block the UI or gate any feature.
- Merging is append-only for history: attempts and sessions are unioned by id. For courses, the newer `updatedAt` wins. Removed course ids are kept in `state.removed` so that sync does not bring them back.

### 1.2 Zero auth, zero migrations, zero backend
- Do not add logins, JWTs, user tables, or server code.
- Schema changes are made by tolerant loading, not migrations. `loadState()` shallow-merges saved data over defaults, and new fields must be optional or have defaults.
- Bundled packs are refreshed by bumping `BUNDLED_VERSION` in `src/data/bundledPacks.ts`. `seed()` in `StoreContext` installs or refreshes the bundled packs and purges retired placeholder packs listed in `RETIRED_PACKS`.

### 1.3 Duck-typing permissive parser
- `src/lib/parser.ts` accepts many field aliases (`question|prompt|stem`, `choices|options`, `answer|correct|correctIndex`, and so on), letter or index or text answers, and several pack shapes.
- **Never throw on a missing optional field.** Skip a malformed question with a warning, and hide UI elements whose data is absent: no hints means no hint button, no cheat sheet means no `[Doc]` button.
- Question ids are taken from `id`. When `id` is missing, they come from a content hash, so re-importing a pack keeps the attempt history.

### 1.4 No runtime procedural generators
- **`generators.ts` (or any runtime problem generator) is explicitly forbidden.** Every problem is static JSON that a person or agent has verified before shipping.
- Scripts that help author a pack must stay outside the repo, or under `scripts/` as authoring tools. The app must only read finished JSON.

### 1.5 Code map
| Concern | Location |
| --- | --- |
| App state, scoring, persistence, sync wiring | `src/state/StoreContext.tsx` |
| Pack parsing (JSON + `cheatSheetMarkdown`) | `src/lib/parser.ts` |
| Gap tracker, streaks, pacing, daily activity | `src/lib/analytics.ts` |
| Question selection, clean-solve rule | `src/lib/session.ts` |
| Quote engine | `src/lib/quotes.ts`, `src/data/quotes.json` |
| "Fix with Agent" prompt builder | `src/lib/report.ts`, `src/screens/ReportModal.tsx` |
| Bundled packs | `src/data/packs/*.json`, `src/data/bundledPacks.ts` |
| Pack validator | `scripts/validate-packs.mjs` (`npm run validate:packs`) |

### 1.6 Scoring contract
- A question is a **clean solve** only if every step was correct on its first check, with **no hints viewed** and **no reveal** (`isCleanSolve` in `src/lib/session.ts`). Only clean solves count toward accuracy and **Solid** status in the Gap Tracker.
- Help is voluntary. **Hint** and **Reveal Full Derivation** are available at any moment. Using either marks the attempt as assisted. Retrying after a miss is always allowed.
- Gap Tracker statuses are relative to the median attempt volume across the course's topics:
  - **Unexplored:** fewer attempts than half the median, or zero attempts.
  - **Solid:** at least 70% clean solves.
  - **Needs Work:** below 70% clean solves.

---

## 2. Course pack ingestion manual

### 2.1 From syllabus/PDF to `pack.json`
1. **Inventory the syllabus.** List each numbered section, such as `1.a`, `1.b`, `2.a`, and keep those labels as `topic` prefixes so the Gap Tracker sorts and reads like the course outline.
2. **Harvest exam patterns.** For each section, collect 3–6 representative exercises from past exams or problem sets. Note the *classic slip-ups* each one invites (see §2.4).
3. **Decide the format for each problem:**
   - Conceptual or reasoning items become **single multiple choice** with `"category": "theory"`.
   - Computations become **2–3 step sequential** questions with `"category": "practice"`. Each step is one decision a student makes on paper, such as factoring, choosing a conjugate, or evaluating.
4. **Make it calculator-free.** Choose parameters so that every intermediate value is an integer or a simple rational. Roots must be perfect squares (`\sqrt{4}`, `\sqrt{9}`, `\sqrt{16}`, `\sqrt{25}`, `\sqrt{49}`, `\sqrt{64}`, `\sqrt{100}`). Never leave an unresolved surd like `\sqrt{17}/3`.
5. **Write the distractors** (§2.4), the hints, which should be progressive with the gentlest first, and the per-step `solution` plus a final full-derivation `solution`.
6. **Verify every answer key independently**, for example with a computer algebra system in a scratch script. Check that no distractor equals the correct value.
7. **Write the JSON** using the KaTeX escaping contract (§2.3), put it in `src/data/packs/`, and run `npm run validate:packs`.
8. To make it a bundled pack, register it in `src/data/bundledPacks.ts` and bump `BUNDLED_VERSION`. Otherwise users import it through **Import Course Pack**.

### 2.2 Schema
```jsonc
{
  "id": "mat1903-calc",              // REQUIRED for bundled packs (stable; used for history + reports)
  "title": "Differential Calculus",  // REQUIRED
  "code": "MAT1903",                 // optional, shown above the title
  "icon": "calculus",                // optional: calculus|sigma|matrix|graph|geometry|probability|book
  "description": "…",                // optional
  "version": 1,                      // optional, informational
  "cheatSheetMarkdown": "## Section\n- item with $math$\n$$display$$", // optional
  "cheatSheet": [ { "title": "…", "items": ["…"] } ],              // optional alternative
  "questions": [
    {
      "id": "mat1903-1b-02",         // REQUIRED for authored packs; never reuse or renumber
      "topic": "1.b Indeterminate Limits (0/0)", // REQUIRED (defaults to "General")
      "category": "theory",          // "theory" | "practice"
      "difficulty": 2,               // optional 1–3
      "question": "…",               // REQUIRED stem
      // single multiple choice:
      "choices": ["…", "…", "…", "…"], // REQUIRED, ≥ 2, unique
      "answer": 0,                   // REQUIRED: index (letter "A" or exact choice text also accepted)
      "hints": ["…"],                // optional, progressive
      "solution": "…"                // optional, full derivation
    },
    {
      "id": "…", "topic": "…", "category": "practice", "question": "…",
      "steps": [                      // presence of steps ⇒ sequential accordion question
        { "prompt": "…", "choices": ["…"], "answer": 1, "hints": ["…"], "solution": "…" }
      ],
      "solution": "full derivation shown after the last step"
    }
  ]
}
```
Choice order is shuffled in every session, so the position of the correct answer in the JSON does not matter. Still, vary it so the raw file doesn't leak a pattern.

### 2.3 KaTeX escaping contract (the double-backslash rule)
- In JSON, a backslash must be escaped. **Every LaTeX command is written with two backslashes**: `"\\lim_{x \\to 2}"`, `"\\frac{a}{b}"`, `"\\sqrt{x}"`. A single `\f` or `\t` silently becomes a form feed or a tab and breaks rendering.
- Delimiters: `$…$` or `\\(…\\)` for inline math, and `$$…$$` or `\\[…\\]` for display math. Display math gets its own horizontal scroll container.
- Use `\\dfrac` in choices and stems where a fraction must stay readable, `\\displaystyle\\lim` for limits in running text, and `\\text{…}` for words inside math.
- A literal dollar sign is written `\\$`.
- The validator renders every math segment with `throwOnError: true` and `strict: "error"`. If it fails, the pack fails the build.

### 2.4 Distractor design
Every wrong option must be a **real student failure mode** that leads to a specific wrong answer. Never use filler. Common patterns:
- Evaluating $\frac00$ directly and calling it $0$, or saying "does not exist", before simplifying.
- **Conjugate errors:** multiplying only the numerator, using the wrong conjugate sign, or forgetting to square the constant ($x+5-3$ instead of $x+5-9$).
- **Sign distribution:** $(x-1)-(x+1)$ written as $x-1-x+1$. Swapping the order of the quotient-rule numerator. A wrong sign inside a factored binomial.
- **Chain rule:** dropping the inner derivative, or putting the power on the wrong layer.
- **One-sided limits:** treating $|x-a|$ as $x-a$ on both sides, or forgetting that $\sqrt{x^2}=|x|=-x$ as $x\to-\infty$.
- **Power rule** with negative or fractional exponents: subtracting 1 in the wrong direction ($-\tfrac13 \to -\tfrac23$ instead of $-\tfrac43$).
- **Tangent and normal lines:** using $f'(a)$ as the $y$-coordinate, taking only the reciprocal or only the negative for the normal slope, or a sign slip when distributing $m(x-x_0)$.
- **Formal definition:** dropping the $h$ in the denominator, or plugging in $h=0$ before cancelling.

### 2.5 Multi-step accordion decomposition
- Use 2–3 steps. Each step is one atomic decision whose result the next step builds on, for example: set up, then simplify, then evaluate.
- A step prompt states what to do ("Multiply by the conjugate…"), not the answer.
- The step `solution` shows that step's algebra. The question-level `solution` shows the whole derivation in display math.
- Step $n+1$ stays hidden until step $n$ is verified. Do not write a step that only makes sense if the student can see a later one.

---

## 3. Tiered quotes system protocol

### 3.1 Philosophy
The quotes are stoic in tone. They are anti-anxiety, focused on process, and non-judgmental. They never praise talent and never shame a mistake. A first slip gets a calm, procedural line. Higher-energy lines are kept for real persistence or milestones, which gives the UI emotional pacing without nagging. Quotes are always quiet and non-blocking. Most are dismissible.

### 3.2 Schema (`src/data/quotes.json`)
```jsonc
{
  "fatigue": [ { "id", "text", "source", "trigger" } ],
  "error":   { "tier1_first_miss": [], "tier2_repeated_misses": [], "tier3_stuck": [] },
  "streak":  { "tier1_clean_solve": [], "tier2_sustained_run": [], "tier3_milestone": [] },
  "sessionStart": { "same_day": [], "new_day": [] },
  "gaps": [ { "id", "text", "source" } ]
}
```
Ids are stable, so code may reference them; for example, the guardrail refers to `strk-t3-02`. To add a quote, append it with a new id. Never renumber.

### 3.3 Trigger thresholds (implemented in `src/lib/quotes.ts`)
| Category | Trigger | Pool |
| --- | --- | --- |
| error | 1st failed check on the active question (counted across all its steps) | `tier1_first_miss` |
| error | 2–3 failed checks | `tier2_repeated_misses` |
| error | 4+ failed checks | `tier3_stuck`, plus a soft prompt offering **Reveal Full Derivation** or **Skip for now** |
| streak | clean streak of 1–4 in this session | `tier1_clean_solve` |
| streak | clean streak of 5–9 | `tier2_sustained_run` |
| streak | streak of 10+, or today's solved count reaching 10/25/50/100 (Captain's Log milestone) | `tier3_milestone` |
| streak guardrail | the fatigue notice has fired this session (`active.fatigueFired`) | exclude `strk-t3-02` ("footless bird") |
| sessionStart | last logged session was on the same calendar day | `same_day` |
| sessionStart | new calendar day, or first launch | `new_day` |
| fatigue | session longer than 45 min | `fatigue-01` |
| fatigue | pacing drop (recent questions take more than 2× the early ones and more than 90 s) | `fatigue-02` |
| fatigue | resuming after a break of 10 min or more | `fatigue-03` |
| fatigue | resuming after a break of 2–10 min | `fatigue-04` |
| gaps | the course has sections marked Needs Work or Unexplored | `gaps`, shown above the Topic Mastery table, one per course per day |

Selection is **deterministic per seed** (session id + question id + step + miss count). A quote therefore never flickers on re-render and survives a reload.

---

## 4. Maintenance checklist for future sessions

Before you push:
- [ ] `npm run build`, which runs the pack validator, then `tsc -b`, then `vite build`. All must pass with zero errors.
- [ ] In Chromium (Playwright is pre-installed in the cloud environment; use `executablePath` under `/opt/pw-browsers`), at both **1280px** and **375px** widths:
  - [ ] The Hub renders and the MAT1903 card opens the Course Workspace.
  - [ ] **Hint** and **Reveal Full Derivation** work before any wrong attempt.
  - [ ] **Report / Fix** copies a prompt that contains valid question JSON.
  - [ ] Error and streak quotes appear at the expected tiers.
  - [ ] `document.documentElement.scrollWidth <= innerWidth` holds, so there is no page-level horizontal scroll.
  - [ ] There are no `pageerror` or console errors.

UI invariants to preserve:
- **Strikethrough over KaTeX.** `text-decoration: line-through` does not cross KaTeX boxes. Eliminated options use the `.struck` class in `src/index.css`, which draws an absolutely positioned 2px rule through an inline-block wrapper at reduced opacity. Keep both the wrapper and the rule.
- **Math overflow safety.** Every display equation renders inside `.math-scroll` (`overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; max-width: 100%`), and inline math inside `.math-inline-scroll`. A long formula must never widen the page.
- **Touch targets.** Every button, option, and chip is at least **48×48 px**. Use the `min-h-touch` and `min-w-touch` utilities, or `.btn`, `.btn-icon`, `.btn-primary`.
- **iOS zoom.** All inputs, selects, and textareas use a font size of at least 16px.
- **Icons** are inline monoline SVGs (1.75px stroke, one accent part through `.ic-accent` or `.ic-fill`). **No emoji** anywhere in the UI.
- **Themes** are defined only through the RGB tokens in `src/index.css`. Do not hard-code colours in components.
- **Store actions** in `StoreContext` are referentially stable. Effects depend on them, and making them unstable once caused a pause/resume render loop.
