// Thin client for the GoCardless Bank Account Data API (sandbox), used for the
// VIP "automatic bank connection" flow. There's no per-user OAuth bearer token
// in this API the way classic OAuth works — access is via a requisition id and
// its linked account ids, authenticated with our own platform-level secret.
// That's what gets encrypted at rest (see server/bank/crypto.js), since knowing
// those ids plus our secret is what grants read access to a user's transactions.

const API_BASE = 'https://bankaccountdata.gocardless.com/api/v2'

export function gocardlessConfigured() {
  return !!(process.env.GOCARDLESS_SECRET_ID && process.env.GOCARDLESS_SECRET_KEY)
}

let cachedToken = null // { access, expiresAt }

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.access
  }
  const res = await fetch(`${API_BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret_id: process.env.GOCARDLESS_SECRET_ID,
      secret_key: process.env.GOCARDLESS_SECRET_KEY,
    }),
  })
  if (!res.ok) throw new Error(`GoCardless auth failed (${res.status})`)
  const data = await res.json()
  cachedToken = { access: data.access, expiresAt: Date.now() + data.access_expires * 1000 }
  return cachedToken.access
}

async function gcRequest(path, options = {}) {
  const token = await getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    throw new Error(`GoCardless API error ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export async function listInstitutions(country = 'fr') {
  return gcRequest(`/institutions/?country=${encodeURIComponent(country)}`)
}

export async function createRequisition({ institutionId, reference, redirectUri }) {
  const agreement = await gcRequest('/agreements/enduser/', {
    method: 'POST',
    body: JSON.stringify({
      institution_id: institutionId,
      max_historical_days: 90,
      access_valid_for_days: 90,
      access_scope: ['balances', 'details', 'transactions'],
    }),
  })

  return gcRequest('/requisitions/', {
    method: 'POST',
    body: JSON.stringify({
      redirect: redirectUri,
      institution_id: institutionId,
      reference,
      agreement: agreement.id,
      user_language: 'FR',
    }),
  })
}

export async function getRequisition(requisitionId) {
  return gcRequest(`/requisitions/${requisitionId}/`)
}

export async function deleteRequisition(requisitionId) {
  return gcRequest(`/requisitions/${requisitionId}/`, { method: 'DELETE' })
}

export async function getAccountTransactions(accountId) {
  const data = await gcRequest(`/accounts/${accountId}/transactions/`)
  return data?.transactions?.booked ?? []
}
