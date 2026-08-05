import {
  currencySymbol,
  formatAbv,
  formatChange,
  formatComparison,
  formatIntake,
  formatMoney,
  formatRelativeDay,
  formatVolume,
  pluralize,
  trimNumber,
  volumeInUnit,
} from '../format';
import { at } from './factories';

describe('trimNumber', () => {
  it('drops trailing zeros but keeps meaningful decimals', () => {
    expect(trimNumber(2)).toBe('2');
    expect(trimNumber(2.5)).toBe('2.5');
    expect(trimNumber(2.04, 1)).toBe('2');
  });
});

describe('formatVolume', () => {
  it('renders in the chosen unit', () => {
    expect(formatVolume(250, 'cl')).toBe('25 cl');
    expect(formatVolume(250, 'ml')).toBe('250 ml');
    expect(formatVolume(125, 'cl')).toBe('12.5 cl');
  });

  it('round-trips a volume through the unit used for input', () => {
    expect(volumeInUnit(125, 'cl')).toBe(12.5);
    expect(volumeInUnit(125, 'ml')).toBe(125);
  });
});

describe('formatIntake', () => {
  it('uses singular wording for exactly one drink', () => {
    expect(formatIntake(1, 'standardDrinks')).toBe('1 drink');
    expect(formatIntake(2.5, 'standardDrinks')).toBe('2.5 drinks');
  });

  it('shows grams without decimals', () => {
    expect(formatIntake(19.7, 'grams')).toBe('20 g');
  });

  it('does not report a real but tiny amount as zero', () => {
    expect(formatIntake(0.02, 'standardDrinks')).toBe('<0.1 drinks');
    expect(formatIntake(0.3, 'grams')).toBe('<1 g');
    expect(formatIntake(0, 'standardDrinks')).toBe('0 drinks');
    expect(formatIntake(0, 'grams')).toBe('0 g');
  });
});

describe('formatAbv', () => {
  it('appends a percent sign', () => {
    expect(formatAbv(5)).toBe('5%');
    expect(formatAbv(12.5)).toBe('12.5%');
  });
});

describe('formatChange', () => {
  it('signs the percentage and names the no-change case', () => {
    expect(formatChange(0.12)).toBe('+12%');
    expect(formatChange(-0.08)).toBe('−8%');
    expect(formatChange(0)).toBe('about the same');
    expect(formatChange(null)).toBe('—');
  });
});

describe('formatComparison', () => {
  it('avoids a percentage when the previous window was empty', () => {
    expect(formatComparison({ current: 3, previous: 0, change: null }, 'previous 7 days')).toBe(
      'Nothing logged in the previous 7 days'
    );
    expect(formatComparison({ current: 0, previous: 0, change: null }, 'previous 7 days')).toBe(
      'Nothing in the previous 7 days either'
    );
  });

  it('reports the percentage when there is something to compare against', () => {
    expect(formatComparison({ current: 12, previous: 10, change: 0.2 }, 'previous week')).toBe(
      '+20% vs previous week'
    );
  });
});

describe('formatRelativeDay', () => {
  const now = at(2026, 4, 10, 15);

  it('names today and yesterday', () => {
    expect(formatRelativeDay(at(2026, 4, 10, 9), now)).toBe('Today');
    expect(formatRelativeDay(at(2026, 4, 9, 23), now)).toBe('Yesterday');
  });

  it('falls back to a date further back', () => {
    expect(formatRelativeDay(at(2026, 4, 1), now)).not.toBe('Today');
  });
});

describe('money', () => {
  it('knows the symbol for supported currencies', () => {
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('XYZ')).toBe('XYZ');
  });

  it('formats an amount without throwing', () => {
    expect(formatMoney(12.5, 'EUR')).toContain('12');
  });
});

describe('pluralize', () => {
  it('picks the singular only for one', () => {
    expect(pluralize(1, 'day')).toBe('day');
    expect(pluralize(0, 'day')).toBe('days');
    expect(pluralize(2, 'entry', 'entries')).toBe('entries');
  });
});
