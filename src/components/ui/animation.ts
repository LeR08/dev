import { Platform } from 'react-native';

/**
 * Whether Animated should hand work to the native driver.
 *
 * Always true on device. False in the browser, where there is no native
 * animated module — asking for it there only produces a warning on every
 * animation and falls back to JS anyway.
 */
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';
