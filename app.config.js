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
      // Only the seed for EAS's first build. eas.json sets
      // appVersionSource: "remote", so from then on EAS holds the counter and
      // raises it per build — autoIncrement cannot work the other way round
      // here, because it would have to write the new value back into this
      // file, and EAS cannot edit a dynamic .js config.
      versionCode: 1,
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
    owner: 'ler08',
  },
};
