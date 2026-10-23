import { useMemo, useState } from 'react';
import { topicStats } from '../lib/analytics';
import { eligibleQuestions, pickQuestions } from '../lib/session';
import { clamp } from '../lib/util';
import { useStore } from '../state/StoreContext';
import { CourseIcon, IconChevronLeft, IconDoc, IconPlay, IconTrash } from '../components/icons';
import { ThemeToggle } from '../components/ThemeToggle';
import { CheatSheetDrawer } from './CheatSheetDrawer';
import { GapTracker } from './GapTracker';
import { SessionConfigurator } from './SessionConfigurator';

interface Props {
  courseId: string;
  goHub: () => void;
  goSession: () => void;
}

export function CourseWorkspace({ courseId, goHub, goSession }: Props) {
  const { courseById, configFor, setConfig, state, startSession, removeCourse, closeSession } = useStore();
  const course = courseById(courseId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { stats, median } = useMemo(() => (course ? topicStats(course, state.attempts) : { stats: [], median: 0 }), [course, state.attempts]);

  if (!course) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="mb-4">This course is no longer installed.</p>
        <button className="btn" onClick={goHub}>
          Back to Hub
        </button>
      </div>
    );
  }

  const config = configFor(course.id);
  const active = state.active && state.active.courseId === course.id && !state.active.finished ? state.active : null;
  const activeDone = active ? Object.values(active.items).filter((i) => i.done).length : 0;

  const start = () => {
    const pool = eligibleQuestions(course, config.mode, config.excluded);
    const qs = pickQuestions(pool, clamp(config.count, 1, pool.length), state.attempts, course.id, config.mode);
    if (!qs.length) return;
    if (state.active && !state.active.finished && !confirm('Discard the session currently in progress and start a new one?')) return;
    startSession(course, qs, config.mode);
    goSession();
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
        <div className="mx-auto flex max-w-5xl items-center gap-1 px-1 sm:px-3">
          <button className="btn-icon gap-0.5 px-2 font-medium" onClick={goHub} aria-label="Back to Hub">
            <IconChevronLeft size={20} />
            <span className="hidden sm:inline">Hub</span>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
            <CourseIcon name={course.icon} title={course.title} size={22} className="shrink-0 text-muted" />
            <h1 className="truncate font-serif text-lg font-semibold">{course.title}</h1>
          </div>
          {course.cheatSheet.length > 0 && (
            <button className="btn-icon" onClick={() => setSheetOpen(true)} aria-label="Open formula cheat sheet" title="Formula sheet">
              <IconDoc />
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-5 pb-safe">
        {course.description && <p className="mb-5 text-muted">{course.description}</p>}

        {active && (
          <div className="card mb-5 flex flex-wrap items-center gap-3 border-accent/50 p-4">
            <div className="flex-1">
              <p className="font-semibold">Session in progress</p>
              <p className="text-sm text-muted">
                {activeDone} of {active.questionIds.length} questions completed
              </p>
            </div>
            <button className="btn" onClick={() => confirm('End this session? Completed questions stay in your history.') && closeSession()}>
              End
            </button>
            <button className="btn-primary" onClick={goSession}>
              <IconPlay size={18} /> Resume
            </button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_380px] lg:items-start">
          <GapTracker stats={stats} median={median} />
          <div className="lg:sticky lg:top-20">
            <SessionConfigurator course={course} config={config} stats={stats} onChange={(p) => setConfig(course.id, p)} onStart={start} />
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            className="btn border-transparent text-sm text-muted hover:text-danger"
            onClick={() => {
              if (confirm(`Remove "${course.title}"? Your attempt history is kept.`)) {
                removeCourse(course.id);
                goHub();
              }
            }}
          >
            <IconTrash size={16} /> Remove course
          </button>
        </div>
      </main>

      <CheatSheetDrawer open={sheetOpen} onClose={() => setSheetOpen(false)} sections={course.cheatSheet} title={course.title} />
    </div>
  );
}
