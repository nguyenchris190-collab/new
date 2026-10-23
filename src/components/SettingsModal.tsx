import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/StoreContext';
import { generateSyncKey } from '../lib/sync';
import { relativeTime } from '../lib/util';
import type { AppState, SyncProvider } from '../types';
import { Modal } from './Overlay';
import { IconDownload, IconImport, IconTrash } from './icons';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, setSync, syncNow, syncStatus, syncError, resetAll, replaceAll } = useStore();
  const [draft, setDraft] = useState(state.sync);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset the draft only when the modal opens, not on every background sync.
    if (open) setDraft(state.sync);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    setSync({ ...draft, enabled: !!draft.url.trim() && !!draft.syncKey.trim() && draft.enabled });
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ ...state, active: null, sync: { ...state.sync, apiKey: '' } }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `drillengine-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const restoreBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Partial<AppState>;
      if (!Array.isArray(data.courses) || !Array.isArray(data.attempts)) throw new Error('Not a DrillEngine backup');
      if (!confirm('Replace all local data with this backup?')) return;
      replaceAll({ ...(data as AppState), sync: state.sync, active: null });
      onClose();
    } catch (e) {
      alert(`Could not restore: ${(e as Error).message}`);
    }
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(state.sync);

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <section className="space-y-4">
        <div>
          <h3 className="label-xs mb-1">Cloud sync (optional)</h3>
          <p className="text-sm text-muted">
            No account needed. Your progress is stored as one JSON document under a private sync key. Use the same key on another device to share progress.
          </p>
        </div>

        <label className="flex items-center gap-3 min-h-touch cursor-pointer">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[rgb(var(--accent))]"
            checked={draft.enabled}
            onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
          />
          <span className="font-medium">Enable background sync</span>
        </label>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Provider">
          {(['supabase', 'firebase'] as SyncProvider[]).map((p) => (
            <button
              key={p}
              role="radio"
              aria-checked={draft.provider === p}
              onClick={() => setDraft({ ...draft, provider: p })}
              className={`btn ${draft.provider === p ? 'border-accent text-accent bg-accent/5' : ''}`}
            >
              {p === 'supabase' ? 'Supabase' : 'Firebase RTDB'}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-sm font-medium">{draft.provider === 'supabase' ? 'Project URL' : 'Database URL'}</span>
          <input
            className="field mt-1"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={draft.provider === 'supabase' ? 'https://xyz.supabase.co' : 'https://project-default-rtdb.firebaseio.com'}
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
        </label>

        {draft.provider === 'supabase' && (
          <label className="block">
            <span className="text-sm font-medium">Anon public key</span>
            <input
              className="field mt-1 font-mono"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={draft.apiKey}
              onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
            />
            <span className="mt-1 block text-xs text-muted">
              Needs a table <code className="font-mono">drillengine_sync(sync_key text primary key, payload jsonb, updated_at timestamptz)</code>.
            </span>
          </label>
        )}

        <label className="block">
          <span className="text-sm font-medium">Sync key</span>
          <div className="mt-1 flex gap-2">
            <input
              className="field font-mono"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={draft.syncKey}
              onChange={(e) => setDraft({ ...draft, syncKey: e.target.value })}
            />
            <button className="btn shrink-0" onClick={() => setDraft({ ...draft, syncKey: generateSyncKey() })}>
              Generate
            </button>
          </div>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary" disabled={!dirty} onClick={save}>
            Save
          </button>
          <button className="btn" disabled={dirty || !state.sync.enabled} onClick={() => void syncNow()}>
            Sync now
          </button>
          <span className="text-sm text-muted" aria-live="polite">
            {syncStatus === 'syncing'
              ? 'Syncing…'
              : syncStatus === 'error'
                ? `Error: ${syncError}`
                : syncStatus === 'offline'
                  ? 'Offline'
                  : state.sync.lastSyncedAt
                    ? `Last synced ${relativeTime(state.sync.lastSyncedAt)}`
                    : syncStatus === 'off'
                      ? 'Local only'
                      : ''}
          </span>
        </div>
      </section>

      <hr className="my-6 border-border" />

      <section className="space-y-3">
        <h3 className="label-xs">Data</h3>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={exportBackup}>
            <IconDownload size={18} /> Export backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <IconImport size={18} /> Restore backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void restoreBackup(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn text-danger"
            onClick={() => {
              if (confirm('Erase all courses, history and settings on this device?')) {
                resetAll();
                onClose();
              }
            }}
          >
            <IconTrash size={18} /> Reset all data
          </button>
        </div>
        <p className="text-xs text-muted">
          {state.courses.length} courses · {state.attempts.length} attempts · {state.sessions.length} sessions stored locally.
        </p>
      </section>
    </Modal>
  );
}
