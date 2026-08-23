import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** App version and platform, auto-captured on a ticket (spec v1.2 §9.1). */
export function useAppInfo(): { appVersion: string; platform: string } {
  return {
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    platform: Platform.OS,
  };
}
