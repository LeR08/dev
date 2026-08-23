const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro's default "package exports" resolution picks Firebase's browser
// bundle even on native (Android/iOS), which crashes at launch — Firebase
// v9+ modular SDK ships a "react-native" condition that only gets used if
// this is off. See https://github.com/firebase/firebase-js-sdk/issues/8656
// and Expo/RN's own guidance for using Firebase JS SDK in native builds.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
