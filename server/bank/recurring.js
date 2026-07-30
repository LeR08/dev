function normalizeName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// Average-interval windows with tolerance, matching the app's own frequency vocabulary.
function classifyFrequency(avgIntervalDays) {
  if (avgIntervalDays >= 5 && avgIntervalDays <= 9) return 'weekly'
  if (avgIntervalDays >= 25 && avgIntervalDays <= 35) return 'monthly'
  if (avgIntervalDays >= 350 && avgIntervalDays <= 380) return 'yearly'
  return null
}

// Groups debit transactions by (payee, amount, currency) and flags groups that
// recur at a roughly regular interval as candidate subscriptions.
export function detectRecurringCharges(transactions) {
  const groups = new Map()

  for (const tx of transactions) {
    const rawAmount = tx.transactionAmount?.amount
    const amount = rawAmount !== undefined ? Number(rawAmount) : null
    if (amount === null || Number.isNaN(amount) || amount >= 0) continue // only outgoing charges

    const currency = tx.transactionAmount?.currency || 'EUR'
    const payee = tx.creditorName || tx.debtorName || tx.remittanceInformationUnstructured || 'Prélèvement'
    const date = tx.bookingDate || tx.valueDate
    if (!date) continue

    const key = `${normalizeName(payee)}|${Math.abs(amount).toFixed(2)}|${currency}`
    if (!groups.has(key)) {
      groups.set(key, { payee, amount: Math.abs(amount), currency, dates: [] })
    }
    groups.get(key).dates.push(date)
  }

  const suggestions = []
  for (const group of groups.values()) {
    if (group.dates.length < 2) continue

    const sorted = group.dates.map((d) => new Date(d)).sort((a, b) => a - b)
    const intervals = []
    for (let i = 1; i < sorted.length; i++) {
      intervals.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24))
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const frequency = classifyFrequency(avgInterval)
    if (!frequency) continue

    const last = sorted[sorted.length - 1]
    const next = new Date(last)
    if (frequency === 'weekly') next.setDate(next.getDate() + 7)
    else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1)
    else next.setFullYear(next.getFullYear() + 1)

    suggestions.push({
      name: group.payee,
      price: group.amount,
      currency: group.currency,
      frequency,
      nextChargeDate: next.toISOString().slice(0, 10),
      occurrences: sorted.length,
    })
  }

  return suggestions
}
