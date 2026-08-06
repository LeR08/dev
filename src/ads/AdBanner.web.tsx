/**
 * Metro picks this file over AdBanner.tsx when bundling for web (the
 * `.web.tsx` platform-extension convention), so the web bundle never even
 * resolves `react-native-google-mobile-ads` — that package imports
 * React Native internals (codegenNativeComponent) that don't exist on web,
 * and a runtime Platform.OS check alone doesn't stop Metro from statically
 * bundling the `require()` call. AdMob is a native-only concept anyway.
 */
export function AdBanner() {
  return null;
}
