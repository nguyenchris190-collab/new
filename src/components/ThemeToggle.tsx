import { useTheme } from '../state/ThemeContext';
import { IconContrast, IconMoon, IconPaper, IconSun } from './icons';

export function ThemeToggle() {
  const { theme, label, nextLabel, cycle } = useTheme();
  const Icon = { canvas: IconSun, sepia: IconPaper, slate: IconMoon, contrast: IconContrast }[theme];
  return (
    <button className="btn-icon" onClick={cycle} aria-label={`Theme: ${label}. Switch to ${nextLabel}`} title={`${label} → ${nextLabel}`}>
      <Icon />
    </button>
  );
}
