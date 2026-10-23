import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveSession, Confidence, ItemState, StepState } from '../types';
import { liveElapsed, pacingDropped } from '../lib/analytics';
import { formatClock } from '../lib/util';
import { useStore } from '../state/StoreContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { IconChevronLeft, IconChevronRight, IconClose, IconDoc, IconFlag, IconGrid, IconPause, IconPlay, IconWarn } from '../components/icons';
import { CheatSheetDrawer } from './CheatSheetDrawer';
import { NavigatorDrawer } from './NavigatorDrawer';
import { SequentialQuestion } from './SequentialQuestion';
import { SessionSummary } from './SessionSummary';
import { SingleMCQuestion } from './SingleMCQuestion';

const BURNOUT_MS = 45 * 60 * 1000;
const AWAY_PAUSE_MS = 5 * 60 * 1000;

export function QuizRunner({ goWorkspace }: { goWorkspace: () => void }) {
  const { state, courseById, patchActive, completeQuestion, setPaused, finishSession, closeSession } = useStore();
  const active = state.active;
  const course = active ? courseById(active.courseId) : undefined;
  const [navOpen, setNavOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [review, setReview] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const topRef = useRef<HTMLDivElement>(null);

  const running = !!active?.runningSince && !active.finished;

  // Clock tick.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Resume on entry, pause when leaving the runner, and retroactively pause if the tab was hidden for a long time.
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AWAY_PAUSE_MS) setPaused(true, hiddenAt);
      if (!document.hidden) hiddenAt = null;
    };
    document.addEventListener('visibilitychange', onVis);
    setPaused(false);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      setPaused(true);
    };
  }, [setPaused]);

  const updateItem = useCallback(
    (qid: string, fn: (it: ItemState, a: ActiveSession) => ItemState) =>
      patchActive((a) => (a.items[qid] ? { ...a, items: { ...a.items, [qid]: fn(a.items[qid], a) } } : a)),
    [patchActive],
  );

  const go = useCallback(
    (i: number) => {
      patchActive((a) => {
        const idx = Math.max(0, Math.min(a.questionIds.length - 1, i));
        const qid = a.questionIds[idx];
        const it = a.items[qid];
        const items = it && it.viewedAtMs === null ? { ...a.items, [qid]: { ...it, viewedAtMs: liveElapsed(a) } } : a.items;
        return { ...a, current: idx, items };
      });
      topRef.current?.scrollIntoView({ block: 'start' });
    },
    [patchActive],
  );

  if (!active || !course) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="mb-4">No active session.</p>
        <button className="btn" onClick={goWorkspace}>
          Back to Workspace
        </button>
      </div>
    );
  }

  const total = active.questionIds.length;
  const viewIndex = active.finished ? review : active.current;
  const qid = viewIndex !== null ? active.questionIds[viewIndex] : null;
  const question = qid ? course.questions.find((q) => q.id === qid) : undefined;
  const item = qid ? active.items[qid] : undefined;
  const elapsed = liveElapsed(active, now);
  const doneCount = Object.values(active.items).filter((i) => i.done).length;
  const paused = !active.runningSince && !active.finished;
  const showWarning = !active.finished && !active.warningDismissed && (elapsed > BURNOUT_MS || pacingDropped(active));

  const setStep = (step: number, patch: Partial<StepState>) => {
    if (!qid) return;
    updateItem(qid, (it) => ({ ...it, steps: it.steps.map((s, i) => (i === step ? { ...s, ...patch } : s)) }));
  };

  const check = (stepIdx: number) => {
    if (!qid || !question || !item) return;
    const st = item.steps[stepIdx];
    if (st.selected === null || st.solved) return;
    const ok = st.selected === question.steps[stepIdx].answer;
    const last = stepIdx === question.steps.length - 1;
    updateItem(qid, (it) => {
      const steps = it.steps.map((s, i) =>
        i !== stepIdx
          ? s
          : {
              ...s,
              tries: s.tries + 1,
              firstTry: s.firstTry ?? ok,
              solved: ok,
              wrong: ok || s.selected === null || s.wrong.includes(s.selected) ? s.wrong : [...s.wrong, s.selected],
            },
      );
      return { ...it, steps, step: ok && !last ? stepIdx + 1 : it.step };
    });
    if (ok && last) completeQuestion(qid);
  };

  const reveal = (stepIdx: number) => {
    if (!qid || !question) return;
    const last = stepIdx === question.steps.length - 1;
    updateItem(qid, (it) => ({
      ...it,
      step: last ? it.step : stepIdx + 1,
      steps: it.steps.map((s, i) => (i === stepIdx ? { ...s, solved: true, revealed: true, firstTry: false, selected: question.steps[i].answer } : s)),
    }));
    if (last) completeQuestion(qid);
  };

  const setConfidence = (c: Confidence) => qid && updateItem(qid, (it) => ({ ...it, confidence: c }));
  const toggleFlag = () => qid && updateItem(qid, (it) => ({ ...it, flagged: !it.flagged }));

  const finish = () => {
    const left = total - doneCount;
    if (left > 0 && !confirm(`${left} question${left > 1 ? 's are' : ' is'} unanswered. Finish anyway?`)) return;
    finishSession();
    setReview(null);
    window.scrollTo({ top: 0 });
  };

  const exitToWorkspace = () => {
    if (active.finished) closeSession();
    goWorkspace();
  };

  const isLast = viewIndex === total - 1;
  const qProps = question && item && qid ? { question, item, disabled: paused || active.finished, onStepChange: setStep, onCheck: check, onReveal: reveal, onConfidence: setConfidence } : null;

  return (
    <div className="min-h-dvh pb-24 md:pb-8" ref={topRef}>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
        <div className="mx-auto flex max-w-3xl items-center gap-0.5 px-1 sm:px-3">
          <button className="btn-icon gap-0.5 px-2 font-medium" onClick={exitToWorkspace} aria-label="Back to workspace">
            <IconChevronLeft size={20} />
            <span className="hidden sm:inline">Workspace</span>
          </button>
          <div className="min-w-0 flex-1 px-1">
            <p className="truncate text-sm font-semibold">{course.title}</p>
            <p className="text-xs tabular-nums text-muted">
              {active.finished ? 'Review' : `Question ${active.current + 1} of ${total}`}
              <span className="hidden sm:inline"> · {doneCount} done</span>
            </p>
          </div>
          {!active.finished && (
            <button
              className={`btn-icon gap-1.5 px-2 tabular-nums ${paused ? 'text-accent' : ''}`}
              onClick={() => setPaused(!paused)}
              aria-label={paused ? 'Resume timer' : 'Pause timer'}
            >
              {paused ? <IconPlay size={18} /> : <IconPause size={18} />}
              <span className="text-sm font-medium">{formatClock(elapsed)}</span>
            </button>
          )}
          {course.cheatSheet.length > 0 && (
            <button className="btn-icon" onClick={() => setSheetOpen(true)} aria-label="Open formula cheat sheet">
              <IconDoc />
            </button>
          )}
          <button className="btn-icon" onClick={() => setNavOpen(true)} aria-label="Open question navigator">
            <IconGrid />
          </button>
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
        </div>
        {/* progress */}
        <div className="h-0.5 bg-border" aria-hidden="true">
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${(100 * doneCount) / Math.max(1, total)}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-5">
        {active.finished && review === null ? (
          <SessionSummary active={active} course={course} attempts={state.attempts} onReview={(i) => setReview(i)} onDone={exitToWorkspace} />
        ) : (
          <>
            {showWarning && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-warn/40 bg-warn-bg pl-3 text-sm text-warn" role="status">
                <IconWarn size={16} className="shrink-0" />
                <span className="flex-1 py-2">Notice: High cognitive load detected. Consider a short break.</span>
                <button className="btn-icon shrink-0" onClick={() => patchActive((a) => ({ ...a, warningDismissed: true }))} aria-label="Dismiss notice">
                  <IconClose size={16} />
                </button>
              </div>
            )}

            {active.finished && (
              <button className="btn mb-4" onClick={() => setReview(null)}>
                <IconChevronLeft size={18} /> Back to summary
              </button>
            )}

            {paused ? (
              <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
                <IconPause size={32} className="text-muted" />
                <p className="font-serif text-xl font-semibold">Session paused</p>
                <p className="text-sm text-muted">The question is hidden while the clock is stopped.</p>
                <button className="btn-primary" onClick={() => setPaused(false)}>
                  <IconPlay size={18} /> Resume
                </button>
              </div>
            ) : qProps ? (
              <article className="card p-4 sm:p-6" aria-label={`Question ${(viewIndex ?? 0) + 1}`}>
                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded border border-border px-2 py-0.5 font-medium">{qProps.question.topic}</span>
                  <span className="text-muted">{qProps.question.category === 'theory' ? 'Theory' : 'Practice'}</span>
                  {qProps.question.kind === 'sequential' && <span className="text-muted">· {qProps.question.steps.length} steps</span>}
                  {qProps.item.flagged && (
                    <span className="ml-auto inline-flex items-center gap-1 font-medium text-accent">
                      <IconFlag size={14} filled /> Flagged
                    </span>
                  )}
                </div>
                {qProps.question.kind === 'sequential' ? <SequentialQuestion key={qid} {...qProps} /> : <SingleMCQuestion key={qid} {...qProps} />}
              </article>
            ) : (
              <div className="card p-6 text-center text-muted">This question is no longer in the course pack.</div>
            )}

            {/* Desktop navigation row */}
            <nav className="mt-5 hidden items-center gap-2 md:flex" aria-label="Question navigation">
              <button className="btn" onClick={() => (active.finished ? setReview(Math.max(0, (review ?? 0) - 1)) : go(active.current - 1))} disabled={viewIndex === 0}>
                <IconChevronLeft size={18} /> Prev
              </button>
              {!active.finished && (
                <button className={`btn ${item?.flagged ? 'border-accent text-accent' : ''}`} onClick={toggleFlag} aria-pressed={!!item?.flagged}>
                  <IconFlag size={18} filled={item?.flagged} /> {item?.flagged ? 'Flagged' : 'Flag'}
                </button>
              )}
              <span className="flex-1" />
              {!active.finished && (
                <button className={isLast || doneCount === total ? 'btn-primary' : 'btn'} onClick={finish}>
                  Finish session
                </button>
              )}
              <button
                className={item?.done && !isLast ? 'btn-primary' : 'btn'}
                onClick={() => (active.finished ? setReview(Math.min(total - 1, (review ?? 0) + 1)) : go(active.current + 1))}
                disabled={isLast}
              >
                Next <IconChevronRight size={18} />
              </button>
            </nav>
            {!active.finished && (
              <div className="mt-6 flex justify-center md:hidden">
                <button className={isLast || doneCount === total ? 'btn-primary w-full' : 'btn w-full'} onClick={finish}>
                  Finish session
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile sticky thumb-bar */}
      {!(active.finished && review === null) && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg pb-safe md:hidden" aria-label="Question navigation">
          <div className="grid grid-cols-3">
            <button
              className="flex min-h-[56px] items-center justify-center gap-1 font-medium disabled:opacity-40"
              onClick={() => (active.finished ? setReview(Math.max(0, (review ?? 0) - 1)) : go(active.current - 1))}
              disabled={viewIndex === 0}
            >
              <IconChevronLeft size={20} /> Prev
            </button>
            <button
              className={`flex min-h-[56px] items-center justify-center gap-1.5 border-x border-border font-medium disabled:opacity-40 ${item?.flagged ? 'text-accent' : ''}`}
              onClick={toggleFlag}
              disabled={active.finished}
              aria-pressed={!!item?.flagged}
            >
              <IconFlag size={20} filled={item?.flagged} /> Flag
            </button>
            <button
              className={`flex min-h-[56px] items-center justify-center gap-1 font-medium disabled:opacity-40 ${item?.done && !isLast ? 'bg-accent text-on-accent' : ''}`}
              onClick={() => (active.finished ? setReview(Math.min(total - 1, (review ?? 0) + 1)) : go(active.current + 1))}
              disabled={isLast}
            >
              Next <IconChevronRight size={20} />
            </button>
          </div>
        </nav>
      )}

      <NavigatorDrawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        active={active.finished ? { ...active, current: review ?? -1 } : active}
        onJump={(i) => (active.finished ? setReview(i) : go(i))}
      />
      <CheatSheetDrawer open={sheetOpen} onClose={() => setSheetOpen(false)} sections={course.cheatSheet} title={course.title} />
    </div>
  );
}
