const Stripe = require('stripe');
const config = require('./config');
const store = require('./store');

const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;

function requireStripe() {
  if (!stripe) {
    const err = new Error('Stripe is not configured on this server (STRIPE_SECRET_KEY missing).');
    err.status = 503;
    throw err;
  }
  return stripe;
}

async function createCheckoutSession(userId) {
  const client = requireStripe();
  if (!config.stripe.priceId) {
    const err = new Error('STRIPE_PRICE_ID is not configured.');
    err.status = 503;
    throw err;
  }
  const session = await client.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: config.stripe.priceId, quantity: 1 }],
    success_url: config.appSuccessUrl,
    cancel_url: config.appCancelUrl,
    client_reference_id: userId,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
  });
  return session.url;
}

async function createPortalSession(userId) {
  const client = requireStripe();
  const sub = store.getSubscription(userId);
  if (!sub.stripeCustomerId) {
    const err = new Error('No Stripe customer on file for this user yet.');
    err.status = 404;
    throw err;
  }
  const portal = await client.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: config.appSuccessUrl,
  });
  return portal.url;
}

function constructWebhookEvent(rawBody, signature) {
  const client = requireStripe();
  return client.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}

async function handleWebhookEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.userId;
      if (userId) {
        await store.setSubscription(userId, { status: 'active', provider: 'stripe' });
        if (session.customer) await store.setStripeCustomer(userId, session.customer);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const userId =
        subscription.metadata?.userId || store.findUserIdByStripeCustomer(subscription.customer);
      if (userId) {
        const active = subscription.status === 'active' || subscription.status === 'trialing';
        await store.setSubscription(userId, {
          status: active ? 'active' : 'canceled',
          provider: 'stripe',
        });
      }
      break;
    }
    default:
      break;
  }
}

module.exports = {
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  handleWebhookEvent,
};
