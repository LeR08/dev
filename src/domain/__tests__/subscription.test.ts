import { isPremium } from '../subscription';

describe('isPremium', () => {
  it('is true only for an active subscription', () => {
    expect(isPremium('active')).toBe(true);
    expect(isPremium('free')).toBe(false);
  });
});
