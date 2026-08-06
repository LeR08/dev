import { Platform } from 'react-native';

/**
 * Google's own public TEST ad unit ids — safe and functional, meant exactly
 * for development before a real AdMob account/app exists:
 * https://developers.google.com/admob/android/test-ads
 * https://developers.google.com/admob/ios/test-ads
 * Replace with real ad unit ids from your own AdMob account before release
 * (see app.json's androidAppId/iosAppId too — those are the matching test
 * app-level ids and need swapping at the same time).
 */
export const TEST_BANNER_AD_UNIT_ID: string =
  Platform.select({
    ios: 'ca-app-pub-3940256099942544/2934735716',
    android: 'ca-app-pub-3940256099942544/6300978111',
    default: '',
  }) ?? '';
