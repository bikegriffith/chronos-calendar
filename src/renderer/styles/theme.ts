/**
 * Chronos design system — warm, friendly, modern (Skylight-inspired).
 * Use these tokens in components and via Tailwind utilities.
 */

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

/** Family member colors — soft pastels for calendar events and avatars */
export const familyColors = {
  coral: {
    light: '#FFB5A7',
    DEFAULT: '#F08080',
    dark: '#E57373',
  },
  skyBlue: {
    light: '#90CAF9',
    DEFAULT: '#64B5F6',
    dark: '#42A5F5',
  },
  mint: {
    light: '#A5D6A7',
    DEFAULT: '#81C784',
    dark: '#66BB6A',
  },
  lavender: {
    light: '#CE93D8',
    DEFAULT: '#BA68C8',
    dark: '#AB47BC',
  },
  peach: {
    light: '#FFCC80',
    DEFAULT: '#FFB74D',
    dark: '#FFA726',
  },
  rose: {
    light: '#F8BBD9',
    DEFAULT: '#F48FB1',
    dark: '#EC407A',
  },
  teal: {
    light: '#B2DFDB',
    DEFAULT: '#80CBC4',
    dark: '#4DB6AC',
  },
  sage: {
    light: '#C5E1A5',
    DEFAULT: '#9CCC65',
    dark: '#8BC34A',
  },
  amber: {
    light: '#FFE082',
    DEFAULT: '#FFD54F',
    dark: '#FFCA28',
  },
  violet: {
    light: '#D1C4E9',
    DEFAULT: '#B39DDB',
    dark: '#9575CD',
  },
  powderBlue: {
    light: '#B3E5FC',
    DEFAULT: '#81D4FA',
    dark: '#4FC3F7',
  },
  blush: {
    light: '#FECDD3',
    DEFAULT: '#FDA4AF',
    dark: '#FB7185',
  },
} as const;

/** Palette of family colors as a flat list for mapping (e.g. by index) */
export const familyColorList = [
  familyColors.coral,
  familyColors.skyBlue,
  familyColors.mint,
  familyColors.lavender,
  familyColors.peach,
  familyColors.rose,
  familyColors.teal,
  familyColors.sage,
  familyColors.amber,
  familyColors.violet,
  familyColors.powderBlue,
  familyColors.blush,
] as const;

/** Neutral grays — backgrounds and surfaces */
export const neutrals = {
  light: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  dark: {
    50: '#ECEFF1',
    100: '#CFD8DC',
    200: '#B0BEC5',
    300: '#90A4AE',
    400: '#78909C',
    500: '#607D8B',
    600: '#546E7A',
    700: '#455A64',
    800: '#37474F',
    900: '#263238',
    950: '#1A2329',
  },
} as const;

/** UI accent colors */
export const accents = {
  primary: {
    light: '#7CB9E8',
    DEFAULT: '#5B9BD5',
    dark: '#4A8BC2',
  },
  success: {
    light: '#81C784',
    DEFAULT: '#66BB6A',
    dark: '#4CAF50',
  },
  warning: {
    light: '#FFB74D',
    DEFAULT: '#FFA726',
    dark: '#FB8C00',
  },
  error: {
    light: '#E57373',
    DEFAULT: '#EF5350',
    dark: '#E53935',
  },
  info: {
    light: '#64B5F6',
    DEFAULT: '#42A5F5',
    dark: '#2196F3',
  },
} as const;

/** Semantic colors for light and dark mode */
export const semantic = {
  light: {
    background: neutrals.light[50],
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    text: neutrals.light[900],
    textMuted: neutrals.light[600],
    border: neutrals.light[300],
    borderSubtle: neutrals.light[200],
    inputBg: '#FFFFFF',
    focusRing: accents.primary.DEFAULT,
  },
  dark: {
    background: neutrals.dark[950],
    surface: neutrals.dark[900],
    surfaceElevated: neutrals.dark[800],
    text: neutrals.dark[50],
    textMuted: neutrals.dark[400],
    border: neutrals.dark[700],
    borderSubtle: neutrals.dark[800],
    inputBg: neutrals.dark[800],
    focusRing: accents.primary.light,
  },
} as const;

// ---------------------------------------------------------------------------
// Typography — Plus Jakarta Sans (modern, elegant, highly legible)
// ---------------------------------------------------------------------------

export const fontFamily = {
  sans: [
    'Plus Jakarta Sans',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'sans-serif',
  ].join(', '),
  display: [
    'Plus Jakarta Sans',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'sans-serif',
  ].join(', '),
} as const;

export const fontSize = {
  display: ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],   // 40px
  'heading-xl': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }], // 32px
  'heading-lg': ['1.5rem', { lineHeight: '1.25' }],                        // 24px
  'heading-md': ['1.25rem', { lineHeight: '1.3' }],                        // 20px
  'heading-sm': ['1.125rem', { lineHeight: '1.35' }],                     // 18px
  body: ['1rem', { lineHeight: '1.5' }],                                  // 16px
  'body-sm': ['0.875rem', { lineHeight: '1.5' }],                        // 14px
  caption: ['0.75rem', { lineHeight: '1.4' }],                            // 12px
  'caption-xs': ['0.6875rem', { lineHeight: '1.3' }],                     // 11px
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// ---------------------------------------------------------------------------
// Spacing (4px base)
// ---------------------------------------------------------------------------

const basePx = 4;
function px(n: number): string {
  return `${n * basePx}px`;
}

export const spacing = {
  0: '0',
  1: px(1),   // 4
  2: px(2),   // 8
  3: px(3),   // 12
  4: px(4),   // 16
  5: px(5),   // 20
  6: px(6),   // 24
  8: px(8),   // 32
  10: px(10), // 40
  12: px(12), // 48
  16: px(16), // 64
  20: px(20), // 80
  24: px(24), // 96
} as const;

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

export const borderRadius = {
  none: '0',
  sm: '6px',
  DEFAULT: '10px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  full: '9999px',
} as const;

// ---------------------------------------------------------------------------
// Shadows (cards and modals)
// ---------------------------------------------------------------------------

export const boxShadow = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.04)',
  card: '0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)',
  'card-hover': '0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
  modal: '0 24px 48px rgba(0, 0, 0, 0.12), 0 12px 24px rgba(0, 0, 0, 0.08)',
  'modal-lg': '0 32px 64px rgba(0, 0, 0, 0.16), 0 16px 32px rgba(0, 0, 0, 0.08)',
  // Dark mode variants (softer, with slight lift)
  'dark-card': '0 4px 12px rgba(0, 0, 0, 0.24), 0 2px 4px rgba(0, 0, 0, 0.16)',
  'dark-modal': '0 24px 48px rgba(0, 0, 0, 0.4), 0 12px 24px rgba(0, 0, 0, 0.24)',
} as const;

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

export const transition = {
  fast: '150ms ease',
  DEFAULT: '200ms ease',
  slow: '300ms ease',
} as const;

// ---------------------------------------------------------------------------
// Tailwind theme extension (use in tailwind.config)
// ---------------------------------------------------------------------------

export const tailwindTheme = {
  colors: {
    // Family member (pastel) colors — use as bg-family-coral, text-family-skyBlue, etc.
    family: {
      coral: {
        light: familyColors.coral.light,
        DEFAULT: familyColors.coral.DEFAULT,
        dark: familyColors.coral.dark,
      },
      skyBlue: {
        light: familyColors.skyBlue.light,
        DEFAULT: familyColors.skyBlue.DEFAULT,
        dark: familyColors.skyBlue.dark,
      },
      mint: {
        light: familyColors.mint.light,
        DEFAULT: familyColors.mint.DEFAULT,
        dark: familyColors.mint.dark,
      },
      lavender: {
        light: familyColors.lavender.light,
        DEFAULT: familyColors.lavender.DEFAULT,
        dark: familyColors.lavender.dark,
      },
      peach: {
        light: familyColors.peach.light,
        DEFAULT: familyColors.peach.DEFAULT,
        dark: familyColors.peach.dark,
      },
      rose: {
        light: familyColors.rose.light,
        DEFAULT: familyColors.rose.DEFAULT,
        dark: familyColors.rose.dark,
      },
      teal: {
        light: familyColors.teal.light,
        DEFAULT: familyColors.teal.DEFAULT,
        dark: familyColors.teal.dark,
      },
      sage: {
        light: familyColors.sage.light,
        DEFAULT: familyColors.sage.DEFAULT,
        dark: familyColors.sage.dark,
      },
      amber: {
        light: familyColors.amber.light,
        DEFAULT: familyColors.amber.DEFAULT,
        dark: familyColors.amber.dark,
      },
      violet: {
        light: familyColors.violet.light,
        DEFAULT: familyColors.violet.DEFAULT,
        dark: familyColors.violet.dark,
      },
      powderBlue: {
        light: familyColors.powderBlue.light,
        DEFAULT: familyColors.powderBlue.DEFAULT,
        dark: familyColors.powderBlue.dark,
      },
      blush: {
        light: familyColors.blush.light,
        DEFAULT: familyColors.blush.DEFAULT,
        dark: familyColors.blush.dark,
      },
    },
    // Neutrals
    neutral: neutrals.light,
    neutralDark: neutrals.dark,
    // Accents
    accent: {
      primary: accents.primary,
      success: accents.success,
      warning: accents.warning,
      error: accents.error,
      info: accents.info,
    },
  },
  fontFamily,
  fontSize,
  fontWeight,
  spacing: {
    ...spacing,
    // Tailwind default scale names for compatibility
    px: '1px',
    0.5: px(0.5),
    1.5: px(1.5),
    2.5: px(2.5),
    3.5: px(3.5),
    7: px(7),
    9: px(9),
    11: px(11),
    13: px(13),
    14: px(14),
    15: px(15),
    18: px(18),
    22: px(22),
    28: px(28),
    32: px(32),
    40: px(40),
    48: px(48),
    64: px(64),
    80: px(80),
    96: px(96),
  },
  borderRadius,
  boxShadow: {
    ...boxShadow,
  },
  transitionDuration: {
    fast: '150ms',
    DEFAULT: '200ms',
    slow: '300ms',
  },
  transitionTimingFunction: {
    DEFAULT: 'ease',
  },
} as const;
