import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ThemeName } from '../types';

export const THEMES: { id: ThemeName; label: string; meta: string }[] = [
  { id: 'canvas', label: 'Canvas White', meta: '#ffffff' },
  { id: 'sepia', label: 'Warm Sepia', meta: '#fbf0d9' },
  { id: 'slate', label: 'Slate Dark', meta: '#18181b' },
  { id: 'contrast', label: 'High Contrast', meta: '#ffffff' },
];

const KEY = 'drillengine:theme';

interface ThemeCtx {
  theme: ThemeName;
  label: string;
  nextLabel: string;
  cycle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function initial(): ThemeName {
  try {
    const t = localStorage.getItem(KEY) as ThemeName | null;
    if (t && THEMES.some((x) => x.id === t)) return t;
  } catch {
    /* ignore */
  }
  return 'canvas';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(initial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', THEMES.find((t) => t.id === theme)?.meta ?? '#ffffff');
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((t) => THEMES[(THEMES.findIndex((x) => x.id === t) + 1) % THEMES.length].id);
  }, []);

  const i = THEMES.findIndex((x) => x.id === theme);
  return (
    <Ctx.Provider value={{ theme, cycle, label: THEMES[i].label, nextLabel: THEMES[(i + 1) % THEMES.length].label }}>{children}</Ctx.Provider>
  );
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme outside ThemeProvider');
  return c;
}
