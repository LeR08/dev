/**
 * The PayPal donation link.
 *
 * Donations only. A subscription used to live here too, and it was removed
 * rather than left switched off: Google Play's Payments policy requires Play
 * Billing for digital content unlocked inside an app, and hiding the launch
 * message and banner is exactly that. A donation that unlocks nothing is
 * outside the policy, which is why this half stays.
 *
 * Removing the banner is moving to Play Billing — see PUBLISHING.md. Until
 * that is wired, nothing in the app flips `subscription.status`.
 *
 * The link is a hosted PayPal page opened in the system browser: no SDK, no
 * card field in the app, no secret in this repo.
 */

const DONATION_URL = process.env.EXPO_PUBLIC_PAYPAL_DONATE_URL || '';

/** False until the URL is configured, so the UI can hide rather than fail. */
export function isDonationConfigured(): boolean {
  return DONATION_URL.length > 0;
}

export function donationUrl(): string {
  return DONATION_URL;
}
