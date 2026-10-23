# DrillEngine

A personal, offline-first math practice app. Multiple-choice and step-by-step questions only, so you never type formula syntax. React + Vite + TypeScript + Tailwind, with KaTeX bundled locally (no CDN).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static output in dist/ (relative paths, so it can be hosted anywhere)
```

## Architecture

| Area | Files |
| --- | --- |
| Screens | `src/screens/CentralHub.tsx`, `CaptainsLog.tsx`, `CourseWorkspace.tsx`, `GapTracker.tsx`, `SessionConfigurator.tsx`, `QuizRunner.tsx`, `SingleMCQuestion.tsx`, `SequentialQuestion.tsx`, `ChoiceStep.tsx`, `CheatSheetDrawer.tsx`, `NavigatorDrawer.tsx`, `SessionSummary.tsx` |
| State | `src/state/StoreContext.tsx` (app state, `localStorage` persistence, scoring, background sync), `src/state/ThemeContext.tsx` |
| Logic | `src/lib/parser.ts` (permissive pack import), `analytics.ts` (gap tracker, daily activity, pacing), `session.ts` (question selection), `sync.ts`, `storage.ts` |
| UI kit | `src/components/` (KaTeX `MathText`, monoline SVG icons, modal/drawer, import & settings modals) |

All state is stored in `localStorage` under `drillengine:v1`. The theme is stored under `drillengine:theme`. An active session survives a page reload.

### Scoring

* A question counts as **correct** only if every step was right on the first check, with no reveal. Retrying after a miss is always allowed, but it doesn't change that first result.
* Hints appear only after a wrong check. After two wrong checks you can use **Reveal answer**.
* Each attempt records how many tries it took, how many hints you used, your confidence, and how long it took.

### Topic statuses (Gap Tracker)

The tracker takes the median number of attempts per topic across the course. Each topic then gets one status:

* **Unexplored**: no attempts, or fewer attempts than half the median.
* **Solid**: accuracy of at least 70%.
* **Needs Work**: accuracy below 70%.

### Question selection

Questions you have never seen and questions you last got wrong come first. Next come correct answers that were low-confidence or needed hints, and last come confident correct answers. A little randomness is mixed in. **Balanced** mode keeps the theory/practice mix in proportion to the question bank.

## Course pack format

The parser is permissive. Unknown fields are ignored and missing optional fields are hidden in the UI. A malformed question is skipped with a warning instead of failing the whole import.

```jsonc
{
  "id": "MAT1903",                 // optional; falls back to code or a title hash
  "code": "MAT1903",
  "title": "Differential Calculus",
  "icon": "calculus",              // calculus | sigma | matrix | graph | geometry | probability | book
  "description": "…",
  "cheatSheet": [                  // or a string, or { "Section": ["…"] }
    { "title": "Derivative rules", "items": ["$$\\frac{d}{dx}x^n = nx^{n-1}$$"] }
  ],
  "questions": [
    {
      "id": "lim-1",
      "topic": "Limits",           // aliases: section, chapter, unit
      "category": "practice",      // "theory"/"concept" → theory, anything else → practice
      "question": "Evaluate $\\lim_{x\\to 3}\\frac{x^2-9}{x-3}$.",
      "choices": ["$0$", "$3$", "$6$", "DNE"],
      "answer": 2,                 // index, letter "C", or the choice text
      "hints": ["Factor the numerator."],
      "solution": "$$\\lim_{x\\to3}(x+3)=6$$"
    },
    {
      "topic": "Chain Rule",
      "question": "Differentiate $\\ln(\\cos x^2)$.",
      "steps": [                   // presence of steps → progressive multi-step question
        { "prompt": "Outer derivative?", "choices": ["…", "…"], "answer": 0, "hints": ["…"], "solution": "…" },
        { "prompt": "Final result?",    "choices": ["…", "…"], "answer": 1 }
      ],
      "solution": "Full derivation shown after the last step."
    }
  ]
}
```

Other accepted shapes:

* a bare array of questions
* `{ "courses": [ … ] }` for several packs at once
* `{ "topics": [ { "name": "Limits", "questions": [ … ] } ] }`

You can also mark the correct choice in place, as in `"options": [{ "text": "…", "correct": true }]`. Math goes in `$…$` or `\(…\)` for inline and `$$…$$` or `\[…\]` for display. Choices that contain bare LaTeX are rendered as math automatically.

## Optional cloud sync (no login)

Open **Settings**, pick a provider, and enter a sync key. You can type your own key or press **Generate**. Use the same key on every device. The app saves the whole state as one JSON document and merges it in the background: history is append-only, and for courses the newer version wins.

* **Supabase**: you need the project URL, the anon key, and this table:
  ```sql
  create table drillengine_sync (sync_key text primary key, payload jsonb, updated_at timestamptz default now());
  ```
  RLS must allow anon read and write on that table. This is a personal tool, so treat the sync key as the secret.
* **Firebase Realtime Database**: you only need the database URL. Its rules must allow read and write under `/drillengine`.

This sync is designed for convenience, not security. Anyone who has both the endpoint and your key can read your progress.
