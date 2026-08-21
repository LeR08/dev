/**
 * PayPal links for the supporter subscription and for one-off donations.
 *
 * Both are plain hosted PayPal pages opened in the system browser — there is
 * no SDK, no card field inside the app, and no secret key anywhere in this
 * repo. The app never sees a payment detail.
 *
 * What that buys in simplicity it costs in verification: with no backend
 * receiving PayPal's webhooks, the app cannot *know* that a subscription is
 * live. `markSubscribed` below is therefore an honour-system unlock — the
 * person says they subscribed and the app believes them, on this device only.
 * Anyone willing to tap the button gets the same result as a subscriber. That
 * is a deliberate trade, not an oversight: the alternative is a server holding
 * PayPal credentials, which is a much larger thing to build, secure and
 * maintain than this app currently justifies.
 *
 * If that becomes unacceptable, the shape to move to is a Firebase Cloud
 * Function subscribed to PayPal's webhooks, writing the entitlement to the
 * user's Firestore document — at which point the client reads it like any
 * other synced field, and this module goes away.
 */

const SUBSCRIPTION_URL = process.env.EXPO_PUBLIC_PAYPAL_SUBSCRIBE_URL || '';
const DONATION_URL = process.env.EXPO_PUBLIC_PAYPAL_DONATE_URL || '';

/** False until the URLs are configured, so the UI can hide rather than fail. */
export function isSubscriptionConfigured(): boolean {
  return SUBSCRIPTION_URL.length > 0;
}

export function isDonationConfigured(): boolean {
  return DONATION_URL.length > 0;
}

export function subscriptionUrl(): string {
  return SUBSCRIPTION_URL;
}

export function donationUrl(): string {
  return DONATION_URL;
}
