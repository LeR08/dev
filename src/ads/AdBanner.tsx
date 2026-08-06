import React from 'react';
import { Platform, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TEST_BANNER_AD_UNIT_ID } from './testAdUnitIds';

/**
 * This file only ever gets bundled for iOS/Android — Metro resolves
 * AdBanner.web.tsx for web instead (see that file for why: Metro statically
 * resolves every require/import string it finds in a file's source at
 * bundle time, regardless of which runtime branch it's in, so a
 * Platform.OS check alone can't keep the native ads module out of a web
 * bundle — only routing web to a different file can). The Platform.OS
 * check below is kept anyway as harmless defense-in-depth for native: it
 * still correctly skips the require on any hypothetical non-native
 * platform that resolves this file instead of AdBanner.web.tsx.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let googleMobileAds: any = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    googleMobileAds = require('react-native-google-mobile-ads');
  } catch {
    googleMobileAds = null;
  }
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
