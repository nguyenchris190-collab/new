import type { ActiveSession } from '../types';
import { Drawer } from '../components/Overlay';
import { IconWrench } from '../components/icons';
import { isCleanSolve } from '../lib/session';

export type ItemStatus = 'correct' | 'incorrect' | 'in-progress' | 'unattempted';

export function itemStatus(active: ActiveSession, qid: string): ItemStatus {
  const it = active.items[qid];
  if (!it) return 'unattempted';
  if (it.done) return isCleanSolve(it) ? 'correct' : 'incorrect';
  if (it.steps.some((s) => s.tries > 0)) return 'in-progress';
  return 'unattempted';
}

const CELL: Record<ItemStatus, string> = {
  correct: 'border-success bg-success-bg text-success',
  incorrect: 'border-danger bg-danger-bg text-danger',
  'in-progress': 'border-accent text-accent border-dashed',
  unattempted: 'border-border text-muted',
};

export function NavigatorDrawer({ open, onClose, active, onJump }: { open: boolean; onClose: () => void; active: ActiveSession; onJump: (i: number) => void }) {
  const counts = { done: 0, reported: 0, left: 0 };
  for (const id of active.questionIds) {
    const it = active.items[id];
    if (it?.done) counts.done++;
    else counts.left++;
    if (it?.reported) counts.reported++;
  }
  return (
    <Drawer open={open} onClose={onClose} title="Questions">
      <p className="mb-4 text-sm text-muted">
        {counts.done} answered · {counts.reported} reported · {counts.left} remaining
      </p>
      <ol className="grid grid-cols-5 gap-2 sm:grid-cols-6">
        {active.questionIds.map((id, i) => {
          const st = itemStatus(active, id);
          const reported = active.items[id]?.reported;
          const current = i === active.current;
          return (
            <li key={id}>
              <button
                onClick={() => {
                  onJump(i);
                  onClose();
                }}
                className={`relative flex h-12 w-full items-center justify-center rounded-md border font-semibold tabular-nums hc-thick ${CELL[st]} ${
                  current ? 'ring-2 ring-ink ring-offset-2 ring-offset-bg' : ''
                }`}
                aria-label={`Question ${i + 1}: ${st.replace('-', ' ')}${reported ? ', reported' : ''}${current ? ', current' : ''}`}
              >
                {i + 1}
                {reported && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-bg">
                    <IconWrench size={14} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <ul className="mt-6 grid grid-cols-2 gap-2 text-xs text-muted">
        <Legend cls={CELL.correct} label="Clean first try" />
        <Legend cls={CELL.incorrect} label="Retry, hint or reveal" />
        <Legend cls={CELL['in-progress']} label="In progress" />
        <Legend cls={CELL.unattempted} label="Unattempted" />
      </ul>
    </Drawer>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded border ${cls}`} />
      {label}
    </li>
  );
}
