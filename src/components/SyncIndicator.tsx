import { useStore } from '../state/StoreContext';
import { relativeTime } from '../lib/util';
import { IconCloudAlert, IconCloudCheck, IconCloudOff, IconCloudSync, IconDevice } from './icons';

export function SyncIndicator({ onClick }: { onClick: () => void }) {
  const { syncStatus, syncError, state } = useStore();
  const last = state.sync.lastSyncedAt;
  const meta = {
    off: { Icon: IconDevice, label: 'Local only — sync not configured' },
    synced: { Icon: IconCloudCheck, label: `Synced${last ? ` ${relativeTime(last)}` : ''}` },
    syncing: { Icon: IconCloudSync, label: 'Syncing…' },
    offline: { Icon: IconCloudOff, label: 'Offline — changes saved locally' },
    error: { Icon: IconCloudAlert, label: `Sync error: ${syncError ?? 'unknown'}` },
  }[syncStatus];
  return (
    <button className={`btn-icon ${syncStatus === 'error' ? 'text-danger' : ''}`} onClick={onClick} aria-label={meta.label} title={meta.label}>
      <meta.Icon className={syncStatus === 'syncing' ? 'animate-pulse' : undefined} />
    </button>
  );
}
