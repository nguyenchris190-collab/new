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
> - MAT1903 derivations use the UdeM intra sentences in §2.6. The student still only taps; the choices are those sentences.
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
   - Computations become **2–4 step sequential** questions with `"category": "practice"`. Each step is one decision a student makes on paper. For MAT1903, the decision is a formal corrigé line: the domain, an indeterminate form or a conjugate expansion, then the geometric or continuity conclusion (§2.6).
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
      "id": "mat1903-p1-07",         // REQUIRED for authored packs; never reuse or renumber
      "topic": "Pilier 1 · Domaine, asymptotes et limites", // REQUIRED (defaults to "General")
      "source": "Intra A25 · Q1.3",   // optional: exam reference, shown as a tag in the session
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
- **Tangent and normal lines:** using $f'(a)$ as the $y$-coordinate, taking only the reciprocal or only the negative for the normal slope, or a sign slip when solving $f(a) = m(a) + b$.
- **UdeM notation:** writing $\setminus$ instead of the minus sign in $\mathbb{R} - \{a\}$, calling a cancelled factor a vertical asymptote, dropping one of $\lim_{x\to-\infty}$ and $\lim_{x\to+\infty}$, or forgetting « car pour $x < 0$, $\sqrt{x^2} = -x$ ».
- **Continuity:** computing limits after $a \notin \text{Dom}_f$, or declaring continuity from a single one-sided limit.
- **Formal definition:** dropping the $h$ in the denominator, or plugging in $h=0$ before cancelling.

### 2.5 Multi-step accordion decomposition
- Use 2–4 steps. Each step is one atomic decision whose result the next step builds on. A full asymptote study (domain, each root of the denominator, horizontal asymptotes) uses all 4; most other problems need 2–3.
- For MAT1903, the three steps are usually: formal domain, intermediate indeterminate form or conjugate expansion, then the formal conclusion sentence (§2.6). The choices are those sentences. The prompt names the step; it does not reveal the line.
- A step prompt states what to do, not the answer. Official transition phrases are allowed as the prompt, for example « Levons l'indétermination en multipliant par l'expression conjuguée du numérateur ».
- The step `solution` shows that step's algebra. The question-level `solution` shows the whole derivation in display math, with the headers and conclusion sentences from §2.6.
- Step $n+1$ stays hidden until step $n$ is verified. Do not write a step that only makes sense if the student can see a later one.
- The interaction stays tap-only. Do not add a text field so the student can type the sentence. The formal line is one of the choices, and the full write-up is the revealed derivation.

### 2.6 UdeM MAT1903 corrigé contract
MAT1903 stems, choices, hints, and derivations follow the Université de Montréal intra corrigé. Question ids are stable once published (the v4 pack retired the v1–v3 ids when it moved to the 3-exam blueprint in §2.7). Arithmetic stays calculator-free: integer roots and rational values only. French exam sentences below are copied as written; do not paraphrase them back into English shorthand. Guillemets « » stay outside math delimiters, because KaTeX strict mode rejects them inside `\text`.

**Domain.** Header: `Domaine de la fonction f`. Then the slash form $\text{Dom}_f = \{x \in \mathbb{R} \ / \ \text{dénominateur} \neq 0\}$, then the factored condition, then set subtraction with a minus sign: $\text{Dom}_f = \mathbb{R} - \{2, 3\}$. Do not use `\setminus`.

**Vertical asymptotes.** Header: `Recherche des asymptotes verticales :`. A root that gives $0/0$ is written by direct substitution and labeled `forme indéterminée`. After cancelling, state the restriction `pour x ≠ a`. A zero denominator is tagged in parentheses, for example `forme (1/0^+)` or `forme (5/(-2 · 0^+))`. If the line is a vertical asymptote: `La droite d'équation x = 3 est une asymptote verticale à la courbe représentative de la fonction f.` If it is not: `La droite d'équation x = 2 n'est pas une asymptote verticale à la courbe représentative de la fonction f.`

**Horizontal asymptotes.** Header: `Recherche des asymptotes horizontales :`. Compute $\lim_{x \to -\infty} f(x)$ and $\lim_{x \to +\infty} f(x)$ as two separate evaluations. Factor the highest power out of the numerator and the denominator before taking the limit; do not jump to a degree shortcut. Canonical form: $\lim_{x \to -\infty} \frac{x\left(1 - \frac{2}{x}\right)}{x^2\left(1 - \frac{5x}{x^2} + \frac{6}{x^2}\right)} = \lim_{x \to -\infty} \frac{1 - \frac{2}{x}}{x\left(1 - \frac{5}{x} + \frac{6}{x^2}\right)}$ pour $x \neq 0$ $= \frac{1 - 0}{-\infty(1 - 0 + 0)} = \frac{1}{-\infty} = 0$. For a radical, write « car pour $x < 0$, $\sqrt{x^2} = -x$ » on the way to $-\infty$, and « car pour $x > 0$, $\sqrt{x^2} = x$ » on the way to $+\infty$ (the same sentences with $|x^3| = -x^3$ or $|x^3| = x^3$ when the power is a cube). Conclusion: `La droite d'équation y = L est une asymptote horizontale à la courbe représentative de la fonction f en [-∞ / +∞].` Use one side, `[+∞]` or `[-∞]`, when the two limits differ.

**Indeterminate limits.** Use these transitions: `Levons l'indétermination en réduisant au même dénominateur` ; `Levons l'indétermination en multipliant par l'expression conjuguée du numérateur` ; `On distingue 2 cas : lorsque x → a^- et x → a^+`. When the one-sided limits differ: `On a lim_{x → a^-} ≠ lim_{x → a^+}. On conclut que la lim_{x → a} n'existe pas.`

**Continuity, in this order.** (1) $a \in \text{Dom}_f$. If $a$ is not in the domain, stop and write `La fonction f n'est pas définie en x = a donc elle n'est pas continue en x = a.` Do not keep calculating limits inside that continuity proof. A later classification of the discontinuity is a separate limit study. (2) State $f(a)$. (3) Compute the two lateral limits separately. (4) If they equal $L$ and $f(a) = L$, conclude `La fonction f est donc continue en x = a.` If they differ, the two-sided limit does not exist and `La fonction f est discontinue en x = a.` If it is not continuous: `La fonction f n'est pas continue en x = a donc elle n'est pas dérivable en x = a.`

**Derivative by definition at a boundary.** Open with `Utilisons la définition de la dérivée pour étudier la dérivabilité de la fonction f en x = a`. Evaluate the left-hand and right-hand difference quotients separately. If they differ: `On a donc lim_{h → 0^-} (f(a+h)-f(a))/h ≠ lim_{h → 0^+} (f(a+h)-f(a))/h. La fonction f n'est pas dérivable en x = a, f'(a) n'existe pas.`

**Derivative by definition, rational case.** Compute $f'(a) = \lim_{h \to 0} \frac{f(a+h) - f(a)}{h}$ by reducing to a common denominator, then cancelling $h$ « pour $h \neq 0$ ». If the two lateral difference quotients at a junction are equal: `lim_{h → 0^-} … = lim_{h → 0^+} … = m ⟹ f'(a) = m`.

**Rules and tangents.** Before differentiating, declare the rule in use, in full when several apply: `On utilise les formules : (u · v)' = u'v + uv', (u^r)' = r u^{r-1} u' et (u/v)' = (u'v - uv')/v^2`. Constant traps are graded: $(\pi)' = 0$ and $(5^{12})' = 0$, but $(x^{\pi})' = \pi x^{\pi - 1}$. Declare the power or chain formula the same way when that is the rule in use. For a tangent line: `La pente de la droite tangente au graphe de f(x) en x = a est égale à : f'(a) = m`. Then `L'équation de la droite tangente au graphe de f(x) au point (a, f(a)) est de la forme : y = f'(a)x + b = mx + b`. Then `Sachant que cette tangente passe par le point (a, f(a)), nous avons : f(a) = m(a) + b`. Then `L'équation de la droite tangente au graphe de f(x) au point (a, f(a)) s'écrit donc : y = mx + b`.

### 2.7 MAT1903 3-exam synthesis (H24, A25, H26)
The three official intras (Hiver 2024, Automne 2025, Hiver 2026) reuse one blueprint, down to the functions, the radical sub-expressions, and the traps. The bundled pack (`mat1903-calc`, version 4, 27 questions) mirrors it as **4 canonical pillars**, one `topic` each, so the Gap Tracker shows exactly these four rows:

| Pillar (`topic`) | Questions | What the exams test | Recurring traps |
| --- | --- | --- | --- |
| Pilier 1 · Domaine, asymptotes et limites | 8 (`p1-01`…`p1-08`) | Full study of a rational function: domain, each root of the denominator (hole vs. vertical asymptote), horizontal asymptotes at $-\infty$ and $+\infty$; one complex-fraction limit; two conjugate limits | Simplifying before stating the domain; calling $\frac{0}{0}$ a value; $|x^3|$ and $\sqrt{x^2}$ signs at $-\infty$; swapped one-sided signs |
| Pilier 2 · Continuité par morceaux | 6 (`p2-01`…`p2-06`) | The 4-step continuity proof at a junction, and an interior point outside the domain | Computing limits when $a \notin \text{Dom}_f$; using the wrong branch for $f(a)$; "continuous ⟹ differentiable" |
| Pilier 3 · Dérivée par définition et tangentes | 6 (`p3-01`…`p3-06`) | $f'(a)$ by the definition (rational and radical), lateral difference quotients at a junction, tangent line $y = mx + b$ | Forgetting the conjugate's factor; averaging unequal lateral quotients; solving for $b$ with the wrong sign |
| Pilier 4 · Règles de dérivation | 7 (`p4-01`…`p4-07`) | Product, power and quotient rules on recycled expressions such as $\sqrt[3]{\sqrt{x} + 3x^7}$ and $\left(\frac{x^2 - 1}{x^2 + 1}\right)^6$ | $(\pi)' = 0$ vs. $(x^{\pi})' = \pi x^{\pi - 1}$; dropping the inner derivative; reversing the quotient numerator |

Each question carries a `source` tag (for example `Intra H24 · Q1.a (1)`). Questions marked `Variante calibrée` are calibrated variants of an exam archetype, not verbatim exam items. When a new intra is released: map each of its questions to a pillar, add or update a question with the same corrigé phrasing (§2.6), verify the key with a CAS, bump `BUNDLED_VERSION`, and keep the pillar topics unchanged.

---

## 3. Tiered quotes system protocol

### 3.1 Philosophy
The quotes are stoic in tone. They are anti-anxiety, focused on process, and non-judgmental. They never praise talent and never shame a mistake. A first slip gets a calm, procedural line. Higher-energy lines are kept for real persistence or milestones, which gives the UI emotional pacing without nagging. Quotes are always quiet and non-blocking. Most are dismissible. Tier 3 also includes `err-t3-04` (Kengan Ashura, Ch. 231, « I'll ask you one more time... You wanna fight too? »), a reframed existential challenge for a student who is stuck, and `gaps` includes `gap-05` (« You wanna fight too? ») as an invitation to take on an unexplored section. Neither insults the student. Do not renumber them.

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
| error | 4+ failed checks | `tier3_stuck`; **Reveal Full Derivation** is emphasized and **Skip for now** appears |
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
- [ ] `npm run build`, which runs the pack validator, then `tsc -b`, then `vite build` with service-worker generation. All must pass with zero errors.
- [ ] Work on a feature branch and open PRs against `main`.
- [ ] In Chromium (Playwright is pre-installed in the cloud environment; use `executablePath` under `/opt/pw-browsers`), at both **1280px** and **375px** widths:
  - [ ] The Hub renders and the MAT1903 card opens the Course Workspace.
  - [ ] **Hint** and **Reveal Full Derivation** work before any wrong attempt.
  - [ ] **Report / Fix** copies a prompt that contains valid question JSON.
  - [ ] Error and streak quotes appear at the expected tiers, standalone (no labels or "Not quite" text around them).
  - [ ] `document.documentElement.scrollWidth <= innerWidth` holds, so there is no page-level horizontal scroll.
  - [ ] There are no `pageerror` or console errors.
  - [ ] **Offline:** load `vite preview`, reload once so the service worker controls the page, then call `context.setOffline(true)` and reload. The Hub must render, and a session must show KaTeX glyphs.
  - [ ] **High Contrast:** a wrong pick shows a dashed border with struck text, distinct from a selected option.

UI invariants to preserve:
- **Strikethrough over KaTeX.** `text-decoration: line-through` does not cross KaTeX boxes. Eliminated options use the `.struck` class in `src/index.css`, which draws an absolutely positioned 2px rule through an inline-block wrapper at reduced opacity. Keep both the wrapper and the rule.
- **Math overflow safety.** Every display equation renders inside `.math-scroll` (`overflow-x: auto; overflow-y: hidden; max-width: 100%`), and inline math inside `.math-inline-scroll`. A long formula must never widen the page. Do not give KaTeX's `.vlist-s` strut its 2px width back: that empty cell was turning on a scrollbar across formulas that fit. A thin bar is only for a formula that is actually wider than its box, and it sits in the padding under the glyphs.
- **Touch targets.** Every button, option, and chip is at least **48×48 px**. Use the `min-h-touch` and `min-w-touch` utilities, or `.btn`, `.btn-icon`, `.btn-primary`.
- **iOS zoom.** All inputs, selects, and textareas use a font size of at least 16px.
- **Icons** are inline monoline SVGs (1.75px stroke, one accent part through `.ic-accent` or `.ic-fill`). **No emoji** anywhere in the UI.
- **Themes** are defined only through the RGB tokens in `src/index.css`. Do not hard-code colours in components.
- **High Contrast needs non-colour cues.** In `contrast`, accent, success and danger are all black. Choice buttons carry `data-choice="wrong|selected|correct"`. In High Contrast, a wrong choice gets a 2px **dashed** border and a struck `.choice-label`, a selected one stays solid, and the correct one gets a 3px solid border plus the check icon. Any new state must stay distinguishable without colour.
- **Offline (PWA).** `vite-plugin-pwa` (`registerType: 'autoUpdate'`) generates `dist/sw.js` and precaches the HTML, JS, CSS, icons and all KaTeX `.woff2` fonts (the `.woff`/`.ttf` fallbacks are intentionally excluded). If you add an asset type, extend `workbox.globPatterns` in `vite.config.ts`. Icons live in `public/` (`pwa-192x192.png`, `pwa-512x512.png`, `maskable-512x512.png`, `apple-touch-icon.png`, source `icon.svg`).
- **Store actions** in `StoreContext` are referentially stable. Effects depend on them, and making them unstable once caused a pause/resume render loop.
