import type { AlgebraAssist, Confidence, ImageRef, ItemState, Question, QuestionMode, StepState } from '../types';
import type { Quote, QuoteTier } from '../lib/quotes';
import { MathText } from '../components/MathText';
import { QuoteLine } from '../components/QuoteLine';
import { IconCheck, IconChevronDown, IconEye } from '../components/icons';

export interface QuestionViewProps {
  question: Question;
  item: ItemState;
  mode: QuestionMode;
  onModeChange: (mode: QuestionMode) => void;
  disabled?: boolean;
  onStepChange: (step: number, patch: Partial<StepState>) => void;
  onCheck: (step: number) => void;
  onReveal: (step: number) => void;
  onConfidence: (c: Confidence) => void;
  onSkip?: () => void;
  /** Stable per-session seed for quote selection. */
  quoteSeed: string;
  /** Streak quote earned by completing this question cleanly, if any. */
  streak?: { quote: Quote; tier: QuoteTier; count: number } | null;
}

const MODES: { id: QuestionMode; label: string }[] = [
  { id: 'exam', label: 'Examen' },
  { id: 'context', label: 'Contexte' },
];

export function QuestionModeToggle({ mode, locked, onChange }: { mode: QuestionMode; locked: boolean; onChange: (mode: QuestionMode) => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Question mode">
      <span className="label-xs">Mode</span>
      <div className="flex overflow-hidden rounded-md border border-border" role="group">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`min-h-touch px-4 text-sm font-medium ${mode === m.id ? 'bg-accent text-on-accent' : 'bg-bg text-muted hover:bg-surface'}`}
            aria-pressed={mode === m.id}
            disabled={locked}
            onClick={() => onChange(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      {locked && <span className="text-xs text-muted">Mode locks after answering starts.</span>}
    </div>
  );
}

export function MethodRefChips({ refs, className = '' }: { refs?: string[]; className?: string }) {
  if (!refs?.length) return null;
  return (
    <span className={`flex flex-wrap gap-1 ${className}`} aria-label="Method references">
      {refs.map((ref) => (
        <span key={ref} className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted">
          {ref}
        </span>
      ))}
    </span>
  );
}

export function PromptFigure({ image, className = '' }: { image?: ImageRef; className?: string }) {
  if (!image) return null;
  return (
    <figure className={`my-3 rounded-md border border-border bg-bg p-2 ${className}`}>
      <img src={image.src} alt={image.alt} className="mx-auto h-auto max-h-72 w-full max-w-xl object-contain" />
    </figure>
  );
}

/**
 * Unpenalized "Reveal Algebra" toggle + collapsible breakdown showing all intermediate
 * algebra/factoring/root steps up to the final answer, plus a methodology-only final hint.
 */
export function AlgebraAssistPanel({
  algebra,
  open,
  onToggle,
}: {
  algebra?: AlgebraAssist;
  open: boolean;
  onToggle: () => void;
}) {
  if (!algebra || (!algebra.steps.length && !algebra.hint)) return null;
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={open}
          aria-expanded={open}
          className={`inline-flex w-full sm:w-auto min-h-touch items-center justify-between sm:justify-start gap-2.5 rounded-md border px-3.5 py-2 text-sm font-medium transition-colors ${
            open ? 'border-accent bg-accent/10 text-ink' : 'border-border bg-bg text-ink hover:bg-surface'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12h2.5l2.5 6 4-12h7" />
              <path className="ic-accent" d="M15 11l5 5M20 11l-5 5" />
            </svg>
            <span>{open ? 'Hide Algebra' : 'Reveal Algebra'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="rounded border border-border bg-surface px-1.5 py-0.5 font-normal">No penalty</span>
            <IconChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        </button>
      </div>
      {open && (
        <div className="mt-2.5 rounded-lg border border-border bg-surface p-3.5 sm:p-4 text-sm leading-relaxed animate-reveal" role="region" aria-label="Algebra and intermediate steps">
          {algebra.steps.length > 0 && (
            <>
              <p className="label-xs mb-2.5">Intermediate Steps & Algebra</p>
              <ol className="space-y-2.5">
                {algebra.steps.map((line, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-bg font-mono text-xs font-semibold text-muted">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <MathText text={line} rich />
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
          {algebra.hint && (
            <div className="mt-3.5 rounded-md border border-accent/40 bg-bg px-3.5 py-2.5">
              <p className="label-xs mb-1 text-accent">Final Hint · Methodology Only</p>
              <div className="leading-relaxed">
                <MathText text={algebra.hint} rich />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type Outcome = 'clean' | 'retry' | 'assisted' | 'revealed';

export function outcomeOf(steps: StepState[]): Outcome {
  if (steps.some((s) => s.revealed)) return 'revealed';
  if (steps.some((s) => s.hintsShown > 0)) return 'assisted';
  if (steps.every((s) => s.firstTry)) return 'clean';
  return 'retry';
}

const LABEL: Record<Outcome, string> = {
  clean: 'Correct',
  retry: 'Correct: solved after a retry',
  assisted: 'Correct: solved with hints (assisted)',
  revealed: 'Derivation revealed',
};

/** Confirmation plus the worked derivation, shown once a question is solved. */
export function SolvedPanel({
  outcome,
  solution,
  interpretation,
  methodRefs,
  title,
  streak,
}: {
  outcome: Outcome;
  solution?: string;
  interpretation?: string;
  methodRefs?: string[];
  title?: string;
  streak?: QuestionViewProps['streak'];
}) {
  const revealed = outcome === 'revealed';
  return (
    <div className={`mt-5 rounded-md border px-4 py-3 animate-reveal ${revealed ? 'border-border bg-surface' : 'border-success/60 bg-success-bg'}`} role="status">
      <p className={`flex items-center gap-2 font-semibold ${revealed ? 'text-ink' : 'text-success'}`}>
        {revealed ? <IconEye size={18} /> : <IconCheck size={18} />}
        {outcome === 'clean' && title ? title : LABEL[outcome]}
      </p>
      {streak && outcome === 'clean' && (
        <div className="mt-3 border-t border-success/30 pt-3">
          <QuoteLine quote={streak.quote} />
        </div>
      )}
      {solution && (
        <div className="mt-3 border-t border-border pt-2 leading-relaxed">
          <p className="label-xs mb-1">Derivation</p>
          <MethodRefChips refs={methodRefs} className="mb-1" />
          <MathText text={solution} />
        </div>
      )}
      {interpretation && (
        <div className="mt-3 border-t border-border pt-2 leading-relaxed">
          <p className="label-xs mb-1">Interprétation</p>
          <MathText text={interpretation} />
        </div>
      )}
    </div>
  );
}
