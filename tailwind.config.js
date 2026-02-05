/**
 * Chronos Tailwind config — uses design system from src/renderer/styles/theme.ts.
 * Keep in sync with theme.ts for colors, spacing, typography, radius, shadows.
 */

// Design tokens (mirrors theme.ts for Tailwind; theme.ts is source of truth for app code)
const familyColors = {
  coral: { light: '#FFB5A7', DEFAULT: '#F08080', dark: '#E57373' },
  skyBlue: { light: '#90CAF9', DEFAULT: '#64B5F6', dark: '#42A5F5' },
  mint: { light: '#A5D6A7', DEFAULT: '#81C784', dark: '#66BB6A' },
  lavender: { light: '#CE93D8', DEFAULT: '#BA68C8', dark: '#AB47BC' },
  peach: { light: '#FFCC80', DEFAULT: '#FFB74D', dark: '#FFA726' },
};

const neutrals = {
  light: {
    50: '#FAFAFA', 100: '#F5F5F5', 200: '#EEEEEE', 300: '#E0E0E0',
    400: '#BDBDBD', 500: '#9E9E9E', 600: '#757575', 700: '#616161',
    800: '#424242', 900: '#212121',
  },
  dark: {
    50: '#ECEFF1', 100: '#CFD8DC', 200: '#B0BEC5', 300: '#90A4AE',
    400: '#78909C', 500: '#607D8B', 600: '#546E7A', 700: '#455A64',
    800: '#37474F', 900: '#263238', 950: '#1A2329',
  },
};

const accents = {
  primary: { light: '#7CB9E8', DEFAULT: '#5B9BD5', dark: '#4A8BC2' },
  success: { light: '#81C784', DEFAULT: '#66BB6A', dark: '#4CAF50' },
  warning: { light: '#FFB74D', DEFAULT: '#FFA726', dark: '#FB8C00' },
  error: { light: '#E57373', DEFAULT: '#EF5350', dark: '#E53935' },
  info: { light: '#64B5F6', DEFAULT: '#42A5F5', dark: '#2196F3' },
};

const fontFamily = {
  sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'].join(', '),
  display: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'].join(', '),
};

const fontSize = {
  display: ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
  'heading-xl': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
  'heading-lg': ['1.5rem', { lineHeight: '1.25' }],
  'heading-md': ['1.25rem', { lineHeight: '1.3' }],
  'heading-sm': ['1.125rem', { lineHeight: '1.35' }],
  body: ['1rem', { lineHeight: '1.5' }],
  'body-sm': ['0.875rem', { lineHeight: '1.5' }],
  caption: ['0.75rem', { lineHeight: '1.4' }],
  'caption-xs': ['0.6875rem', { lineHeight: '1.3' }],
};

const fontWeight = { normal: '400', medium: '500', semibold: '600', bold: '700' };

const basePx = 4;
const px = (n) => `${n * basePx}px`;
const spacing = {
  0: '0', 1: px(1), 2: px(2), 3: px(3), 4: px(4), 5: px(5), 6: px(6),
  8: px(8), 10: px(10), 12: px(12), 16: px(16), 20: px(20), 24: px(24),
  px: '1px', 0.5: px(0.5), 1.5: px(1.5), 2.5: px(2.5), 3.5: px(3.5),
  7: px(7), 9: px(9), 11: px(11), 13: px(13), 14: px(14), 15: px(15),
  18: px(18), 22: px(22), 28: px(28), 32: px(32), 40: px(40), 48: px(48),
  64: px(64), 80: px(80), 96: px(96),
};

const borderRadius = {
  none: '0', sm: '6px', DEFAULT: '10px', md: '12px', lg: '16px',
  xl: '20px', '2xl': '24px', full: '9999px',
};

const boxShadow = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.04)',
  card: '0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)',
  'card-hover': '0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
  modal: '0 24px 48px rgba(0, 0, 0, 0.12), 0 12px 24px rgba(0, 0, 0, 0.08)',
  'modal-lg': '0 32px 64px rgba(0, 0, 0, 0.16), 0 16px 32px rgba(0, 0, 0, 0.08)',
  'dark-card': '0 4px 12px rgba(0, 0, 0, 0.24), 0 2px 4px rgba(0, 0, 0, 0.16)',
  'dark-modal': '0 24px 48px rgba(0, 0, 0, 0.4), 0 12px 24px rgba(0, 0, 0, 0.24)',
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        family: familyColors,
        neutral: neutrals.light,
        'neutral-dark': neutrals.dark,
        accent: accents,
      },
      fontFamily,
      fontSize,
      fontWeight,
      spacing,
      borderRadius,
      boxShadow,
      transitionDuration: { fast: '150ms', DEFAULT: '200ms', slow: '300ms' },
    },
  },
  plugins: [],
};
