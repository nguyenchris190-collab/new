import { useState, type DragEvent } from 'react';
import { parseCoursePacks, type ParseReport } from '../lib/parser';
import { useStore } from '../state/StoreContext';
import { SAMPLE_COURSE } from '../data/sampleCourse';
import { Modal } from './Overlay';
import { IconImport } from './icons';

const EXAMPLE = `{
  "title": "Linear Algebra",
  "code": "MAT2001",
  "cheatSheet": { "Determinants": ["$\\\\det(AB)=\\\\det A\\\\det B$"] },
  "questions": [
    {
      "topic": "Determinants",
      "question": "If $\\\\det A = 3$, what is $\\\\det(2A)$ for a $2\\\\times2$ matrix?",
      "choices": ["$6$", "$12$", "$9$", "$3$"],
      "answer": 1,
      "hints": ["Each of the 2 rows is scaled by 2."]
    }
  ]
}`;

export function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { importCourses, state } = useStore();
  const [tab, setTab] = useState<'paste' | 'file'>('paste');
  const [text, setText] = useState('');
  const [report, setReport] = useState<ParseReport | null>(null);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setText('');
    setReport(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const parseText = (src: string, name?: string) => setReport(parseCoursePacks(src, name?.replace(/\.json$/i, '') || 'Imported Course'));

  const readFiles = async (files: FileList | File[]) => {
    const merged: ParseReport = { courses: [], warnings: [], skipped: 0 };
    for (const f of Array.from(files)) {
      const r = parseCoursePacks(await f.text(), f.name.replace(/\.json$/i, ''));
      merged.courses.push(...r.courses);
      merged.warnings.push(...r.warnings.map((w) => `${f.name}: ${w}`));
      merged.skipped += r.skipped;
    }
    setReport(merged);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) void readFiles(e.dataTransfer.files);
  };

  const install = () => {
    if (!report?.courses.length) return;
    importCourses(report.courses);
    close();
  };

  const existing = new Set(state.courses.map((c) => c.id));

  return (
    <Modal open={open} onClose={close} title="Import Course Pack" wide>
      <div className="mb-4 grid grid-cols-2 rounded-md border border-border p-1" role="tablist">
        {(['paste', 'file'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setReport(null);
            }}
            className={`min-h-touch rounded font-medium ${tab === t ? 'bg-surface text-ink border border-border' : 'text-muted'}`}
          >
            {t === 'paste' ? 'Paste JSON' : 'Import File'}
          </button>
        ))}
      </div>

      {tab === 'paste' ? (
        <div className="space-y-3">
          <textarea
            className="field min-h-[220px] py-3 font-mono text-sm leading-relaxed"
            style={{ fontSize: 16 }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={EXAMPLE}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setReport(null);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={!text.trim()} onClick={() => parseText(text)}>
              Validate
            </button>
            <button className="btn" onClick={() => setReport(parseCoursePacks(SAMPLE_COURSE))}>
              Load sample pack
            </button>
          </div>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragging ? 'border-accent bg-accent/5' : 'border-border'
          }`}
        >
          <IconImport size={32} className="text-muted" />
          <span className="font-medium">Drop .json files here</span>
          <span className="text-sm text-muted">or tap to choose files</span>
          <input
            type="file"
            accept="application/json,.json"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.length) void readFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      )}

      {report && (
        <div className="mt-5 space-y-3 animate-reveal" aria-live="polite">
          {report.courses.length > 0 ? (
            <ul className="divide-y divide-border rounded-md border border-border">
              {report.courses.map((c) => {
                const topics = new Set(c.questions.map((q) => q.topic)).size;
                const seq = c.questions.filter((q) => q.kind === 'sequential').length;
                return (
                  <li key={c.id} className="p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">
                        {c.code && c.code !== c.title ? <span className="text-muted font-mono text-sm mr-2">{c.code}</span> : null}
                        {c.title}
                      </span>
                      {existing.has(c.id) && <span className="text-xs text-warn font-medium shrink-0">Replaces installed</span>}
                    </div>
                    <p className="text-sm text-muted">
                      {c.questions.length} questions · {topics} topics{seq ? ` · ${seq} multi-step` : ''}
                      {c.cheatSheet.length ? ' · cheat sheet' : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-danger font-medium">Nothing importable was found.</p>
          )}
          {report.warnings.length > 0 && (
            <details className="rounded-md border border-border bg-surface p-3 text-sm">
              <summary className="cursor-pointer font-medium min-h-touch flex items-center">
                {report.warnings.length} warning{report.warnings.length > 1 ? 's' : ''}
                {report.skipped ? ` · ${report.skipped} skipped` : ''}
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                {report.warnings.slice(0, 50).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}
          {report.courses.length > 0 && (
            <button className="btn-primary w-full" onClick={install}>
              Install {report.courses.length > 1 ? `${report.courses.length} courses` : 'course'}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
