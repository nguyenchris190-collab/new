import { useState } from 'react';
import type { CourseConfig, CoursePack, SessionMode } from '../types';
import { eligibleQuestions } from '../lib/session';
import { clamp } from '../lib/util';
import { IconBulb, IconChevronDown, IconFilter, IconMinus, IconPencil, IconPlus, IconRocket, IconTarget } from '../components/icons';
import type { TopicStat } from '../lib/analytics';
import { STATUS_META } from './GapTracker';
import { Dot } from '../components/icons';

const MODES: { id: SessionMode; label: string; Icon: typeof IconTarget }[] = [
  { id: 'balanced', label: 'Balanced', Icon: IconTarget },
  { id: 'theory', label: 'Theory & Concepts Only', Icon: IconBulb },
  { id: 'practice', label: 'Practice & Calculations Only', Icon: IconPencil },
];

interface Props {
  course: CoursePack;
  config: CourseConfig;
  stats: TopicStat[];
  onChange: (patch: Partial<CourseConfig>) => void;
  onStart: () => void;
}

export function SessionConfigurator({ course, config, stats, onChange, onStart }: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const pool = eligibleQuestions(course, config.mode, config.excluded);
  const max = Math.max(1, pool.length);
  const count = clamp(config.count, 1, max);
  const mode = MODES.find((m) => m.id === config.mode) ?? MODES[0];
  const topics = stats.map((s) => s.topic).sort((a, b) => a.localeCompare(b));
  const statusOf = new Map(stats.map((s) => [s.topic, s.status]));
  const excluded = new Set(config.excluded);
  const included = topics.length - topics.filter((t) => excluded.has(t)).length;

  const step = (dir: 1 | -1) => {
    const base = count;
    let next: number;
    if (dir > 0) next = base < 5 ? base + 1 : base + 5 - (base % 5);
    else next = base <= 5 ? base - 1 : base % 5 ? base - (base % 5) : base - 5;
    onChange({ count: clamp(next, 1, max) });
  };

  const toggleTopic = (t: string) => {
    const next = new Set(excluded);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    onChange({ excluded: [...next] });
  };

  return (
    <section className="card" aria-labelledby="cfg-h">
      <header className="border-b border-border px-4 py-3">
        <h2 id="cfg-h" className="font-serif text-lg font-semibold">
          Session Setup
        </h2>
      </header>

      <div className="space-y-5 p-4">
        {/* Count stepper */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-medium">Questions</span>
          <div className="flex items-center rounded-md border border-border" role="group" aria-label="Question count">
            <button className="btn-icon rounded-r-none" onClick={() => step(-1)} disabled={count <= 1} aria-label="Fewer questions">
              <IconMinus />
            </button>
            <output className="min-w-[4rem] border-x border-border px-3 text-center font-serif text-xl font-semibold tabular-nums leading-[46px]" aria-live="polite">
              {pool.length ? count : 0}
            </output>
            <button className="btn-icon rounded-l-none" onClick={() => step(1)} disabled={count >= max} aria-label="More questions">
              <IconPlus />
            </button>
          </div>
        </div>

        {/* Mode cycle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-medium">Mode</span>
          <button
            className="btn min-w-[15rem] justify-start"
            onClick={() => onChange({ mode: MODES[(MODES.indexOf(mode) + 1) % MODES.length].id })}
            aria-label={`Mode: ${mode.label}. Tap to change.`}
          >
            <mode.Icon size={20} />
            <span className="flex-1 text-left">{mode.label}</span>
            <span className="flex gap-1" aria-hidden="true">
              {MODES.map((m) => (
                <span key={m.id} className={`h-1.5 w-1.5 rounded-full ${m.id === mode.id ? 'bg-accent' : 'bg-border'}`} />
              ))}
            </span>
          </button>
        </div>

        {/* Topic filter */}
        <div className="rounded-md border border-border">
          <button
            className="flex w-full min-h-touch items-center gap-2 px-3 text-left"
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
          >
            <IconFilter size={18} className="text-muted" />
            <span className="flex-1 font-medium">Sections</span>
            <span className="text-sm text-muted">
              {included}/{topics.length} included
            </span>
            <IconChevronDown size={18} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
          {filterOpen && (
            <div className="border-t border-border animate-reveal">
              <div className="flex gap-2 px-3 pt-2">
                <button className="text-sm font-medium text-accent min-h-touch px-1" onClick={() => onChange({ excluded: [] })}>
                  Select all
                </button>
                <button className="text-sm font-medium text-muted min-h-touch px-1" onClick={() => onChange({ excluded: topics })}>
                  Clear
                </button>
              </div>
              <ul className="pb-2">
                {topics.map((t) => {
                  const st = statusOf.get(t) ?? 'unexplored';
                  return (
                    <li key={t}>
                      <label className="flex min-h-touch cursor-pointer items-center gap-3 px-3 hover:bg-surface">
                        <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--accent))]" checked={!excluded.has(t)} onChange={() => toggleTopic(t)} />
                        <span className="flex-1">{t}</span>
                        <Dot tone={STATUS_META[st].tone} size={8} />
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <button className="btn-primary w-full text-lg" disabled={!pool.length} onClick={onStart}>
          <IconRocket size={22} /> Start Practice Session
        </button>
        <p className="text-center text-xs text-muted -mt-2">
          {pool.length ? `${pool.length} eligible questions · weighted toward unseen and missed items` : 'No questions match this mode and section filter.'}
        </p>
      </div>
    </section>
  );
}
