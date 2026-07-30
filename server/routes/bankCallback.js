import { Router } from 'express'
import db from '../db.js'
import { encryptJson, decryptJson } from '../bank/crypto.js'
import { getRequisition } from '../bank/gocardless.js'

const router = Router()
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Public redirect target GoCardless sends the user's browser back to once
// they've authorized (or declined) access at the aggregator. No JWT is
// available here — the pending connection is correlated purely via the
// `ref` we generated and handed to GoCardless when creating the requisition.
router.get('/', async (req, res) => {
  const { ref } = req.query
  if (!ref) return res.redirect(`${FRONTEND_URL}/?bank=error`)

  const connection = db
    .prepare("SELECT * FROM bank_connections WHERE reference = ? AND status = 'pending'")
    .get(ref)
  if (!connection) return res.redirect(`${FRONTEND_URL}/?bank=error`)

  try {
    const { requisitionId } = decryptJson(connection.encryptedRequisition)
    const requisition = await getRequisition(requisitionId)
    const accountIds = requisition.accounts || []

    if (accountIds.length === 0) {
      db.prepare("UPDATE bank_connections SET status = 'revoked', revokedAt = ? WHERE id = ?").run(
        new Date().toISOString(),
        connection.id,
      )
      return res.redirect(`${FRONTEND_URL}/?bank=error`)
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    db.prepare(
      "UPDATE bank_connections SET status = 'linked', encryptedRequisition = ?, expiresAt = ?, linkedAt = ? WHERE id = ?",
    ).run(encryptJson({ requisitionId, accountIds }), expiresAt.toISOString(), now.toISOString(), connection.id)

    res.redirect(`${FRONTEND_URL}/?bank=linked`)
  } catch (err) {
    console.error('[bank] Erreur callback', err.message)
    res.redirect(`${FRONTEND_URL}/?bank=error`)
  }
})

export default router
