export const TIERS = ['free', 'basic', 'pro']

const MAX_SUBSCRIPTIONS = {
  free: 5,
  basic: Infinity,
  pro: Infinity,
}

export function maxSubscriptionsFor(tier) {
  return MAX_SUBSCRIPTIONS[tier] ?? MAX_SUBSCRIPTIONS.free
}

export function canUseDiscordAlerts(tier) {
  return tier === 'basic' || tier === 'pro'
}

export function canUseMultiCurrency(tier) {
  return tier === 'pro'
}
