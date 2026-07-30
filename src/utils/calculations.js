const WEEKS_PER_MONTH = 4.33
const WEEKS_PER_YEAR = 52
const MONTHS_PER_YEAR = 12

export function toMonthlyCost(price, frequency) {
  switch (frequency) {
    case 'weekly':
      return price * WEEKS_PER_MONTH
    case 'yearly':
      return price / MONTHS_PER_YEAR
    case 'monthly':
    default:
      return price
  }
}

export function toYearlyCost(price, frequency) {
  switch (frequency) {
    case 'weekly':
      return price * WEEKS_PER_YEAR
    case 'monthly':
      return price * MONTHS_PER_YEAR
    case 'yearly':
    default:
      return price
  }
}

export function addPeriod(date, frequency) {
  const d = new Date(date)
  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1)
      break
    case 'monthly':
    default:
      d.setMonth(d.getMonth() + 1)
      break
  }
  return d
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Advances nextChargeDate forward by `frequency` steps until it lands today or later.
export function rollForwardToFuture(dateStr, frequency, now = new Date()) {
  const today = startOfDay(now)
  let d = new Date(dateStr)
  let advanced = false
  while (startOfDay(d) < today) {
    d = addPeriod(d, frequency)
    advanced = true
  }
  return { date: d, advanced }
}

export function daysUntil(dateStr, now = new Date()) {
  const today = startOfDay(now)
  const target = startOfDay(dateStr)
  const diffMs = target.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function isImminent(dateStr, thresholdDays = 3, now = new Date()) {
  const diff = daysUntil(dateStr, now)
  return diff >= 0 && diff <= thresholdDays
}

export function computeTotals(subscriptions) {
  const active = subscriptions.filter((s) => !s.isPaused)
  const monthly = active.reduce((sum, s) => sum + toMonthlyCost(s.price, s.frequency), 0)
  const yearly = active.reduce((sum, s) => sum + toYearlyCost(s.price, s.frequency), 0)
  return { monthly, yearly }
}

// Groups totals by currency since the app doesn't do currency conversion (out of scope).
export function computeTotalsByCurrency(subscriptions) {
  const active = subscriptions.filter((s) => !s.isPaused)
  const map = new Map()
  for (const s of active) {
    const currency = s.currency || 'EUR'
    const entry = map.get(currency) || { monthly: 0, yearly: 0 }
    entry.monthly += toMonthlyCost(s.price, s.frequency)
    entry.yearly += toYearlyCost(s.price, s.frequency)
    map.set(currency, entry)
  }
  return Array.from(map.entries()).map(([currency, totals]) => ({ currency, ...totals }))
}

export function computeByCategory(subscriptions) {
  const active = subscriptions.filter((s) => !s.isPaused)
  const map = new Map()
  for (const s of active) {
    const key = s.category || 'Autre'
    const monthly = toMonthlyCost(s.price, s.frequency)
    map.set(key, (map.get(key) || 0) + monthly)
  }
  return Array.from(map.entries()).map(([category, monthly]) => ({ category, monthly }))
}
