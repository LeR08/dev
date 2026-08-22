import { TestIds } from 'react-native-google-mobile-ads';

/**
 * Which ad unit the banner asks for.
 *
 * The real unit id is injected per build profile (see eas.json), so
 * development and preview builds fall back to Google's own public test unit.
 * That fallback is not a convenience: AdMob suspends accounts over impressions
 * and clicks a publisher generates on their own app, and a test unit cannot
 * generate either.
 *
 * Production builds carry the real id — including the ones sent to internal
 * testing, since those come off the same profile. The banner on those is a
 * live ad slot; tapping it is the thing that gets an account closed.
 */
export function bannerAdUnitId(): string {
  return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID || TestIds.BANNER;
}
