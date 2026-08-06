const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'subscriptions.json');

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeAll(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Minimal file-backed store — one JSON file, keyed by the app's opaque local
 * userId. Adequate for a single small deployment; swap for a real database
 * before this needs to survive concurrent instances or serious scale.
 */
let writing = Promise.resolve();

function enqueueWrite(mutator) {
  writing = writing.then(() => {
    const data = readAll();
    mutator(data);
    writeAll(data);
  });
  return writing;
}

function getSubscription(userId) {
  const data = readAll();
  return data[userId] || { status: 'free', provider: null, updatedAt: null };
}

async function setSubscription(userId, patch) {
  await enqueueWrite((data) => {
    data[userId] = { ...(data[userId] || {}), ...patch, updatedAt: Date.now() };
  });
  return getSubscription(userId);
}

async function setStripeCustomer(userId, customerId) {
  await enqueueWrite((data) => {
    data[userId] = { ...(data[userId] || {}), stripeCustomerId: customerId };
  });
}

function findUserIdByStripeCustomer(customerId) {
  const data = readAll();
  return Object.keys(data).find((userId) => data[userId].stripeCustomerId === customerId) || null;
}

module.exports = {
  getSubscription,
  setSubscription,
  setStripeCustomer,
  findUserIdByStripeCustomer,
};
