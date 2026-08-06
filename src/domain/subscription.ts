/**
 * Local subscription-status helpers. The actual payment flow (talking to the
 * backend, opening Stripe/PayPal in a browser) lives in `src/payments` — this
 * module only holds pure, testable logic.
 */

import type { SubscriptionStatus } from './types';

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ID_LENGTH = 24;

/**
 * A fresh, random id for this device — not tied to any identity (no name,
 * email, or account). Sent to the backend only so it can look up this
 * device's subscription status. Injectable RNG for tests.
 */
export function generateUserId(random: () => number = Math.random): string {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    id += ID_ALPHABET[Math.floor(random() * ID_ALPHABET.length)];
  }
  return id;
}

/** Whether a status should unlock premium features. */
export function isPremium(status: SubscriptionStatus): boolean {
  return status === 'active';
}
