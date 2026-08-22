/**
 * The web build serves no ads, so there is no ad consent to revisit. This
 * shadows the native file for the same reason AdBanner.web.tsx does — Metro
 * would otherwise statically bundle react-native-google-mobile-ads, which
 * imports React Native internals that do not exist on web.
 */
export function AdPrivacyOptionsRow() {
  return null;
}
