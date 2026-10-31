import { MathText } from '../components/MathText';
import { ChoiceStep } from './ChoiceStep';
import { MethodRefChips, outcomeOf, PromptFigure, QuestionModeToggle, SolvedPanel, type QuestionViewProps } from './questionShared';

export function SingleMCQuestion({ question, item, mode, onModeChange, disabled, onStepChange, onCheck, onReveal, onConfidence, onSkip, quoteSeed, streak }: QuestionViewProps) {
  const step = question.steps[0];
  const st = item.steps[0];
  const context = mode === 'context' && !!question.scenario;
  const modeLocked = item.steps.some((s) => s.tries > 0 || s.hintsShown > 0 || s.revealed || s.solved);
  if (!st) return null;
  return (
    <div>
      {question.scenario && <QuestionModeToggle mode={mode} locked={modeLocked || item.done} onChange={onModeChange} />}
      <div className="mb-5 text-[17px] leading-relaxed">
        <MethodRefChips refs={question.methodRefs} className="mb-2" />
        <MathText text={context ? question.scenario!.prompt : question.prompt} />
      </div>
      <PromptFigure image={question.promptImage} />
      <ChoiceStep
        step={{ ...step, prompt: undefined }}
        state={st}
        order={item.orders[0]}
        confidence={item.confidence}
        disabled={disabled}
        onChange={(p) => onStepChange(0, p)}
        onCheck={() => onCheck(0)}
        onReveal={() => onReveal(0)}
        onConfidence={onConfidence}
        onSkip={onSkip}
        checkLabel="Check Answer"
        quoteSeed={`${quoteSeed}:0`}
      />
      {st.solved && (
        <SolvedPanel
          outcome={outcomeOf(item.steps)}
          solution={step.solution}
          interpretation={context ? question.scenario?.interpretation : undefined}
          methodRefs={question.methodRefs}
          streak={streak}
        />
      )}
    </div>
  );
}
