const config = require('./config');
const store = require('./store');

function requireConfigured() {
  if (!config.paypal.clientId || !config.paypal.clientSecret || !config.paypal.planId) {
    const err = new Error(
      'PayPal is not configured on this server (PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET/PAYPAL_PLAN_ID missing).'
    );
    err.status = 503;
    throw err;
  }
}

async function getAccessToken() {
  const res = await fetch(`${config.paypal.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.paypal.clientId}:${config.paypal.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function createSubscription(userId) {
  requireConfigured();
  const token = await getAccessToken();
  const res = await fetch(`${config.paypal.apiBase}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan_id: config.paypal.planId,
      custom_id: userId,
      application_context: {
        return_url: config.appSuccessUrl,
        cancel_url: config.appCancelUrl,
        user_action: 'SUBSCRIBE_NOW',
      },
    }),
  });
  if (!res.ok) throw new Error(`PayPal subscription creation failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  await store.setSubscription(userId, {
    status: 'pending',
    provider: 'paypal',
    paypalSubscriptionId: data.id,
  });
  const approvalUrl = (data.links || []).find((link) => link.rel === 'approve')?.href;
  return { subscriptionId: data.id, approvalUrl };
}

async function verifyWebhookSignature(headers, body) {
  requireConfigured();
  if (!config.paypal.webhookId) return false;
  const token = await getAccessToken();
  const res = await fetch(`${config.paypal.apiBase}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: config.paypal.webhookId,
      webhook_event: body,
    }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}

async function handleWebhookEvent(event) {
  const resource = event.resource || {};
  const userId = resource.custom_id || null;
  switch (event.event_type) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
      if (userId) await store.setSubscription(userId, { status: 'active', provider: 'paypal' });
      break;
    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.EXPIRED':
    case 'BILLING.SUBSCRIPTION.SUSPENDED':
      if (userId) await store.setSubscription(userId, { status: 'canceled', provider: 'paypal' });
      break;
    default:
      break;
  }
}

module.exports = { createSubscription, verifyWebhookSignature, handleWebhookEvent };
