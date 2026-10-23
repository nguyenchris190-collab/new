import { useState } from 'react';
import { statusCounts, topicStats } from '../lib/analytics';
import { useStore } from '../state/StoreContext';
import { CourseIcon, Dot, IconChevronRight, IconLogo, IconPlus, IconSettings } from '../components/icons';
import { ImportModal } from '../components/ImportModal';
import { SettingsModal } from '../components/SettingsModal';
import { SyncIndicator } from '../components/SyncIndicator';
import { ThemeToggle } from '../components/ThemeToggle';
import { CaptainsLog } from './CaptainsLog';

export function CentralHub({ openCourse }: { openCourse: (id: string) => void }) {
  const { state, storageOk } = useStore();
  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
        <div className="mx-auto flex max-w-5xl items-center gap-1 px-3 sm:px-5">
          <div className="flex flex-1 items-center gap-2 py-2">
            <IconLogo size={26} />
            <h1 className="font-serif text-xl font-semibold tracking-tight">DrillEngine</h1>
          </div>
          <ThemeToggle />
          <SyncIndicator onClick={() => setSettingsOpen(true)} />
          <button className="btn-icon" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <IconSettings />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-5 sm:px-5 pb-safe">
        {!storageOk && (
          <p className="rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-sm text-danger">
            Browser storage is unavailable or full — progress will not persist after this tab closes.
          </p>
        )}

        <CaptainsLog />

        <section aria-labelledby="courses-h">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="courses-h" className="font-serif text-lg font-semibold">
              Courses
            </h2>
            <button className="btn" onClick={() => setImportOpen(true)}>
              <IconPlus size={18} /> Import Course Pack
            </button>
          </div>

          {state.courses.length === 0 ? (
            <button
              onClick={() => setImportOpen(true)}
              className="card flex w-full flex-col items-center gap-2 border-dashed p-10 text-center text-muted hover:bg-surface"
            >
              <IconPlus size={28} />
              <span className="font-medium text-ink">No courses installed</span>
              <span className="text-sm">Paste JSON or drop a course pack file to begin.</span>
            </button>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {state.courses.map((c) => {
                const counts = statusCounts(topicStats(c, state.attempts).stats);
                const resumable = state.active?.courseId === c.id && !state.active.finished;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => openCourse(c.id)}
                      className="card group flex h-full w-full flex-col gap-3 p-4 text-left transition-colors hover:border-strong hover:bg-surface"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface">
                          <CourseIcon name={c.icon} title={c.title} size={24} />
                        </span>
                        <span className="min-w-0 flex-1">
                          {c.code && c.code !== c.title && <span className="block font-mono text-xs text-muted">{c.code}</span>}
                          <span className="block font-semibold leading-snug">{c.title}</span>
                        </span>
                        <IconChevronRight className="mt-1 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" size={18} />
                      </div>
                      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                        <span className="text-muted">{c.questions.length} questions</span>
                        <Badge tone="success" n={counts.solid} label="Solid" />
                        <Badge tone="warn" n={counts['needs-work']} label="Needs work" />
                        <Badge tone="muted" n={counts.unexplored} label="Unexplored" />
                      </div>
                      {resumable && <span className="text-xs font-semibold text-accent">Session in progress — tap to resume</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function Badge({ tone, n, label }: { tone: 'success' | 'warn' | 'muted'; n: number; label: string }) {
  if (!n) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5" title={`${n} ${label}`}>
      <Dot tone={tone} size={8} />
      <span className="tabular-nums">{n}</span>
      <span className="text-muted">{label}</span>
    </span>
  );
}
