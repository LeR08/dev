require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT) || 4242,
  appSuccessUrl: process.env.APP_SUCCESS_URL || 'https://example.com/subscription/success',
  appCancelUrl: process.env.APP_CANCEL_URL || 'https://example.com/subscription/cancel',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    priceId: process.env.STRIPE_PRICE_ID || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    apiBase: process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com',
    planId: process.env.PAYPAL_PLAN_ID || '',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
  },
};
