import type { Category } from './types';

/**
 * Serving sizes offered as one-tap chips when logging, in millilitres.
 * Chosen to match how drinks are actually poured rather than round numbers.
 */
const COMMON_VOLUMES: Record<Category, number[]> = {
  beer: [250, 330, 500, 750],
  wine: [100, 125, 175, 250, 750],
  spirit: [20, 30, 40, 50],
  cocktail: [100, 150, 200, 250],
  cider: [250, 330, 500],
  aperitif: [20, 40, 70, 100],
  liqueur: [20, 30, 40, 50],
  other: [50, 100, 250, 330],
};

export function commonVolumesMl(category: Category): number[] {
  return COMMON_VOLUMES[category] ?? COMMON_VOLUMES.other;
}
