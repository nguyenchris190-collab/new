import { useEffect, useState, type ReactNode } from 'react';
import { dailyActivity, lastActive } from '../lib/analytics';
import { formatDuration, relativeTime } from '../lib/util';
import { useStore } from '../state/StoreContext';
import { IconActivity, IconCheck, IconClock, IconFlame } from '../components/icons';

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

const MODE_LABEL = { balanced: 'Balanced', theory: 'Theory', practice: 'Practice' };

export function CaptainsLog() {
  const { state } = useStore();
  const now = useNow();
  const days = dailyActivity(state.sessions, state.attempts, state.active, 7, now);
  const today = days[days.length - 1];
  const last = lastActive(state.sessions, state.attempts);
  const maxMin = Math.max(30, ...days.map((d) => d.minutes));
  const recent = state.sessions
    .filter((s) => s.answered > 0)
    .slice()
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, 6);

  return (
    <section aria-labelledby="log-h" className="card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 id="log-h" className="font-serif text-lg font-semibold">
          Captain&rsquo;s Log
        </h2>
        <span className="text-sm text-muted">{last ? `Last active ${relativeTime(last, now)}` : 'No sessions yet'}</span>
      </header>

      {/* Today's momentum */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <Stat icon={<IconCheck size={18} />} value={String(today.solved)} label="Solved today" />
        <Stat icon={<IconClock size={18} />} value={formatDuration(today.minutes * 60000)} label="Study time" />
        <Stat icon={<IconFlame size={18} />} value={String(today.sessions)} label="Blocks today" />
      </div>

      {/* 7-day heat strip */}
      <div className="px-4 py-4 border-b border-border">
        <h3 className="label-xs mb-2">Last 7 days</h3>
        <ol className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            const intensity = d.minutes <= 0 ? 0 : 0.15 + 0.85 * Math.min(1, d.minutes / maxMin);
            const isToday = i === days.length - 1;
            const label = new Date(d.day).toLocaleDateString(undefined, { weekday: 'short' });
            return (
              <li key={d.day} className="flex flex-col items-center gap-1" title={`${label}: ${Math.round(d.minutes)} min, ${d.sessions} blocks, ${d.solved} solved`}>
                <div
                  className={`relative h-10 w-full rounded border ${isToday ? 'border-accent' : 'border-border'} overflow-hidden`}
                  aria-label={`${label}: ${Math.round(d.minutes)} minutes`}
                >
                  <div className="absolute inset-0 bg-accent" style={{ opacity: intensity }} />
                  {d.sessions > 0 && (
                    <div className="absolute bottom-1 inset-x-0 flex justify-center gap-0.5">
                      {Array.from({ length: Math.min(4, d.sessions) }).map((_, k) => (
                        <span key={k} className="h-1 w-1 rounded-full bg-ink/70" />
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-xs ${isToday ? 'font-semibold text-ink' : 'text-muted'}`}>{label.slice(0, 2)}</span>
                <span className="text-[11px] tabular-nums text-muted">{Math.round(d.minutes)}m</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Recent activity */}
      <div className="px-4 py-3">
        <h3 className="label-xs mb-1 flex items-center gap-1.5">
          <IconActivity size={14} /> Recent activity
        </h3>
        {recent.length === 0 ? (
          <p className="py-3 text-sm text-muted">Complete a question to start your log.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((s) => {
              const acc = s.answered ? Math.round((100 * s.correct) / s.answered) : 0;
              return (
                <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-14 shrink-0 tabular-nums text-muted">{relativeTime(s.endedAt, now)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.courseTitle}</span>
                    <span className="block truncate text-xs text-muted">
                      {MODE_LABEL[s.mode]} · {s.topics.slice(0, 3).join(', ')}
                      {s.topics.length > 3 ? ` +${s.topics.length - 3}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block">{s.answered} q</span>
                    <span className={`block text-xs font-semibold ${acc >= 70 ? 'text-success' : acc >= 40 ? 'text-warn' : 'text-danger'}`}>{acc}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="px-3 py-3 sm:px-4">
      <div className="flex items-center gap-1.5 text-muted">{icon}</div>
      <div className="mt-1 font-serif text-2xl font-semibold tabular-nums leading-tight">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
