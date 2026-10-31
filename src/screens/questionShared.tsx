import type { Confidence, ImageRef, ItemState, Question, QuestionMode, StepState } from '../types';
import type { Quote, QuoteTier } from '../lib/quotes';
import { MathText } from '../components/MathText';
import { QuoteLine } from '../components/QuoteLine';
import { IconCheck, IconEye } from '../components/icons';

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
