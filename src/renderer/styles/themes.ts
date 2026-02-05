/**
 * Chronos theme definitions — pastel gradient backgrounds and semantic vars.
 * Each theme sets data-theme on document; dark themes also get .dark for component colors.
 */

export interface ChronosTheme {
  id: string;
  label: string;
  /** If true, document gets .dark class for text/surface semantics */
  dark: boolean;
  /** CSS linear-gradient or similar for page background */
  background: string;
}

export const CHRONOS_THEMES: ChronosTheme[] = [
  // Light pastels
  {
    id: 'light-sky',
    label: 'Sky Blush',
    dark: false,
    background: 'linear-gradient(160deg, #e8f4fc 0%, #fce8f0 45%, #f5f0ff 100%)',
  },
  {
    id: 'light-lavender',
    label: 'Lavender Mist',
    dark: false,
    background: 'linear-gradient(165deg, #f3e8ff 0%, #e8f0fe 50%, #fce7f3 100%)',
  },
  {
    id: 'light-mint',
    label: 'Mint Frost',
    dark: false,
    background: 'linear-gradient(155deg, #ecfdf5 0%, #e0f2fe 40%, #fef9c3 100%)',
  },
  {
    id: 'light-peach',
    label: 'Peach Dawn',
    dark: false,
    background: 'linear-gradient(150deg, #fff7ed 0%, #ffedd5 35%, #fef3c7 100%)',
  },
  {
    id: 'light-seashell',
    label: 'Seashell',
    dark: false,
    background: 'linear-gradient(170deg, #fef2f2 0%, #f5f3ff 50%, #ecfeff 100%)',
  },
  // Dark pastels
  {
    id: 'dark-midnight',
    label: 'Midnight',
    dark: true,
    background: 'linear-gradient(165deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)',
  },
  {
    id: 'dark-dusk',
    label: 'Dusk',
    dark: true,
    background: 'linear-gradient(160deg, #1c1917 0%, #422c2a 45%, #3f2a4a 100%)',
  },
  {
    id: 'dark-forest',
    label: 'Forest',
    dark: true,
    background: 'linear-gradient(155deg, #0c1810 0%, #1a2e1a 40%, #0f2d1f 100%)',
  },
  {
    id: 'dark-navy',
    label: 'Navy Dream',
    dark: true,
    background: 'linear-gradient(170deg, #0c1929 0%, #172554 50%, #1e3a5f 100%)',
  },
  {
    id: 'dark-plum',
    label: 'Plum',
    dark: true,
    background: 'linear-gradient(160deg, #1a1625 0%, #2e1065 40%, #3b0764 100%)',
  },
];

export const DEFAULT_THEME_ID = 'light-sky';

export function getTheme(id: string): ChronosTheme | undefined {
  return CHRONOS_THEMES.find((t) => t.id === id);
}

export function getThemeOrDefault(id: string | undefined): ChronosTheme {
  if (id) {
    const t = getTheme(id);
    if (t) return t;
  }
  return CHRONOS_THEMES.find((t) => t.id === DEFAULT_THEME_ID) ?? CHRONOS_THEMES[0]!;
}
