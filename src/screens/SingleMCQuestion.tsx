import { MathText } from '../components/MathText';
import { ChoiceStep } from './ChoiceStep';
import { outcomeOf, SolvedPanel, type QuestionViewProps } from './questionShared';

export function SingleMCQuestion({ question, item, disabled, onStepChange, onCheck, onReveal, onConfidence, onSkip, quoteSeed, streak }: QuestionViewProps) {
  const step = question.steps[0];
  const st = item.steps[0];
  return (
    <div>
      <div className="mb-5 text-[17px] leading-relaxed">
        <MathText text={question.prompt} />
      </div>
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
      {st.solved && <SolvedPanel outcome={outcomeOf(item.steps)} solution={step.solution} streak={streak} />}
    </div>
  );
}
