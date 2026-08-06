/**
 * Client for the minimal backend in `server/` (see its README). The app
 * never talks to Stripe/PayPal directly — it only ever asks this backend for
 * a checkout/approval URL to open in a browser, then polls it for status.
 * Nothing here ever sees a secret key.
 */

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

export type BackendSubscriptionStatus = 'free' | 'pending' | 'active' | 'canceled';

export type BackendSubscription = {
  status: BackendSubscriptionStatus;
  provider: 'stripe' | 'paypal' | null;
  updatedAt: number | null;
};

export class BackendNotConfiguredError extends Error {
  constructor() {
    super('EXPO_PUBLIC_BACKEND_URL is not set. Copy .env.example to .env and point it at the server in server/.');
    this.name = 'BackendNotConfiguredError';
  }
}

function requireBackendUrl(): string {
  if (!BACKEND_URL) throw new BackendNotConfiguredError();
  return BACKEND_URL;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${requireBackendUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof (data as { error?: unknown }).error === 'string' ? (data as { error: string }).error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchSubscriptionStatus(userId: string): Promise<BackendSubscription> {
  const res = await fetch(`${requireBackendUrl()}/api/subscription/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export async function createStripeCheckoutUrl(userId: string): Promise<string> {
  const { url } = await postJson<{ url: string }>('/api/stripe/create-checkout-session', { userId });
  return url;
}

export async function createStripePortalUrl(userId: string): Promise<string> {
  const { url } = await postJson<{ url: string }>('/api/stripe/create-portal-session', { userId });
  return url;
}

export async function createPaypalApprovalUrl(userId: string): Promise<string> {
  const { approvalUrl } = await postJson<{ approvalUrl: string }>('/api/paypal/create-subscription', { userId });
  return approvalUrl;
}
