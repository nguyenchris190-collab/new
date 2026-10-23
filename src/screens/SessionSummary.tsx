import type { ActiveSession, Attempt, CoursePack } from '../types';
import { formatDuration } from '../lib/util';
import { IconCheck, IconClose, IconFlag } from '../components/icons';

interface Props {
  active: ActiveSession;
  course: CoursePack;
  attempts: Attempt[];
  onReview: (i: number) => void;
  onDone: () => void;
}

export function SessionSummary({ active, course, attempts, onReview, onDone }: Props) {
  const mine = attempts.filter((a) => a.sessionId === active.id);
  const correct = mine.filter((a) => a.correct).length;
  const acc = mine.length ? Math.round((100 * correct) / mine.length) : 0;
  const byTopic = new Map<string, { n: number; c: number }>();
  for (const a of mine) {
    const t = byTopic.get(a.topic) ?? { n: 0, c: 0 };
    t.n++;
    if (a.correct) t.c++;
    byTopic.set(a.topic, t);
  }
  const lucky = mine.filter((a) => a.correct && a.confidence !== 'confident').length;
  const qById = new Map(course.questions.map((q) => [q.id, q]));

  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-reveal">
      <div className="card p-5 text-center">
        <p className="label-xs">Session complete</p>
        <p className="mt-2 font-serif text-5xl font-semibold tabular-nums">{acc}%</p>
        <p className="mt-1 text-muted">
          {correct} of {mine.length} correct on first try · {formatDuration(active.elapsedMs)} active
        </p>
        {lucky > 0 && (
          <p className="mt-2 text-sm text-warn">
            {lucky} correct answer{lucky > 1 ? 's were' : ' was'} marked as a guess or low certainty — worth revisiting.
          </p>
        )}
      </div>

      {byTopic.size > 0 && (
        <div className="card overflow-hidden">
          <h3 className="label-xs border-b border-border bg-surface px-4 py-2">By topic</h3>
          <ul className="divide-y divide-border">
            {[...byTopic.entries()].map(([t, v]) => (
              <li key={t} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-medium">{t}</span>
                <span className="tabular-nums text-muted">
                  {v.c}/{v.n}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-hidden">
        <h3 className="label-xs border-b border-border bg-surface px-4 py-2">Questions</h3>
        <ul className="divide-y divide-border">
          {active.questionIds.map((id, i) => {
            const it = active.items[id];
            const q = qById.get(id);
            const ok = it?.done && it.steps.every((s) => s.firstTry && !s.revealed);
            return (
              <li key={id}>
                <button className="flex w-full min-h-touch items-center gap-3 px-4 py-2 text-left text-sm hover:bg-surface" onClick={() => onReview(i)}>
                  <span className="w-6 tabular-nums text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{q?.topic ?? 'Removed question'}</span>
                  {it?.flagged && <IconFlag size={16} filled />}
                  {!it?.done ? (
                    <span className="text-xs text-muted">skipped</span>
                  ) : ok ? (
                    <IconCheck size={18} className="text-success" />
                  ) : (
                    <IconClose size={18} className="text-danger" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <button className="btn-primary w-full" onClick={onDone}>
        Back to Workspace
      </button>
    </div>
  );
}
