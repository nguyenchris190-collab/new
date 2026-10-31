import { useState } from 'react';
import { MathText } from '../components/MathText';
import { IconCheck, IconChevronDown } from '../components/icons';
import { runtimeSteps } from '../lib/session';
import { ChoiceStep } from './ChoiceStep';
import { MethodRefChips, outcomeOf, PromptFigure, QuestionModeToggle, SolvedPanel, type QuestionViewProps } from './questionShared';

/**
 * Progressive multi-step question. Only the current step is shown; each
 * verified step collapses into a summary pill and the next one reveals beneath it.
 */
export function SequentialQuestion({ question, item, mode, onModeChange, disabled, onStepChange, onCheck, onReveal, onConfidence, onSkip, quoteSeed, streak }: QuestionViewProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const context = mode === 'context' && !!question.scenario;
  const scenario = context ? question.scenario : undefined;
  const steps = runtimeSteps(question, context);
  const total = steps.length;
  const current = Math.min(item.step, total - 1);
  const modeLocked = item.steps.some((s) => s.tries > 0 || s.hintsShown > 0 || s.revealed || s.solved);

  return (
    <div>
      {question.scenario && <QuestionModeToggle mode={mode} locked={modeLocked || item.done} onChange={onModeChange} />}
      <div className="mb-4 text-[17px] leading-relaxed">
        <MethodRefChips refs={question.methodRefs} className="mb-2" />
        <MathText text={scenario?.prompt ?? question.prompt} />
      </div>
      <PromptFigure image={question.promptImage} />

      <ol className="space-y-2.5" aria-label="Steps">
        {steps.map((step, i) => {
          const st = item.steps[i];
          if (!st || i > current) return null; // future steps stay hidden
          const stepPrompt = scenario?.instructions?.[i] ?? step.prompt;
          if (st.solved && (i < current || item.done)) {
            const open = expanded === i;
            return (
              <li key={i} className="animate-reveal">
                <button
                  className={`flex w-full min-h-touch items-center gap-2 rounded-full border px-3 py-1.5 text-left text-sm ${
                    st.revealed ? 'border-border bg-surface' : 'border-success/60 bg-success-bg'
                  }`}
                  data-assisted={st.hintsShown > 0 || st.revealed ? 'true' : undefined}
                  title={st.revealed ? 'Revealed' : st.hintsShown ? 'Solved with hints' : st.firstTry ? 'Solved first try' : 'Solved after retry'}
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
                    {stepPrompt && (
                      <div className="mb-2 text-muted">
                        <MathText text={stepPrompt} />
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
                step={{ ...step, prompt: stepPrompt }}
                state={st}
                order={item.orders[i]}
                confidence={item.confidence}
                disabled={disabled}
                onChange={(p) => onStepChange(i, p)}
                onCheck={() => onCheck(i)}
                onReveal={() => onReveal(i)}
                onConfidence={onConfidence}
                onSkip={onSkip}
                checkLabel={i === total - 1 ? 'Check Answer' : 'Check Step'}
                quoteSeed={`${quoteSeed}:${i}`}
                priorMisses={item.steps.slice(0, i).reduce((n, x) => n + x.wrong.length, 0)}
              />
            </li>
          );
        })}
      </ol>

      {item.done && (
        <SolvedPanel
          title="All steps verified"
          outcome={outcomeOf(item.steps)}
          solution={question.solution}
          interpretation={scenario?.interpretation}
          methodRefs={question.methodRefs}
          streak={streak}
        />
      )}
    </div>
  );
}
