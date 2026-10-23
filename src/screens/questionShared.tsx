import type { Confidence, ItemState, Question, StepState } from '../types';
import { MathText } from '../components/MathText';
import { IconCheck } from '../components/icons';

export interface QuestionViewProps {
  question: Question;
  item: ItemState;
  disabled?: boolean;
  onStepChange: (step: number, patch: Partial<StepState>) => void;
  onCheck: (step: number) => void;
  onReveal: (step: number) => void;
  onConfidence: (c: Confidence) => void;
}

/** Green confirmation plus the worked derivation, shown once a question/step is solved. */
export function SolvedPanel({ revealed, firstTry, solution, title = 'Correct' }: { revealed: boolean; firstTry: boolean; solution?: string; title?: string }) {
  return (
    <div className={`mt-5 rounded-md border px-4 py-3 animate-reveal ${revealed ? 'border-border bg-surface' : 'border-success/60 bg-success-bg'}`} role="status">
      <p className={`flex items-center gap-2 font-semibold ${revealed ? 'text-ink' : 'text-success'}`}>
        <IconCheck size={18} />
        {revealed ? 'Answer revealed' : firstTry ? title : `${title} — solved after retry`}
      </p>
      {solution && (
        <div className="mt-2 border-t border-border pt-2 leading-relaxed">
          <p className="label-xs mb-1">Derivation</p>
          <MathText text={solution} />
        </div>
      )}
    </div>
  );
}
