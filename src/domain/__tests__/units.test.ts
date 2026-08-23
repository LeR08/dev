import { cmToIn, heightInUnit, inToCm, kgToLb, lbToKg, weightInUnit } from '../units';

describe('weight conversion', () => {
  it('converts kilograms to pounds and back', () => {
    expect(kgToLb(70)).toBeCloseTo(154.32, 1);
    expect(lbToKg(154.32)).toBeCloseTo(70, 1);
  });

  it('round-trips within a tenth of a unit', () => {
    expect(lbToKg(kgToLb(65))).toBeCloseTo(65, 6);
  });

  it('formats for display in the requested unit', () => {
    expect(weightInUnit(70, 'kg')).toBe(70);
    expect(weightInUnit(70, 'lb')).toBeCloseTo(154.3, 1);
  });
});

describe('height conversion', () => {
  it('converts centimetres to inches and back', () => {
    expect(cmToIn(180)).toBeCloseTo(70.87, 1);
    expect(inToCm(70.87)).toBeCloseTo(180, 0);
  });

  it('formats for display in the requested unit', () => {
    expect(heightInUnit(180, 'cm')).toBe(180);
    expect(heightInUnit(180, 'in')).toBeCloseTo(70.9, 1);
  });
});
