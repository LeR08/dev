import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TEST_BANNER_AD_UNIT_ID } from './testAdUnitIds';

/**
 * This file only ever gets bundled for iOS/Android — Metro resolves
 * AdBanner.web.tsx for web instead (see that file for why: the native ads
 * module can't even be parsed on web). It still needs a build that actually
 * links the native module (a dev client or a real build — not plain Expo
 * Go), so the require is lazy and defensive: if it isn't there, the banner
 * quietly renders nothing instead of crashing the app.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let googleMobileAds: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  googleMobileAds = require('react-native-google-mobile-ads');
} catch {
  googleMobileAds = null;
}

/**
 * A small AdMob banner using Google's official TEST ad unit id (see
 * testAdUnitIds.ts) — swap for a real ad unit id once there's a real AdMob
 * account (see README's "Freemium, payments & ads" section). Shown only to
 * free-tier users; premium subscribers never see it.
 */
export function AdBanner() {
  const theme = useTheme();
  if (!googleMobileAds || !TEST_BANNER_AD_UNIT_ID) return null;

  const { BannerAd, BannerAdSize } = googleMobileAds;
  return (
    <View style={{ alignItems: 'center', marginTop: theme.spacing(2) }}>
      <BannerAd unitId={TEST_BANNER_AD_UNIT_ID} size={BannerAdSize.BANNER} />
    </View>
  );
}
