import { detectCurrency, detectLanguage, detectResourceCountry } from '../detectLocale';

describe('detectLanguage', () => {
  it('matches the first supported device language', () => {
    expect(detectLanguage(['fr-FR', 'en-US'])).toBe('fr');
    expect(detectLanguage(['de-DE'])).toBe('de');
  });

  it('is case-insensitive and ignores region subtags', () => {
    expect(detectLanguage(['FR-fr'])).toBe('fr');
  });

  it('skips unsupported languages before finding a supported one', () => {
    expect(detectLanguage(['ja-JP', 'pt-BR'])).toBe('pt');
  });

  it('falls back to English when nothing matches', () => {
    expect(detectLanguage(['ja-JP', 'ko-KR'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
    expect(detectLanguage([null, undefined])).toBe('en');
  });
});

describe('detectResourceCountry', () => {
  it('maps a known region to its resource country', () => {
    expect(detectResourceCountry('FR')).toBe('FR');
    expect(detectResourceCountry('US')).toBe('US');
    expect(detectResourceCountry('gb')).toBe('GB');
    expect(detectResourceCountry('ES')).toBe('ES');
    expect(detectResourceCountry('DE')).toBe('DE');
    expect(detectResourceCountry('IT')).toBe('IT');
    expect(detectResourceCountry('PT')).toBe('PT');
    expect(detectResourceCountry('CN')).toBe('CN');
  });

  it('falls back to OTHER for an unmapped or missing region', () => {
    expect(detectResourceCountry('CA')).toBe('OTHER');
    expect(detectResourceCountry('SA')).toBe('OTHER');
    expect(detectResourceCountry('AE')).toBe('OTHER');
    expect(detectResourceCountry(null)).toBe('OTHER');
    expect(detectResourceCountry(undefined)).toBe('OTHER');
  });
});

describe('detectCurrency', () => {
  it('maps a known region to a currency offered in the picker', () => {
    expect(detectCurrency('FR')).toBe('EUR');
    expect(detectCurrency('US')).toBe('USD');
    expect(detectCurrency('gb')).toBe('GBP');
    expect(detectCurrency('CN')).toBe('CNY');
    expect(detectCurrency('SA')).toBe('SAR');
    expect(detectCurrency('AE')).toBe('AED');
  });

  it('falls back to EUR for an unmapped or missing region', () => {
    expect(detectCurrency('ZZ')).toBe('EUR');
    expect(detectCurrency(null)).toBe('EUR');
    expect(detectCurrency(undefined)).toBe('EUR');
  });
});
