# Tally backend

A minimal Express server whose only job is to hold the Stripe/PayPal **secret**
keys and track each device's subscription status. Those keys can never live
in the app itself — anything shipped to a phone can be extracted, so a secret
key baked into the app is a secret key anyone can steal. This is the one
exception to the rest of the project being fully local/offline: payment
processors require a server in the loop.

It does not store any personal data, drink logs, or anything else from the
app — only a device-generated random `userId` (see `src/payments/` in the
app) mapped to a subscription status (`free` / `pending` / `active` /
`canceled`) and, for Stripe, its own customer id.

## Setup

```bash
cd server
npm install
cp .env.example .env
```

Fill in `.env` with your own **test-mode** keys to start:

- **Stripe**: [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
  for `STRIPE_SECRET_KEY`, then create a recurring Price under Product catalog
  for `STRIPE_PRICE_ID`.
- **PayPal**: [developer.paypal.com/dashboard](https://developer.paypal.com/dashboard/)
  → Sandbox app for `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`, then a Product +
  Plan under Products & Plans for `PAYPAL_PLAN_ID`.

Then run it:

```bash
npm start
```

The app (see repo root `.env.example`) needs `EXPO_PUBLIC_BACKEND_URL` pointed
at wherever this is running (`http://localhost:4242` while developing).

## Webhooks (required for status to update)

Checkout/approval alone does not flip a subscription to `active` — that only
happens when the processor's webhook confirms payment. Without webhooks
configured, the client will poll `GET /api/subscription/:userId` forever and
see `pending`/`free`.

- **Stripe**, for local dev: `stripe listen --forward-to localhost:4242/api/stripe/webhook`
  (prints a `whsec_...` for `STRIPE_WEBHOOK_SECRET`). In production, add the
  endpoint under Dashboard → Developers → Webhooks, subscribed to
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`.
- **PayPal**: Dashboard → Webhooks → add `https://<your-host>/api/paypal/webhook`,
  subscribed to `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`,
  `BILLING.SUBSCRIPTION.EXPIRED`, `BILLING.SUBSCRIPTION.SUSPENDED`. Copy the
  webhook's ID into `PAYPAL_WEBHOOK_ID` — it's used to verify that a call
  claiming to be PayPal actually is.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness check |
| POST | `/api/stripe/create-checkout-session` | `{ userId }` → `{ url }` to open in a browser |
| POST | `/api/stripe/create-portal-session` | `{ userId }` → `{ url }` to manage/cancel billing |
| POST | `/api/stripe/webhook` | Stripe calls this |
| POST | `/api/paypal/create-subscription` | `{ userId }` → `{ approvalUrl }` to open in a browser |
| POST | `/api/paypal/webhook` | PayPal calls this |
| GET | `/api/subscription/:userId` | `{ status, provider, updatedAt }` |

## Deploying

Any small Node host works (Render, Railway, Fly.io, a small VPS). Set the
same env vars there, point Stripe/PayPal's webhook URLs and the app's
`EXPO_PUBLIC_BACKEND_URL` at the deployed URL, and switch the Stripe/PayPal
keys from test to live mode when you're ready to charge real money.

## Honest limitations

This is deliberately minimal, not production-hardened:

- **Storage** is a single JSON file (`data/subscriptions.json`, git-ignored).
  Fine for one small deployment; move to a real database before this needs to
  survive concurrent server instances.
- **No authentication** beyond the client-generated `userId` itself — anyone
  who knows a user's id could ask for their status. It's a random,
  unguessable local id, not a password, but treat this as a starting point
  to harden (e.g. sign requests, add rate limiting) before a large-scale launch.
- **No refund/dispute/tax handling** — that's a business/legal setup step in
  the Stripe/PayPal dashboards themselves, not something code can decide for
  you.
