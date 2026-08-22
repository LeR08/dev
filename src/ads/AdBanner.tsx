import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import mobileAds, { AdsConsent, BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { bannerAdUnitId } from './adUnitIds';

/**
 * The only ad surface in the app: one banner, on the supporter screen.
 *
 * Nothing here runs before this component mounts, which means a user who never
 * opens Settings → Supporter never initialises the ads SDK at all. Neither
 * does a supporter: the free-tier card that holds this banner is not rendered
 * once the subscription is active.
 *
 * Consent comes first, always. `gatherConsent` runs Google's UMP flow — it
 * shows the consent form where one is required (the EEA and the UK, which is
 * most of this app's audience) and resolves silently where it is not. Asking
 * for an ad before that answer would breach both the GDPR and Google's own EU
 * user consent policy, so there is no banner until UMP says ads may be
 * requested.
 *
 * Every failure path ends the same way: no banner. A screen about supporting
 * the app is the last place to explain an advertising error to someone.
 */
export function AdBanner() {
  const [canShow, setCanShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const consent = await AdsConsent.gatherConsent();
        if (!consent.canRequestAds) return;
        await mobileAds().initialize();
        if (!cancelled) setCanShow(true);
      } catch {
        // Leaves the banner hidden.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!canShow) return null;

  return (
    <View style={{ alignItems: 'center' }}>
      <BannerAd
        unitId={bannerAdUnitId()}
        size={BannerAdSize.BANNER}
        // A no-fill is routine — Google simply has nothing to serve this
        // request. Take the banner back out rather than leaving a gap.
        onAdFailedToLoad={() => setCanShow(false)}
      />
    </View>
  );
}
