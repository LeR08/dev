import type { Entry, IntakeUnit } from './types';

/** Density of ethanol at room temperature, g/ml. */
export const ETHANOL_DENSITY = 0.789;

/**
 * Common definitions of a "standard drink", in grams of pure alcohol.
 * There is no single international standard, so the user picks one.
 */
export const STANDARD_DRINK_PRESETS = [
  { grams: 8, label: 'United Kingdom', detail: '8 g — 1 UK unit' },
  { grams: 10, label: 'France / Europe', detail: '10 g — 1 standard drink' },
  { grams: 12, label: 'Germany / Austria', detail: '12 g' },
  { grams: 14, label: 'United States', detail: '14 g — 1 US standard drink' },
] as const;

/**
 * Grams of pure alcohol in a serving.
 *
 * @param volumeMl Volume of one serving in millilitres.
 * @param abv Alcohol by volume as a percentage (5 for 5%).
 * @param quantity Number of servings.
 */
export function pureAlcoholGrams(volumeMl: number, abv: number, quantity = 1): number {
  if (!isFinite(volumeMl) || !isFinite(abv) || !isFinite(quantity)) return 0;
  if (volumeMl <= 0 || abv <= 0 || quantity <= 0) return 0;
  return volumeMl * (abv / 100) * ETHANOL_DENSITY * quantity;
}

/** Grams of pure alcohol represented by a logged entry. */
export function entryGrams(entry: Pick<Entry, 'volumeMl' | 'abv' | 'quantity'>): number {
  return pureAlcoholGrams(entry.volumeMl, entry.abv, entry.quantity);
}

/** Total poured volume of a logged entry (serving size × quantity), in ml. */
export function entryVolumeMl(entry: Pick<Entry, 'volumeMl' | 'quantity'>): number {
  if (!isFinite(entry.volumeMl) || !isFinite(entry.quantity)) return 0;
  if (entry.volumeMl <= 0 || entry.quantity <= 0) return 0;
  return entry.volumeMl * entry.quantity;
}

/** Convert grams of pure alcohol into standard drinks of the given size. */
export function gramsToStandardDrinks(grams: number, standardDrinkGrams: number): number {
  if (!isFinite(grams) || !isFinite(standardDrinkGrams) || standardDrinkGrams <= 0) return 0;
  return grams / standardDrinkGrams;
}

/** Express grams of alcohol in whichever intake unit the user prefers. */
export function gramsToIntake(
  grams: number,
  intakeUnit: IntakeUnit,
  standardDrinkGrams: number
): number {
  return intakeUnit === 'grams' ? grams : gramsToStandardDrinks(grams, standardDrinkGrams);
}

/** Inverse of {@link gramsToIntake} — used to turn a goal back into grams. */
export function intakeToGrams(
  value: number,
  intakeUnit: IntakeUnit,
  standardDrinkGrams: number
): number {
  return intakeUnit === 'grams' ? value : value * standardDrinkGrams;
}

export const ML_PER_CL = 10;

export function mlToCl(ml: number): number {
  return ml / ML_PER_CL;
}

export function clToMl(cl: number): number {
  return cl * ML_PER_CL;
}
