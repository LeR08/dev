import React from 'react';

/**
 * AdMob (react-native-google-mobile-ads) is temporarily removed from the
 * native build: play-services-ads 25.4.0's Kotlin metadata (2.3.0) is newer
 * than what this project's Gradle/Kotlin toolchain compiles against (2.1.x),
 * which fails `:react-native-google-mobile-ads:compileReleaseKotlin` on EAS
 * Build. Re-add the dependency + app.json plugin once that's resolved (e.g.
 * after bumping the project's Kotlin version to match). Until then this
 * mirrors AdBanner.web.tsx and renders nothing — free-tier users simply see
 * no banner rather than a broken build.
 */
export function AdBanner() {
  return null;
}
