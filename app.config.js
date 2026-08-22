/**
 * TYA's Expo configuration.
 *
 * This was a dynamic two-variant config (Tally + TYA selected by APP_VARIANT)
 * while the original build was still being maintained. It is not any more —
 * TYA is the app. Any Tally install already on a device keeps working and
 * keeps its data; it simply is not built from here.
 */

const ASSETS = './assets-tya';

module.exports = {
  expo: {
    name: 'TYA',
    slug: 'tya',
    version: '1.0.0',
    scheme: 'tya',
    orientation: 'portrait',
    icon: `${ASSETS}/icon.png`,
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.tya.tracker',
    },
    android: {
      package: 'com.tya.tracker',
      // No versionCode here on purpose: eas.json sets appVersionSource to
      // "remote", so EAS owns the counter and raises it per production build.
      // A value in this file would be ignored while still reading as though it
      // were authoritative. (Remote is also the only mode that works with a
      // dynamic config — "local" would need EAS to write the new value back
      // into this .js file, which it cannot do.)
      adaptiveIcon: {
        // Matches the illustration's own background, so the adaptive-icon mask
        // never shows a mismatched sliver behind the mark.
        backgroundColor: '#FFFFFF',
        foregroundImage: `${ASSETS}/android-icon-foreground.png`,
        backgroundImage: `${ASSETS}/android-icon-background.png`,
        monochromeImage: `${ASSETS}/android-icon-monochrome.png`,
      },
      predictiveBackGestureEnabled: false,
      edgeToEdgeEnabled: true,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: false,
          // Matches expo-auth-session's default Google redirect
          // (`${applicationId}:/oauthredirect`) — this has to equal the
          // package name above or the sign-in round trip never comes back.
          data: [{ scheme: 'com.tya.tracker' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: `${ASSETS}/favicon.png`,
      bundler: 'metro',
      output: 'static',
      name: 'TYA',
      shortName: 'TYA',
      themeColor: '#F7F5F2',
      backgroundColor: '#F7F5F2',
      display: 'standalone',
      startUrl: '/',
      orientation: 'portrait',
    },
    plugins: [
      'expo-router',
      'expo-sqlite',
      'expo-sharing',
      [
        'expo-image-picker',
        {
          photosPermission:
            'Used only if you attach a screenshot to a bug report or suggestion. Nothing is uploaded — it stays on this device.',
          // The only call this app makes is launchImageLibraryAsync
          // (app/settings/report.tsx) — the picker never opens the camera and
          // never records anything. Left at its default, this plugin adds
          // RECORD_AUDIO to the manifest anyway, which would put a microphone
          // permission on an app that cannot record: a sensitive-permission
          // review at Play, and a bad-faith signal in an app that asks people
          // to log something private. `false` both skips the permission and
          // blocks it, so no other dependency can put it back.
          cameraPermission: false,
          microphonePermission: false,
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#F7F5F2',
          dark: {
            backgroundColor: '#14120F',
          },
          image: `${ASSETS}/splash-icon.png`,
          imageWidth: 180,
        },
      ],
      'expo-localization',
      'expo-web-browser',
      // Google's native sign-in SDK. It replaced an expo-auth-session browser
      // flow that Google's own policy changes broke; see
      // src/components/GoogleSignInButton.tsx for the full account. Being
      // native, adding it means the next build has to be a real one — this
      // cannot be picked up by a JS reload.
      '@react-native-google-signin/google-signin',
      // AdMob. The app id below is public by design — it ships inside the
      // APK's manifest and identifies the publisher, not an account secret.
      //
      // There is deliberately no iosAppId, and `expo config` warns that the
      // native SDK crashes on iOS without one. That is accurate and currently
      // harmless: this app ships to Play only, and no iOS build is produced.
      // Anyone adding one has to create an iOS app in AdMob first and put its
      // id here, or the crash is real.
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: 'ca-app-pub-2344459617810838~7959046290',
        },
      ],
      // Raises Kotlin from Expo's default 2.0.21. play-services-ads 25.4.0
      // ships Kotlin metadata at 2.3.0, and a 2.0/2.1 compiler refuses to read
      // metadata newer than itself — which is exactly how
      // :react-native-google-mobile-ads:compileReleaseKotlin failed the last
      // time AdMob was in this project. Expo supports 2.3.0+ explicitly
      // (expo-modules-autolinking maps it to the latest KSP), so this is the
      // sanctioned fix rather than pinning an older ads SDK.
      [
        'expo-build-properties',
        {
          android: {
            // Kept at 2.3.0 because the failed build proved it works for every
            // other module — reanimated, worklets, google-signin and nitro all
            // compiled under it. It does NOT reach the AdMob module, which is
            // what './plugins/withAdMobKotlinMetadata' is for.
            kotlinVersion: '2.3.0',
          },
        },
      ],
      './plugins/withAdMobKotlinMetadata',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        // `eas build` prints this the first time it creates a project for a
        // dynamic config, since it cannot write it back into a .js file.
        projectId: '9b767876-5eec-4875-b368-b1d4b5d6bfe4',
      },
    },
    // The organisation, not the personal account. The project lives under
    // `ler08s-team` since the app is published by LaSolutionDigital, and the
    // owner here has to match or `eas` cannot find the project at all.
    owner: 'ler08s-team',
  },
};
