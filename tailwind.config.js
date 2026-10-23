/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        ink: token('ink'),
        muted: token('muted'),
        border: token('border'),
        strong: token('border-strong'),
        accent: token('accent'),
        'on-accent': token('on-accent'),
        success: token('success'),
        'success-bg': token('success-bg'),
        danger: token('danger'),
        'danger-bg': token('danger-bg'),
        warn: token('warn'),
        'warn-bg': token('warn-bg'),
      },
      fontFamily: {
        sans: ['"Source Sans 3"', '"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      minHeight: { touch: '48px' },
      minWidth: { touch: '48px' },
    },
  },
  plugins: [],
};
