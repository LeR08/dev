import { Platform } from 'react-native';

/**
 * Google Play Billing — the supporter subscription.
 *
 * This is the only compliant way to sell the ad-free unlock: Play's Payments
 * policy requires Play Billing for digital content unlocked inside an app, and
 * hiding the launch message and the banner is exactly that. Donations unlock
 * nothing, so those stay on PayPal (see src/payments/paypal.ts).
 *
 * The product id below has to match the subscription created in Play Console
 * exactly, and Play never lets a product id be reused once created — so this
 * string is effectively permanent.
 *
 * Sequencing worth knowing: Play only offers subscription creation once an
 * uploaded build declares the billing permission, which arrives with this
 * dependency. So the code ships first, the product is created second, and
 * neither needs the other to exist at build time.
 */

/** Must match the Play Console subscription id, character for character. */
export const SUPPORTER_PRODUCT_ID = 'tya_supporter_monthly';

/**
 * Billing exists on Android only here. iOS would need its own StoreKit
 * products, and the web build has no store at all — both simply hide the
 * purchase UI rather than offering a button that cannot work.
 */
export function isBillingAvailable(): boolean {
  return Platform.OS === 'android';
}
