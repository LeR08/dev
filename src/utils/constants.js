export const FREQUENCIES = [
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'yearly', label: 'Annuel' },
]

export const DEFAULT_CATEGORIES = [
  'Streaming',
  'Logiciel',
  'Sport',
  'Musique',
  'Jeux vidéo',
  'Cloud',
  'Autre',
]

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF']

export const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
}

export function formatCurrency(value, currency = 'EUR') {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(value)
  } catch {
    return `${value.toFixed(2)} ${CURRENCY_SYMBOLS[currency] || currency}`
  }
}
