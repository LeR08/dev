import type { AccentName, Category } from '@/domain/types';
import { ACCENTS, CATEGORY_COLORS, PALETTES, type Accent, type Mode, type Palette } from './palette';

export type Theme = {
  mode: Mode;
  colors: Palette;
  accent: Accent;
  categoryColor: (category: Category) => string;
  spacing: (steps: number) => number;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  type: {
    display: TextStyleTokens;
    title: TextStyleTokens;
    heading: TextStyleTokens;
    body: TextStyleTokens;
    label: TextStyleTokens;
    caption: TextStyleTokens;
    /** Tabular-ish figures for stat cards. */
    metric: TextStyleTokens;
  };
};

type TextStyleTokens = {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing?: number;
};

const BASE_UNIT = 4;

export function createTheme(mode: Mode, accentName: AccentName): Theme {
  const colors = PALETTES[mode];
  const accent = ACCENTS[accentName][mode];
  const categories = CATEGORY_COLORS[mode];

  return {
    mode,
    colors,
    accent,
    categoryColor: (category) => categories[category] ?? categories.other,
    spacing: (steps) => steps * BASE_UNIT,
    radius: { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 },
    type: {
      display: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.8 },
      title: { fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.4 },
      heading: { fontSize: 19, lineHeight: 25, fontWeight: '600', letterSpacing: -0.2 },
      body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
      label: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
      caption: { fontSize: 12.5, lineHeight: 17, fontWeight: '500', letterSpacing: 0.1 },
      metric: { fontSize: 30, lineHeight: 35, fontWeight: '700', letterSpacing: -0.6 },
    },
  };
}

export type { Accent, Mode, Palette };
