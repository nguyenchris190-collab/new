import { type TopicStat, type TopicStatus } from '../lib/analytics';
import { Dot } from '../components/icons';
import { QuoteLine } from '../components/QuoteLine';
import { gapQuote } from '../lib/quotes';
import { startOfDay } from '../lib/util';

export const STATUS_META: Record<TopicStatus, { label: string; tone: 'success' | 'warn' | 'muted'; text: string }> = {
  solid: { label: 'Solid', tone: 'success', text: 'text-success' },
  'needs-work': { label: 'Needs Work', tone: 'warn', text: 'text-warn' },
  unexplored: { label: 'Unexplored', tone: 'muted', text: 'text-muted' },
};

export function StatusPill({ status }: { status: TopicStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium ${m.text}`}>
      <Dot tone={m.tone} />
      {m.label}
    </span>
  );
}

export function GapTracker({ stats, median, seed }: { stats: TopicStat[]; median: number; seed: string }) {
  const order: Record<TopicStatus, number> = { 'needs-work': 0, unexplored: 1, solid: 2 };
  const rows = stats.slice().sort((a, b) => order[a.status] - order[b.status] || a.topic.localeCompare(b.topic));
  const gaps = rows.filter((r) => r.status !== 'solid');
  // One gap quote per course per day, so it reads as a note rather than noise.
  const quote = gaps.length ? gapQuote(`${seed}:${startOfDay(Date.now())}`) : null;

  return (
    <section className="card overflow-hidden" aria-labelledby="gap-h">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <h2 id="gap-h" className="font-serif text-lg font-semibold">
          Topic Mastery
        </h2>
        <span className="text-xs text-muted">Median volume: {median % 1 ? median.toFixed(1) : median} attempts / topic</span>
      </header>
      {quote && (
        <div className="border-b border-border bg-surface/60 px-4 py-3">
          <p className="mb-1.5 text-xs text-muted">
            {gaps.length} section{gaps.length > 1 ? 's' : ''} marked Needs Work or Unexplored
          </p>
          <QuoteLine quote={quote} />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              <th scope="col" className="px-4 py-2 label-xs">
                Topic
              </th>
              <th scope="col" className="hidden px-2 py-2 text-right label-xs sm:table-cell">
                Bank
              </th>
              <th scope="col" className="px-2 py-2 text-right label-xs">
                Tries
              </th>
              <th scope="col" className="px-2 py-2 text-right label-xs">
                Acc.
              </th>
              <th scope="col" className="px-4 py-2 label-xs">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((s) => (
              <tr key={s.topic}>
                <th scope="row" className="px-4 py-2.5 text-left font-medium">
                  {s.topic}
                </th>
                <td className="hidden px-2 py-2.5 text-right tabular-nums text-muted sm:table-cell">{s.available}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{s.attempts}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{s.accuracy === null ? '—' : `${Math.round(s.accuracy * 100)}%`}</td>
                <td className="px-4 py-2.5">
                  <StatusPill status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
