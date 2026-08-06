import { generateAffiliateCode, isPlausibleAffiliateCode } from '../subscription';

describe('generateAffiliateCode', () => {
  it('produces a TALLY-XXXXXX code from an injected RNG', () => {
    let calls = 0;
    const code = generateAffiliateCode(() => {
      calls += 1;
      return 0;
    });
    expect(code).toBe('TALLY-AAAAAA');
    expect(calls).toBe(6);
  });

  it('never includes visually ambiguous characters in the random suffix', () => {
    const code = generateAffiliateCode(() => 0.999999);
    const suffix = code.replace('TALLY-', '');
    expect(suffix).not.toMatch(/[0O1IL]/);
  });
});

describe('isPlausibleAffiliateCode', () => {
  it('accepts a well-formed code, case- and whitespace-insensitively', () => {
    expect(isPlausibleAffiliateCode('TALLY-AB23CD')).toBe(true);
    expect(isPlausibleAffiliateCode('  tally-ab23cd  ')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isPlausibleAffiliateCode('not a code')).toBe(false);
    expect(isPlausibleAffiliateCode('TALLY-AB2')).toBe(false);
    expect(isPlausibleAffiliateCode('')).toBe(false);
  });
});
