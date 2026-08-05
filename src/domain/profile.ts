import { EMPTY_PROFILE, type Profile, type ReasonKey, type SpendPeriod } from './types';

/**
 * A profile mid-edit — every numeric field as an optional value rather than a
 * database-ready record, so onboarding can collect it across several steps
 * and Settings → Profile can collect it all on one screen from the same
 * pieces, without either one committing a half-filled Profile to storage.
 */
export type ProfileDraft = {
  sex: Profile['sex'];
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  spendBeforeTrackingPerDay: number | null;
  spendPeriod: SpendPeriod;
  reasons: ReasonKey[];
  otherReason: string | null;
};

export function emptyProfileDraft(): ProfileDraft {
  return {
    sex: EMPTY_PROFILE.sex,
    age: null,
    weightKg: null,
    heightCm: null,
    spendBeforeTrackingPerDay: null,
    spendPeriod: EMPTY_PROFILE.spendPeriod,
    reasons: [],
    otherReason: null,
  };
}

export function draftFromProfile(profile: Profile | null): ProfileDraft {
  if (!profile) return emptyProfileDraft();
  return {
    sex: profile.sex,
    age: profile.age,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    spendBeforeTrackingPerDay: profile.spendBeforeTrackingPerDay,
    spendPeriod: profile.spendPeriod,
    reasons: profile.reasons,
    otherReason: profile.otherReason,
  };
}

/** Turns a draft into a storable Profile, preserving createdAt across edits. */
export function buildProfile(draft: ProfileDraft, existing: Profile | null, now: number): Profile {
  return {
    sex: draft.sex,
    age: draft.age,
    weightKg: draft.weightKg,
    heightCm: draft.heightCm,
    spendBeforeTrackingPerDay: draft.spendBeforeTrackingPerDay,
    spendPeriod: draft.spendPeriod,
    reasons: draft.reasons,
    otherReason: draft.reasons.includes('other') ? draft.otherReason : null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function toggleReason(reasons: ReasonKey[], reason: ReasonKey): ReasonKey[] {
  return reasons.includes(reason) ? reasons.filter((item) => item !== reason) : [...reasons, reason];
}

const MIN_AGE = 13;
const MAX_AGE = 120;
export const LEGAL_DRINKING_AGE = 18;

export function isValidAge(age: number): boolean {
  return Number.isFinite(age) && age >= MIN_AGE && age <= MAX_AGE;
}
