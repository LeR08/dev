/**
 * Body-measurement unit conversions for the profile's weight and height
 * fields. Kept separate from alcohol.ts, which only deals with drink volumes.
 */

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN;
}

export function inToCm(inches: number): number {
  return inches * CM_PER_IN;
}

/** Weight in the given display unit, rounded to a sensible precision for an input field. */
export function weightInUnit(kg: number, unit: 'kg' | 'lb'): number {
  return unit === 'lb' ? Number(kgToLb(kg).toFixed(1)) : Number(kg.toFixed(1));
}

/** Height in the given display unit, rounded to a sensible precision for an input field. */
export function heightInUnit(cm: number, unit: 'cm' | 'in'): number {
  return unit === 'in' ? Number(cmToIn(cm).toFixed(1)) : Math.round(cm);
}
