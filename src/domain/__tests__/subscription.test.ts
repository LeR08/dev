import { generateUserId, isPremium } from '../subscription';

describe('generateUserId', () => {
  it('produces a 24-char id from an injected RNG', () => {
    let calls = 0;
    const id = generateUserId(() => {
      calls += 1;
      return 0;
    });
    expect(id).toBe('a'.repeat(24));
    expect(calls).toBe(24);
  });

  it('draws from the full alphabet with a different RNG', () => {
    const id = generateUserId(() => 0.999999);
    expect(id).toBe('9'.repeat(24));
  });
});

describe('isPremium', () => {
  it('is true only for an active subscription', () => {
    expect(isPremium('active')).toBe(true);
    expect(isPremium('free')).toBe(false);
    expect(isPremium('pending')).toBe(false);
    expect(isPremium('canceled')).toBe(false);
  });
});
