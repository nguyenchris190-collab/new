import { useEffect, useState } from 'react';
import type { Question } from '../types';
import { buildAgentPrompt, copyText, ISSUE_TYPES } from '../lib/report';
import { Modal } from '../components/Overlay';
import { IconCheck, IconClipboard } from '../components/icons';

interface Props {
  open: boolean;
  onClose: () => void;
  packId: string;
  question: Question;
  onCopied: () => void;
}

/** Developer "Fix with Agent" tool: turns a reported issue into a ready-to-paste agent prompt. */
export function ReportModal({ open, onClose, packId, question, onCopied }: Props) {
  const [issues, setIssues] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<'ok' | 'fail' | null>(null);

  useEffect(() => {
    if (!open) return;
    setIssues([]);
    setNote('');
    setToast(null);
  }, [open, question.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggle = (i: string) => setIssues((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  const copy = async () => {
    const ok = await copyText(buildAgentPrompt(packId, question, issues, note));
    setToast(ok ? 'ok' : 'fail');
    if (ok) onCopied();
  };

  return (
    <Modal open={open} onClose={onClose} title="Report / Fix Question">
      <p className="mb-3 text-sm text-muted">
        <span className="font-mono">{question.id}</span> · {question.topic}
      </p>
      <fieldset className="space-y-1">
        <legend className="label-xs mb-1">Issue</legend>
        {ISSUE_TYPES.map((i) => (
          <label key={i} className="flex min-h-touch cursor-pointer items-center gap-3 rounded-md px-1 hover:bg-surface">
            <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--accent))]" checked={issues.includes(i)} onChange={() => toggle(i)} />
            <span>{i}</span>
          </label>
        ))}
      </fieldset>
      <label className="mt-4 block">
        <span className="label-xs">Note (optional)</span>
        <input
          className="field mt-1"
          maxLength={200}
          placeholder="e.g. Step 2 missing negative sign in numerator"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void copy()}
        />
      </label>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={() => void copy()}>
          <IconClipboard size={18} /> Copy Agent Prompt
        </button>
        {toast && (
          <span role="status" className={`inline-flex items-center gap-1.5 text-sm font-medium animate-fade ${toast === 'ok' ? 'text-success' : 'text-danger'}`}>
            {toast === 'ok' ? (
              <>
                <IconCheck size={16} /> Diagnostic prompt copied to clipboard!
              </>
            ) : (
              'Clipboard unavailable in this browser.'
            )}
          </span>
        )}
      </div>
    </Modal>
  );
}
