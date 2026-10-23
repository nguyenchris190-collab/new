import { useEffect, useRef } from 'react';
import type { Confidence, Step, StepState } from '../types';
import { MathText } from '../components/MathText';
import { Dot, IconBulb, IconCheck, IconClose, IconEye } from '../components/icons';
import { QuoteLine } from '../components/QuoteLine';
import { errorQuote } from '../lib/quotes';

const CONFIDENCE: { id: Confidence; label: string; tone: 'success' | 'warn' | 'muted' }[] = [
  { id: 'confident', label: 'Confident', tone: 'success' },
  { id: 'guess', label: '50/50 Guess', tone: 'warn' },
  { id: 'low', label: 'Low Certainty', tone: 'muted' },
];

export function ConfidenceChip({ value, onChange }: { value: Confidence; onChange: (c: Confidence) => void }) {
  const i = CONFIDENCE.findIndex((c) => c.id === value);
  const cur = CONFIDENCE[i < 0 ? 0 : i];
  return (
    <button
      type="button"
      onClick={() => onChange(CONFIDENCE[(i + 1) % CONFIDENCE.length].id)}
      className="inline-flex min-h-touch items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-surface"
      aria-label={`Confidence: ${cur.label}. Tap to change.`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="7" cy="7" r="2.75" fill="currentColor" />
      </svg>
      {cur.label}
      <Dot tone={cur.tone} />
    </button>
  );
}

interface Props {
  step: Step;
  state: StepState;
  order: number[];
  confidence: Confidence;
  disabled?: boolean;
  onChange: (patch: Partial<StepState>) => void;
  onCheck: () => void;
  onReveal: () => void;
  onConfidence: (c: Confidence) => void;
  onSkip?: () => void;
  checkLabel: string;
  /** Stable seed so the miss quote does not change between renders. */
  quoteSeed: string;
  /** Failed checks on earlier steps of the same question (error tiers count per question). */
  priorMisses?: number;
}

const LONG_PRESS_MS = 450;

export function ChoiceStep({ step, state, order, confidence, disabled, onChange, onCheck, onReveal, onConfidence, onSkip, checkLabel, quoteSeed, priorMisses = 0 }: Props) {
  const pressTimer = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const isWrong = state.selected !== null && state.wrong.includes(state.selected) && !state.solved;
  const canCheck = state.selected !== null && !isWrong && !state.solved && !disabled;
  // Each distinct wrong pick is one failed check (a wrong option cannot be re-checked).
  // Tiers count failed checks across the whole question, so multi-step questions can reach tier 3.
  const stepMisses = state.wrong.length;
  const misses = priorMisses + stepMisses;
  const err = stepMisses > 0 ? errorQuote(misses, `${quoteSeed}:${misses}`) : null;

  const select = (idx: number) => {
    if (state.solved || disabled) return;
    const struck = state.struck.includes(idx) ? state.struck.filter((s) => s !== idx) : state.struck;
    onChange({ selected: idx, struck });
  };

  const toggleStrike = (idx: number) => {
    if (state.solved || disabled) return;
    const struck = state.struck.includes(idx) ? state.struck.filter((s) => s !== idx) : [...state.struck, idx];
    onChange({ struck, selected: state.selected === idx ? null : state.selected });
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const clearTimer = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  // Keyboard: 1-9 or A-H selects an option, Enter checks.
  useEffect(() => {
    if (state.solved || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : /^[a-h]$/i.test(e.key) ? e.key.toLowerCase().charCodeAt(0) - 97 : -1;
      if (n >= 0 && n < order.length) {
        e.preventDefault();
        select(order[n]);
      } else if (e.key === 'Enter' && canCheck && t.tagName !== 'BUTTON') {
        e.preventDefault();
        onCheck();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div>
      {step.prompt && (
        <div className="mb-4 text-[17px] leading-relaxed">
          <MathText text={step.prompt} />
        </div>
      )}

      <ul className="space-y-2.5" role="radiogroup" aria-label="Answer choices">
        {order.map((idx, pos) => {
          const selected = state.selected === idx;
          const struck = state.struck.includes(idx);
          const wrong = state.wrong.includes(idx);
          const correct = state.solved && idx === step.answer;
          let cls = 'border-border hover:border-strong';
          if (correct) cls = 'border-success bg-success-bg ring-1 ring-success';
          else if (selected && wrong) cls = 'border-danger bg-danger-bg ring-1 ring-danger';
          else if (selected) cls = 'border-accent bg-accent/5 ring-1 ring-accent';
          else if (wrong) cls = 'border-border opacity-50';
          return (
            <li key={idx}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={struck ? 'Eliminated option' : undefined}
                disabled={disabled || (state.solved && !correct)}
                onClick={() => {
                  if (suppressClick.current) {
                    suppressClick.current = false;
                    return;
                  }
                  select(idx);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (pressTimer.current !== null) {
                    // Browser long-press menu beat our timer: handle it here once.
                    clearTimer();
                    suppressClick.current = true;
                  } else if (suppressClick.current) {
                    return; // our long-press timer already toggled this option
                  }
                  toggleStrike(idx);
                }}
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  touchStart.current = { x: t.clientX, y: t.clientY };
                  suppressClick.current = false;
                  clearTimer();
                  pressTimer.current = window.setTimeout(() => {
                    pressTimer.current = null;
                    suppressClick.current = true;
                    toggleStrike(idx);
                  }, LONG_PRESS_MS);
                }}
                onTouchMove={(e) => {
                  const s = touchStart.current;
                  const t = e.touches[0];
                  if (s && Math.hypot(t.clientX - s.x, t.clientY - s.y) > 10) clearTimer();
                }}
                onTouchEnd={clearTimer}
                onTouchCancel={clearTimer}
                className={`no-callout group flex w-full min-h-[56px] items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-default hc-thick ${cls}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                    correct ? 'border-success bg-success text-bg' : selected && wrong ? 'border-danger bg-danger text-bg' : selected ? 'border-accent bg-accent text-on-accent' : 'border-strong text-muted'
                  }`}
                  aria-hidden="true"
                >
                  {correct ? <IconCheck size={16} /> : selected && wrong ? <IconClose size={16} /> : String.fromCharCode(65 + pos)}
                </span>
                <span className="min-w-0 flex-1 overflow-x-auto py-1">
                  <span className={struck ? 'struck' : undefined}>
                    <MathText text={step.choices[idx]} autoMath />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!state.solved && !disabled && (
        <div className="mt-5 flex flex-col items-start gap-2">
          <button className="btn-primary w-full sm:w-auto sm:min-w-[12rem]" disabled={!canCheck} onClick={onCheck}>
            {checkLabel}
          </button>
          <ConfidenceChip value={confidence} onChange={onConfidence} />
          <p className="text-xs text-muted">Right-click or long-press an option to cross it out.</p>
        </div>
      )}

      {!state.solved && stepMisses > 0 && (
        <div className="mt-4 space-y-3 rounded-md border border-danger/50 bg-danger-bg px-4 py-3 animate-reveal" role="status">
          <p className="flex items-center gap-2 font-semibold text-danger">
            <IconClose size={18} /> {isWrong ? 'Not quite. Try another option.' : `${misses} miss${misses > 1 ? 'es' : ''} on this question. Check your next choice.`}
          </p>
          {err && <QuoteLine quote={err.quote} />}
          {err?.tier === 3 && (
            <div className="border-t border-danger/30 pt-3 text-sm">
              <p className="mb-2">Stuck for a while? Stepping back is part of the method. Read the full derivation, or skip ahead and return later.</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn" onClick={onReveal}>
                  <IconEye size={18} /> Reveal Full Derivation
                </button>
                {onSkip && (
                  <button className="btn border-transparent text-muted" onClick={onSkip}>
                    Skip for now
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!state.solved && !disabled && (
        <div className="mt-4 space-y-2">
          {step.hints.slice(0, state.hintsShown).map((h, i) => (
            <div key={i} className="rounded-md border border-border bg-surface px-4 py-3 animate-reveal">
              <p className="label-xs mb-1">
                Hint {i + 1} of {step.hints.length}
              </p>
              <MathText text={h} />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {state.hintsShown < step.hints.length && (
              <button className="btn" onClick={() => onChange({ hintsShown: state.hintsShown + 1 })}>
                <IconBulb size={18} /> {state.hintsShown ? `Show Hint ${state.hintsShown + 1}` : 'Hint'}
              </button>
            )}
            {err?.tier !== 3 && (
              <button className="btn border-transparent text-muted" onClick={onReveal}>
                <IconEye size={18} /> Reveal Full Derivation
              </button>
            )}
          </div>
          {state.hintsShown > 0 && <p className="text-xs text-muted">Assisted: this attempt will not count as a first-try solve.</p>}
        </div>
      )}
    </div>
  );
}
