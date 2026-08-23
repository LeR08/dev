import {
  ETHANOL_DENSITY,
  clToMl,
  entryGrams,
  gramsToIntake,
  gramsToStandardDrinks,
  intakeToGrams,
  mlToCl,
  pureAlcoholGrams,
} from '../alcohol';
import { makeEntry } from './factories';

describe('pureAlcoholGrams', () => {
  it('computes grams of ethanol for a serving', () => {
    // A 500 ml beer at 5% holds 25 ml of ethanol.
    expect(pureAlcoholGrams(500, 5)).toBeCloseTo(25 * ETHANOL_DENSITY, 6);
  });

  it('scales with quantity', () => {
    expect(pureAlcoholGrams(250, 5, 3)).toBeCloseTo(pureAlcoholGrams(250, 5) * 3, 6);
  });

  it('treats a 0% drink as zero alcohol', () => {
    expect(pureAlcoholGrams(330, 0)).toBe(0);
  });

  it('returns zero rather than NaN for nonsense input', () => {
    expect(pureAlcoholGrams(Number.NaN, 5)).toBe(0);
    expect(pureAlcoholGrams(-100, 5)).toBe(0);
    expect(pureAlcoholGrams(500, 5, 0)).toBe(0);
  });
});

describe('entryGrams', () => {
  it('uses the entry snapshot, not any drink preset', () => {
    const entry = makeEntry({ volumeMl: 125, abv: 13, quantity: 2 });
    expect(entryGrams(entry)).toBeCloseTo(125 * 0.13 * ETHANOL_DENSITY * 2, 6);
  });
});

describe('standard drinks', () => {
  it('divides grams by the chosen standard drink size', () => {
    expect(gramsToStandardDrinks(20, 10)).toBe(2);
    expect(gramsToStandardDrinks(20, 8)).toBe(2.5);
  });

  it('guards against a zero-sized standard drink', () => {
    expect(gramsToStandardDrinks(20, 0)).toBe(0);
  });

  it('round-trips through the intake unit conversions', () => {
    expect(intakeToGrams(gramsToIntake(37, 'standardDrinks', 10), 'standardDrinks', 10)).toBeCloseTo(37, 6);
    expect(gramsToIntake(37, 'grams', 10)).toBe(37);
    expect(intakeToGrams(37, 'grams', 10)).toBe(37);
  });
});

describe('volume conversion', () => {
  it('converts between millilitres and centilitres', () => {
    expect(mlToCl(250)).toBe(25);
    expect(clToMl(4)).toBe(40);
  });
});
