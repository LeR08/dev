/**
 * Pure premium-status helper. There is no payment flow in the app today —
 * Settings → Subscription only previews what the offer would look like — so
 * this currently always sees 'free'. It stays a named function rather than an
 * inline comparison so the one place that gates on premium (the launch
 * interstitial in app/_layout.tsx) reads by intent.
 */

import type { SubscriptionStatus } from './types';

/** Whether a status should unlock premium features. */
export function isPremium(status: SubscriptionStatus): boolean {
  return status === 'active';
}
