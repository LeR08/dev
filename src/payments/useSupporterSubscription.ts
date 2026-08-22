import { useCallback, useEffect, useState } from 'react';
import { useIAP } from 'react-native-iap';

import { isPremium } from '@/domain/subscription';
import { useApp } from '@/state/AppProvider';
import { SUPPORTER_PRODUCT_ID, isBillingAvailable } from './billing';

/**
 * Drives the supporter subscription and keeps `settings.subscription.status`
 * in step with what Play actually reports.
 *
 * Two things this deliberately does *not* do:
 *
 *  - It never trusts a purchase callback alone. Play is asked for the active
 *    subscriptions and the answer is what sets the entitlement, so a stale or
 *    replayed callback cannot grant access, and a cancellation elsewhere (the
 *    Play Store app, a refund) is picked up on the next refresh.
 *  - It has no server-side receipt verification. Anyone able to tamper with
 *    the device could fake the entitlement. For an unlock worth exactly one
 *    hidden banner that is an accepted trade; if it ever guards something that
 *    matters, the verification belongs on a backend, not here.
 *
 * Restore is not a separate user action: `getAvailablePurchases` runs on
 * connect, so an existing subscriber signing in on a new device is recognised
 * without tapping anything. Play requires a way to recover a subscription, and
 * doing it automatically is a better one than a button people never find.
 */
export type SupporterSubscription = {
  /** True once the store connection is up and the product has been fetched. */
  ready: boolean;
  /** Localised price string from Play, e.g. "5,00 €". Null until fetched. */
  priceLabel: string | null;
  /** A purchase or restore is in flight. */
  busy: boolean;
  premium: boolean;
  purchase: () => Promise<void>;
  /** Re-asks Play what is active; also runs automatically on connect. */
  refresh: () => Promise<void>;
};

export function useSupporterSubscription(onError: (message: string) => void): SupporterSubscription {
  const { settings, updateSettings } = useApp();
  const [busy, setBusy] = useState(false);
  const [fetched, setFetched] = useState(false);

  const {
    connected,
    subscriptions,
    activeSubscriptions,
    fetchProducts,
    requestPurchase,
    getAvailablePurchases,
    getActiveSubscriptions,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      // Android auto-refunds anything not finalised within three days, so this
      // has to happen even though the entitlement itself comes from Play's own
      // view of active subscriptions below.
      void finishTransaction({ purchase, isConsumable: false })
        .catch(() => {})
        .then(() => getActiveSubscriptions([SUPPORTER_PRODUCT_ID]))
        .catch(() => {})
        .finally(() => setBusy(false));
    },
    onPurchaseError: () => {
      setBusy(false);
      onError('');
    },
  });

  const premium = isPremium(settings.subscription.status);

  // Play is the authority. Mirror whatever it says into settings, in both
  // directions — granting on purchase and revoking after a cancellation.
  useEffect(() => {
    if (!isBillingAvailable() || !connected) return;
    const active = activeSubscriptions.some(
      (sub) => sub.productId === SUPPORTER_PRODUCT_ID && sub.isActive
    );
    if (active === premium) return;
    void updateSettings({
      subscription: active
        ? { status: 'active', activatedAt: Date.now() }
        : { status: 'free', activatedAt: null },
    });
  }, [activeSubscriptions, connected, premium, updateSettings]);

  useEffect(() => {
    if (!isBillingAvailable() || !connected || fetched) return;
    setFetched(true);
    void (async () => {
      try {
        await fetchProducts({ skus: [SUPPORTER_PRODUCT_ID], type: 'subs' });
        // Doubles as the restore path — see the note above.
        await getAvailablePurchases();
        await getActiveSubscriptions([SUPPORTER_PRODUCT_ID]);
      } catch {
        // Leaves `ready` false, so the screen shows the not-available state
        // rather than a button that cannot do anything.
      }
    })();
  }, [connected, fetched, fetchProducts, getAvailablePurchases, getActiveSubscriptions]);

  const product = subscriptions.find((sub) => sub.id === SUPPORTER_PRODUCT_ID);

  const purchase = useCallback(async () => {
    if (!product) return;
    onError('');
    setBusy(true);
    try {
      await requestPurchase({
        type: 'subs',
        request: { google: { skus: [SUPPORTER_PRODUCT_ID] } },
      });
      // Deliberately no success handling here: Play delivers the result
      // through onPurchaseSuccess/onPurchaseError, never this promise.
    } catch {
      setBusy(false);
      onError('');
    }
  }, [onError, product, requestPurchase]);

  const refresh = useCallback(async () => {
    if (!isBillingAvailable() || !connected) return;
    try {
      await getAvailablePurchases();
      await getActiveSubscriptions([SUPPORTER_PRODUCT_ID]);
    } catch {
      // Nothing to tell the user: the entitlement they already have is
      // unaffected by a failed refresh.
    }
  }, [connected, getAvailablePurchases, getActiveSubscriptions]);

  return {
    ready: isBillingAvailable() && connected && product !== undefined,
    priceLabel: product?.displayPrice ?? null,
    busy,
    premium,
    purchase,
    refresh,
  };
}
