import type { ReactElement, ReactNode, SVGProps } from 'react';

/**
 * Monoline icon set: 1.75px stroke in currentColor, with a single accent
 * stroke/fill ("two-tone pop") drawn via the .ic-accent / .ic-fill classes.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconLogo = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M7.5 16.5c1.5-6.5 3-8 4.5-8s3 1.5 4.5 8" />
    <path className="ic-accent" d="M7 12.5h10" />
  </Svg>
);

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle className="ic-fill" cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </Svg>
);

export const IconPaper = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h9l3 3v15H6z" />
    <path className="ic-accent" d="M9 10h6M9 13.5h6M9 17h4" />
  </Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path className="ic-fill" d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </Svg>
);

export const IconContrast = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" />
  </Svg>
);

export const IconCloudCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9.5z" />
    <path className="ic-accent" d="M9.5 13.5l2 2 3.5-3.5" />
  </Svg>
);

export const IconCloudOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96 6 6 0 0 1 1.3-2.9M10.5 4.2A6 6 0 0 1 18 9a4.5 4.5 0 0 1 2.2 8.2M17.5 18.5H11" />
    <path className="ic-accent" d="M3.5 3.5l17 17" />
  </Svg>
);

export const IconCloudSync = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9.5z" />
    <path className="ic-accent" d="M9.5 13a2.5 2.5 0 0 1 4.3-1.7M14.5 14a2.5 2.5 0 0 1-4.3 1.7M14 10.5v1.2h-1.2M10 16.5v-1.2h1.2" />
  </Svg>
);

export const IconCloudAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9.5z" />
    <path className="ic-accent" d="M12 10.5v3M12 16v.01" />
  </Svg>
);

export const IconDevice = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6" y="3" width="12" height="18" rx="2.5" />
    <path className="ic-accent" d="M10.5 17.5h3" />
  </Svg>
);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle className="ic-accent" cx="16" cy="7" r="2" />
    <circle className="ic-accent" cx="10" cy="17" r="2" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);

export const IconImport = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
    <path className="ic-accent" d="M12 4v11M8 11l4 4 4-4" />
  </Svg>
);

export const IconDoc = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
    <path className="ic-accent" d="M9 12h6M9 15.5h6M9 19h3" />
  </Svg>
);

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 6l-6 6 6 6" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 6l6 6-6 6" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9.5l6 6 6-6" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const IconX = IconClose;

export const IconFlag = (p: IconProps & { filled?: boolean }) => {
  const { filled, ...rest } = p;
  return (
    <Svg {...rest}>
      <path d="M5.5 21V4" />
      <path className={filled ? 'ic-accent' : undefined} d="M5.5 4.5h11l-2.5 4 2.5 4h-11" fill={filled ? 'rgb(var(--accent) / 0.25)' : 'none'} />
    </Svg>
  );
};

export const IconTarget = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="5" />
    <circle className="ic-accent ic-fill" cx="12" cy="12" r="1.5" />
  </Svg>
);

export const IconBulb = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 17.5h6M10 21h4" />
    <path className="ic-fill" d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
    <path className="ic-accent" d="M12 7.5v3.5" />
  </Svg>
);

export const IconPencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z" />
    <path className="ic-accent" d="M13.5 7l3.5 3.5M4 20h16" />
  </Svg>
);

export const IconRocket = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 15.5l-3.5-3.5C10 7 13.5 4 19.5 4.5 20 10.5 17 14 12 15.5z" />
    <path d="M8.5 12H5l2.5-3.5h3.5M12 15.5V19l3.5-2.5V13" />
    <circle className="ic-accent" cx="15" cy="9" r="1.5" />
    <path className="ic-accent" d="M6 18l-1.5 1.5" />
  </Svg>
);

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path className="ic-fill" d="M7.5 5v14l11-7z" />
  </Svg>
);

export const IconPause = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 5.5v13M15 5.5v13" />
  </Svg>
);

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
    <rect className="ic-fill" x="13.5" y="4" width="6.5" height="6.5" rx="1" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path className="ic-accent" d="M12 7.5V12l3 2" />
  </Svg>
);

export const IconFilter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h16l-6 7.5V19l-4 1.5v-8z" />
  </Svg>
);

export const IconWarn = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5L2.5 20h19z" />
    <path d="M12 10v4.5M12 17v.01" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
    <path className="ic-accent" d="M10.5 11v5.5M13.5 11v5.5" />
  </Svg>
);

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
    <path className="ic-accent" d="M12 4v11M8 11l4 4 4-4" />
  </Svg>
);

export const IconActivity = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />
  </Svg>
);

export const IconFlame = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4.5-4-6.5-4.5-11-3 2-5.5 5-5.5 8.5A3 3 0 0 1 7 9.5 6.5 6.5 0 0 0 12 21z" />
    <path className="ic-accent" d="M12 21a2.8 2.8 0 0 1-2.8-2.8c0-2 2.8-3.7 2.8-3.7s2.8 1.7 2.8 3.7A2.8 2.8 0 0 1 12 21z" />
  </Svg>
);

export const IconBook = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
    <path d="M13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13z" />
    <path className="ic-accent" d="M15.5 8h2M15.5 11h2" />
  </Svg>
);

/* ---- Course glyphs ---- */
export const IconCalculus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 20c-1.5 0-2-1-2-2.2V6.2C7 5 7.5 4 9 4" />
    <path className="ic-accent" d="M11 16c2-8 3.5-9 5-9s1.5 1 1.5 1" />
    <path d="M11 12.5h6" />
  </Svg>
);
export const IconSigma = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17.5 5H6.5l6 7-6 7h11" />
    <path className="ic-accent" d="M17.5 5v2M17.5 17v2" />
  </Svg>
);
export const IconMatrix = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4H5v16h2M17 4h2v16h-2" />
    <path className="ic-accent" d="M9 9h.01M12 9h.01M15 9h.01M9 15h.01M12 15h.01M15 15h.01" strokeWidth={2.5} />
  </Svg>
);
export const IconGraph = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4v16h16" />
    <path className="ic-accent" d="M7 15c2-5 4-7 6-4s3 1 5-4" />
  </Svg>
);
export const IconTriangle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 19L19 19L19 5Z" />
    <path className="ic-accent" d="M16 19v-3h3" />
  </Svg>
);
export const IconDice = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path className="ic-accent" d="M8.5 8.5h.01M15.5 15.5h.01M12 12h.01M15.5 8.5h.01M8.5 15.5h.01" strokeWidth={2.75} />
  </Svg>
);

const COURSE_ICONS: Record<string, (p: IconProps) => ReactElement> = {
  calculus: IconCalculus,
  integral: IconCalculus,
  derivative: IconCalculus,
  sigma: IconSigma,
  series: IconSigma,
  algebra: IconSigma,
  matrix: IconMatrix,
  linear: IconMatrix,
  graph: IconGraph,
  function: IconGraph,
  geometry: IconTriangle,
  trig: IconTriangle,
  trigonometry: IconTriangle,
  probability: IconDice,
  statistics: IconDice,
  stats: IconDice,
  book: IconBook,
};

export function CourseIcon({ name, title, ...p }: IconProps & { name?: string; title?: string }) {
  const key = (name ?? '').toLowerCase();
  let Comp = COURSE_ICONS[key];
  if (!Comp) {
    const t = (title ?? '').toLowerCase();
    const hit = Object.keys(COURSE_ICONS).find((k) => t.includes(k));
    Comp = hit ? COURSE_ICONS[hit] : IconBook;
  }
  return <Comp {...p} />;
}

/** Small filled status dot (replaces coloured emoji). */
export function Dot({ tone, size = 10 }: { tone: 'success' | 'warn' | 'muted' | 'danger' | 'accent'; size?: number }) {
  const color: Record<string, string> = {
    success: 'rgb(var(--success))',
    warn: 'rgb(var(--warn))',
    danger: 'rgb(var(--danger))',
    accent: 'rgb(var(--accent))',
    muted: 'transparent',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" className="shrink-0">
      <circle cx="5" cy="5" r="4" fill={color[tone]} stroke={tone === 'muted' ? 'rgb(var(--muted))' : color[tone]} strokeWidth={1.5} />
    </svg>
  );
}

export const IconWrench = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="15.5" cy="8.5" r="4.5" />
    <path d="M12.3 11.7l-7 7a1.6 1.6 0 0 0 2.2 2.2l7-7" />
    <path className="ic-accent" d="M15.5 8.5l3.2-3.2" />
  </Svg>
);

export const IconClipboard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5.5" y="4.5" width="13" height="16" rx="2" />
    <rect className="ic-fill" x="9" y="3" width="6" height="3.5" rx="1" />
    <path className="ic-accent" d="M9 12h6M9 15.5h4" />
  </Svg>
);

export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle className="ic-accent ic-fill" cx="12" cy="12" r="2.75" />
  </Svg>
);
