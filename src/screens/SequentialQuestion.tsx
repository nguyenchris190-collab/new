import { useState } from 'react';
import { MathText } from '../components/MathText';
import { IconCheck, IconChevronDown } from '../components/icons';
import { ChoiceStep } from './ChoiceStep';
import { SolvedPanel, type QuestionViewProps } from './questionShared';

/**
 * Progressive multi-step question. Only the current step is shown; each
 * verified step collapses into a summary pill and the next one reveals beneath it.
 */
export function SequentialQuestion({ question, item, disabled, onStepChange, onCheck, onReveal, onConfidence }: QuestionViewProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const total = question.steps.length;
  const current = Math.min(item.step, total - 1);

  return (
    <div>
      <div className="mb-4 text-[17px] leading-relaxed">
        <MathText text={question.prompt} />
      </div>

      <ol className="space-y-2.5" aria-label="Steps">
        {question.steps.map((step, i) => {
          const st = item.steps[i];
          if (i > current) return null; // future steps stay hidden
          if (st.solved && (i < current || item.done)) {
            const open = expanded === i;
            return (
              <li key={i} className="animate-reveal">
                <button
                  className={`flex w-full min-h-touch items-center gap-2 rounded-full border px-3 py-1.5 text-left text-sm ${
                    st.revealed ? 'border-border bg-surface' : 'border-success/60 bg-success-bg'
                  }`}
                  onClick={() => setExpanded(open ? null : i)}
                  aria-expanded={open}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${st.revealed ? 'bg-muted' : 'bg-success'} text-bg`}>
                    <IconCheck size={14} />
                  </span>
                  <span className="shrink-0 font-semibold">Step {i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">
                    <MathText text={step.choices[step.answer]} autoMath />
                  </span>
                  <IconChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="mx-3 mt-1 rounded-b-md border border-t-0 border-border px-4 py-3 text-sm leading-relaxed animate-reveal">
                    {step.prompt && (
                      <div className="mb-2 text-muted">
                        <MathText text={step.prompt} />
                      </div>
                    )}
                    <MathText text={step.solution ?? step.choices[step.answer]} autoMath />
                  </div>
                )}
              </li>
            );
          }
          return (
            <li key={i} className="rounded-lg border border-border p-4 animate-reveal">
              <p className="label-xs mb-2">
                Step {i + 1} of {total}
              </p>
              <ChoiceStep
                step={step}
                state={st}
                order={item.orders[i]}
                confidence={item.confidence}
                disabled={disabled}
                onChange={(p) => onStepChange(i, p)}
                onCheck={() => onCheck(i)}
                onReveal={() => onReveal(i)}
                onConfidence={onConfidence}
                checkLabel={i === total - 1 ? 'Check Answer' : 'Check Step'}
              />
            </li>
          );
        })}
      </ol>

      {item.done && (
        <SolvedPanel
          title="All steps verified"
          revealed={item.steps.every((s) => s.revealed)}
          firstTry={item.steps.every((s) => s.firstTry && !s.revealed)}
          solution={question.solution}
        />
      )}
    </div>
  );
}
