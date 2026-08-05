import { makeProfile } from './factories';
import {
  buildProfile,
  draftFromProfile,
  emptyProfileDraft,
  isValidAge,
  isValidEmail,
  toggleReason,
} from '../profile';

describe('emptyProfileDraft', () => {
  it('starts with every field unset', () => {
    const draft = emptyProfileDraft();
    expect(draft.name).toBeNull();
    expect(draft.email).toBeNull();
    expect(draft.sex).toBe('unspecified');
    expect(draft.age).toBeNull();
    expect(draft.weightKg).toBeNull();
    expect(draft.reasons).toEqual([]);
  });
});

describe('draftFromProfile', () => {
  it('copies every field from an existing profile', () => {
    const profile = makeProfile({ age: 41, reasons: ['medical', 'other'], otherReason: 'x' });
    expect(draftFromProfile(profile)).toEqual({
      name: profile.name,
      email: profile.email,
      sex: profile.sex,
      age: 41,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      spendBeforeTrackingPerDay: profile.spendBeforeTrackingPerDay,
      spendPeriod: profile.spendPeriod,
      reasons: ['medical', 'other'],
      otherReason: 'x',
    });
  });

  it('falls back to an empty draft when there is no profile yet', () => {
    expect(draftFromProfile(null)).toEqual(emptyProfileDraft());
  });
});

describe('buildProfile', () => {
  it('preserves createdAt across an edit of an existing profile', () => {
    const existing = makeProfile({ createdAt: 100, updatedAt: 100 });
    const next = buildProfile(draftFromProfile(existing), existing, 500);
    expect(next.createdAt).toBe(100);
    expect(next.updatedAt).toBe(500);
  });

  it('stamps both timestamps as now for a brand new profile', () => {
    const next = buildProfile(emptyProfileDraft(), null, 500);
    expect(next.createdAt).toBe(500);
    expect(next.updatedAt).toBe(500);
  });

  it('clears the free-text "other" reason when Other is not selected', () => {
    const draft = { ...emptyProfileDraft(), reasons: ['curiosity'] as const, otherReason: 'stray text' };
    const next = buildProfile({ ...draft, reasons: [...draft.reasons] }, null, 0);
    expect(next.otherReason).toBeNull();
  });

  it('keeps the free-text "other" reason when Other is selected', () => {
    const draft = { ...emptyProfileDraft(), reasons: ['other' as const], otherReason: 'my reason' };
    const next = buildProfile(draft, null, 0);
    expect(next.otherReason).toBe('my reason');
  });
});

describe('toggleReason', () => {
  it('adds a reason that is not yet selected', () => {
    expect(toggleReason([], 'sevrage')).toEqual(['sevrage']);
  });

  it('removes a reason that is already selected', () => {
    expect(toggleReason(['sevrage', 'medical'], 'sevrage')).toEqual(['medical']);
  });
});

describe('isValidAge', () => {
  it('accepts the documented 13–120 range', () => {
    expect(isValidAge(13)).toBe(true);
    expect(isValidAge(120)).toBe(true);
    expect(isValidAge(45)).toBe(true);
  });

  it('rejects out-of-range or non-finite values', () => {
    expect(isValidAge(12)).toBe(false);
    expect(isValidAge(121)).toBe(false);
    expect(isValidAge(Number.NaN)).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('accepts a plausible address', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail('  a@b.com  ')).toBe(true);
  });

  it('rejects anything without an @ and a domain', () => {
    expect(isValidEmail('not an email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});
