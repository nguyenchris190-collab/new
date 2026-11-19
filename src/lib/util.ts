export const uid = (prefix = '') =>
  prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Small stable string hash (FNV-1a) for deriving ids from content. */
export function hash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function relativeTime(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/**
 * Parse a user-entered time string into milliseconds.
 * Accepts:
 *  - "MM:SS" (e.g. "12:30" -> 12m 30s)
 *  - "HH:MM:SS" (e.g. "1:05:00" -> 1h 5m)
 *  - plain number "M" (e.g. "15" -> 15 minutes)
 *  - unit suffixes like "1h 20m", "15m", "90s"
 */
export function parseClockInput(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  if (s.includes(':')) {
    const parts = s.split(':').map((p) => p.trim());
    if (parts.some((p) => !/^\d+$/.test(p))) return null;
    const nums = parts.map((p) => parseInt(p, 10));
    if (nums.length === 2) {
      const [m, sec] = nums;
      return (m * 60 + sec) * 1000;
    }
    if (nums.length === 3) {
      const [h, m, sec] = nums;
      return (h * 3600 + m * 60 + sec) * 1000;
    }
    return null;
  }

  const unitRe = /(\d+(?:\.\d+)?)\s*(h|hr|hrs|m|min|mins|s|sec|secs)/g;
  let match: RegExpExecArray | null;
  let totalSec = 0;
  let matchedUnits = false;
  while ((match = unitRe.exec(s)) !== null) {
    matchedUnits = true;
    const val = parseFloat(match[1]);
    const unit = match[2][0];
    if (unit === 'h') totalSec += val * 3600;
    else if (unit === 'm') totalSec += val * 60;
    else totalSec += val;
  }
  if (matchedUnits) return Math.max(0, Math.round(totalSec * 1000));

  if (/^\d+(?:\.\d+)?$/.test(s)) {
    const mins = parseFloat(s);
    return Math.max(0, Math.round(mins * 60 * 1000));
  }

  return null;
}

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
