const express = require('express');
const cors = require('cors');
const config = require('./config');
const store = require('./store');
const stripeService = require('./stripe');
const paypalService = require('./paypal');

const app = express();
app.use(cors());

// Stripe needs the raw, unparsed body to verify a webhook's signature, so
// this route is wired before the global JSON body parser below.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = stripeService.constructWebhookEvent(req.body, req.headers['stripe-signature']);
  } catch (err) {
    res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    return;
  }
  try {
    await stripeService.handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const url = await stripeService.createCheckoutSession(userId);
    res.json({ url });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/stripe/create-portal-session', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const url = await stripeService.createPortalSession(userId);
    res.json({ url });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/paypal/create-subscription', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const result = await paypalService.createSubscription(userId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/paypal/webhook', async (req, res) => {
  try {
    const verified = await paypalService.verifyWebhookSignature(req.headers, req.body);
    if (!verified) return res.status(400).json({ error: 'Invalid PayPal webhook signature' });
    await paypalService.handleWebhookEvent(req.body);
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/subscription/:userId', (req, res) => {
  res.json(store.getSubscription(req.params.userId));
});

app.listen(config.port, () => {
  console.log(`Tally backend listening on port ${config.port}`);
});

module.exports = app;
