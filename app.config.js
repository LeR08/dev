/**
 * Dynamic config so one codebase can build two distinct, side-by-side
 * installable apps — Tally (the original) and TYA (a second identity on
 * the same Firebase project/accounts) — selected by APP_VARIANT at build
 * time (see eas.json's per-profile "env", or set it locally before
 * `expo start`/`expo export`). Everything native-identity-specific (name,
 * package/bundle id, icons, the OAuth redirect scheme) branches here;
 * the app's own code never needs to know which variant it's running as.
 */

const VARIANTS = {
  tally: {
    name: 'Tally',
    slug: 'tally',
    scheme: 'tally',
    androidPackage: 'com.tally.tracker',
    iosBundleId: 'com.tally.tracker',
    assetsDir: './assets',
    adaptiveIconBackground: '#E9E4DC',
    // Each variant is its own EAS project (own build credentials/keystore,
    // own push/submit config) even though they share this one codebase —
    // `eas build` prints this id the first time it creates a project for a
    // dynamic config, since it can't write it back into app.config.js itself.
    easProjectId: '9a26edad-e401-4e37-936d-4327370f3f99',
  },
  tya: {
    name: 'TYA',
    slug: 'tya',
    scheme: 'tya',
    androidPackage: 'com.tya.tracker',
    iosBundleId: 'com.tya.tracker',
    assetsDir: './assets-tya',
    // Matches the green gradient the TYA icon itself starts from, so the
    // adaptive-icon mask never shows a mismatched background sliver.
    adaptiveIconBackground: '#EDEFFA',
    easProjectId: '9b767876-5eec-4875-b368-b1d4b5d6bfe4',
  },
};

const variantKey = process.env.APP_VARIANT === 'tya' ? 'tya' : 'tally';
const v = VARIANTS[variantKey];

module.exports = {
  expo: {
    name: v.name,
    slug: v.slug,
    version: '1.4.0',
    scheme: v.scheme,
    orientation: 'portrait',
    icon: `${v.assetsDir}/icon.png`,
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    ios: {
      supportsTablet: true,
      bundleIdentifier: v.iosBundleId,
    },
    android: {
      package: v.androidPackage,
      adaptiveIcon: {
        backgroundColor: v.adaptiveIconBackground,
        foregroundImage: `${v.assetsDir}/android-icon-foreground.png`,
        backgroundImage: `${v.assetsDir}/android-icon-background.png`,
        monochromeImage: `${v.assetsDir}/android-icon-monochrome.png`,
      },
      predictiveBackGestureEnabled: false,
      edgeToEdgeEnabled: true,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: false,
          // Matches expo-auth-session's default Google redirect
          // (`${applicationId}:/oauthredirect`) — see the metro.config.js
          // / app.json history for why this has to equal the package name.
          data: [{ scheme: v.androidPackage }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: `${v.assetsDir}/favicon.png`,
      bundler: 'metro',
      output: 'static',
      name: v.name,
      shortName: v.name,
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
          image: `${v.assetsDir}/splash-icon.png`,
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
        projectId: v.easProjectId,
      },
    },
    owner: 'ler08',
  },
};
