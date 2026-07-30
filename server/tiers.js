export const TIERS = ['free', 'basic', 'pro', 'vip']

const MAX_SUBSCRIPTIONS = {
  free: 5,
  basic: Infinity,
  pro: Infinity,
  vip: Infinity,
}

// Monthly AI advisor request quota. Free gets none (upsell), Basic/Pro get a
// taste of the feature without giving it away for free, VIP is unlimited.
const AI_MONTHLY_QUOTA = {
  free: 0,
  basic: 3,
  pro: 3,
  vip: Infinity,
}

export function maxSubscriptionsFor(tier) {
  return MAX_SUBSCRIPTIONS[tier] ?? MAX_SUBSCRIPTIONS.free
}

export function canUseDiscordAlerts(tier) {
  return tier === 'basic' || tier === 'pro' || tier === 'vip'
}

export function canUseMultiCurrency(tier) {
  return tier === 'pro' || tier === 'vip'
}

export function aiMonthlyQuotaFor(tier) {
  return AI_MONTHLY_QUOTA[tier] ?? AI_MONTHLY_QUOTA.free
}

export function canUseBankConnection(tier) {
  return tier === 'vip'
}
