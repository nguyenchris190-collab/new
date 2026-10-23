import type { Confidence, ItemState, Question, StepState } from '../types';
import type { Quote, QuoteTier } from '../lib/quotes';
import { MathText } from '../components/MathText';
import { QuoteLine } from '../components/QuoteLine';
import { IconCheck, IconEye } from '../components/icons';

export interface QuestionViewProps {
  question: Question;
  item: ItemState;
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
  title,
  streak,
}: {
  outcome: Outcome;
  solution?: string;
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
          <p className="label-xs mb-1.5" data-streak-tier={streak.tier}>
            {streak.count > 1 ? `${streak.count} clean in a row` : 'Clean solve'}
            {streak.tier > 1 ? ` · tier ${streak.tier}` : ''}
          </p>
          <QuoteLine quote={streak.quote} />
        </div>
      )}
      {solution && (
        <div className="mt-3 border-t border-border pt-2 leading-relaxed">
          <p className="label-xs mb-1">Derivation</p>
          <MathText text={solution} />
        </div>
      )}
    </div>
  );
}
