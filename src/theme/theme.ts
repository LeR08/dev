import type { AccentName, Category } from '@/domain/types';
import { ACCENTS, CATEGORY_COLORS, MONEY, PALETTES, type Accent, type Mode, type Palette } from './palette';

export type Theme = {
  mode: Mode;
  colors: Palette;
  accent: Accent;
  /** Fixed gold accent for savings/money emphasis — see palette.ts's MONEY. */
  money: Accent;
  categoryColor: (category: Category) => string;
  spacing: (steps: number) => number;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  type: {
    /** The biggest figure on a screen — the savings hero number. */
    hero: TextStyleTokens;
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

type FontWeightToken = '400' | '500' | '600' | '700' | '800';

type TextStyleTokens = {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeightToken;
  fontFamily: string;
  letterSpacing?: number;
};

const BASE_UNIT = 4;

/**
 * Manrope (see app/_layout.tsx's useFonts call) is a discrete-weight font
 * family — each weight is its own registered font name, not a single family
 * plus a numeric fontWeight — so every text style token needs to name the
 * exact weight file it wants.
 */
const FONT_FAMILY: Record<FontWeightToken, string> = {
  '400': 'Manrope_400Regular',
  '500': 'Manrope_500Medium',
  '600': 'Manrope_600SemiBold',
  '700': 'Manrope_700Bold',
  '800': 'Manrope_800ExtraBold',
};

function textStyle(
  fontSize: number,
  lineHeight: number,
  fontWeight: FontWeightToken,
  letterSpacing?: number
): TextStyleTokens {
  return { fontSize, lineHeight, fontWeight, fontFamily: FONT_FAMILY[fontWeight], letterSpacing };
}

export function createTheme(mode: Mode, accentName: AccentName): Theme {
  const colors = PALETTES[mode];
  const accent = ACCENTS[accentName][mode];
  const categories = CATEGORY_COLORS[mode];

  return {
    mode,
    colors,
    accent,
    money: MONEY[mode],
    categoryColor: (category) => categories[category] ?? categories.other,
    spacing: (steps) => steps * BASE_UNIT,
    radius: { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 },
    type: {
      hero: textStyle(46, 50, '800', -1),
      display: textStyle(40, 46, '700', -0.8),
      title: textStyle(26, 32, '700', -0.4),
      heading: textStyle(19, 25, '600', -0.2),
      body: textStyle(16, 23, '400'),
      label: textStyle(14, 19, '500'),
      caption: textStyle(12.5, 17, '500', 0.1),
      metric: textStyle(30, 35, '700', -0.6),
    },
  };
}

export type { Accent, Mode, Palette };
