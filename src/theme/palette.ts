import type { AccentName, Category } from '@/domain/types';

/**
 * Colour language.
 *
 * Warm neutrals, muted accents, no alarm red anywhere. Category colours are
 * chosen to be distinguishable in a chart without any of them reading as a
 * warning — going over a goal is shown in the accent colour, not in red.
 */

export type Mode = 'light' | 'dark';

export type Accent = {
  /** Primary accent — buttons, active states, the main chart series. */
  base: string;
  /** Accent used on top of `soft` backgrounds; darker in light mode. */
  strong: string;
  /** Tinted background for chips and cards. */
  soft: string;
  /** Text/icon colour that sits legibly on `base`. */
  onBase: string;
};

export const ACCENTS: Record<AccentName, { label: string; light: Accent; dark: Accent }> = {
  sage: {
    label: 'Sage',
    light: { base: '#6E8B6B', strong: '#4E6A4C', soft: '#E7EEE5', onBase: '#FFFFFF' },
    dark: { base: '#8FAF8B', strong: '#B2CBAE', soft: '#253024', onBase: '#12180F' },
  },
  ocean: {
    label: 'Ocean',
    light: { base: '#4F7A94', strong: '#375C72', soft: '#E3EDF2', onBase: '#FFFFFF' },
    dark: { base: '#7FA9C2', strong: '#A6C6D8', soft: '#1E2C34', onBase: '#0E161B' },
  },
  plum: {
    label: 'Plum',
    light: { base: '#7B5E85', strong: '#5C4364', soft: '#EDE6EF', onBase: '#FFFFFF' },
    dark: { base: '#A78BB0', strong: '#C4AECB', soft: '#2C2431', onBase: '#160F19' },
  },
  amber: {
    label: 'Amber',
    light: { base: '#A87A3C', strong: '#835C27', soft: '#F3EADC', onBase: '#FFFFFF' },
    dark: { base: '#D3A263', strong: '#E4BE8B', soft: '#33291B', onBase: '#1B1409' },
  },
  clay: {
    label: 'Clay',
    light: { base: '#A56A5B', strong: '#814E41', soft: '#F2E6E2', onBase: '#FFFFFF' },
    dark: { base: '#C48C7C', strong: '#D9AB9E', soft: '#33241F', onBase: '#1C110D' },
  },
};

export type Palette = {
  background: string;
  surface: string;
  /** Slightly recessed surface for grouped rows and inputs. */
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  /** Neutral "nothing here" fill for charts and calendar dots. */
  trackEmpty: string;
  /** Positive/celebratory tone, used sparingly for streaks. */
  positive: string;
  overlay: string;
  shadow: string;
};

export const PALETTES: Record<Mode, Palette> = {
  light: {
    background: '#F7F5F2',
    surface: '#FFFFFF',
    surfaceMuted: '#F1EEE9',
    border: '#E4DFD7',
    text: '#1C1A17',
    textMuted: '#6E675F',
    textFaint: '#9A938A',
    trackEmpty: '#EAE5DE',
    positive: '#5C8A6A',
    overlay: 'rgba(28, 26, 23, 0.35)',
    shadow: 'rgba(28, 26, 23, 0.10)',
  },
  dark: {
    background: '#14120F',
    surface: '#1E1B18',
    surfaceMuted: '#262220',
    border: '#332E2A',
    text: '#F3EFE9',
    textMuted: '#A9A099',
    textFaint: '#7C736C',
    trackEmpty: '#2A2522',
    positive: '#8FBF9C',
    overlay: 'rgba(0, 0, 0, 0.55)',
    shadow: 'rgba(0, 0, 0, 0.45)',
  },
};

export const CATEGORY_COLORS: Record<Mode, Record<Category, string>> = {
  light: {
    beer: '#C89B3C',
    wine: '#9B5C6E',
    spirit: '#6B7FA8',
    cocktail: '#5F9E8B',
    cider: '#A8A24E',
    aperitif: '#C1795A',
    liqueur: '#8A6EA8',
    other: '#8E877F',
  },
  dark: {
    beer: '#DCB25A',
    wine: '#BC7A8B',
    spirit: '#8B9EC6',
    cocktail: '#7DBBA7',
    cider: '#C0BA6A',
    aperitif: '#D9957A',
    liqueur: '#A78CC4',
    other: '#A69E96',
  },
};
