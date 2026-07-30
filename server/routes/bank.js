import { Router } from 'express'
import crypto from 'node:crypto'
import db from '../db.js'
import { canUseBankConnection } from '../tiers.js'
import { encryptJson, decryptJson, bankEncryptionConfigured } from '../bank/crypto.js'
import {
  gocardlessConfigured,
  listInstitutions,
  createRequisition,
  deleteRequisition,
  getAccountTransactions,
} from '../bank/gocardless.js'
import { detectRecurringCharges } from '../bank/recurring.js'

const router = Router()

function requireVip(req, res, next) {
  if (!canUseBankConnection(req.user.tier)) {
    return res.status(403).json({ error: 'La connexion bancaire automatique est réservée au palier VIP.' })
  }
  next()
}

function requireConfigured(req, res, next) {
  if (!gocardlessConfigured() || !bankEncryptionConfigured()) {
    return res.status(503).json({ error: "L'intégration bancaire n'est pas configurée sur ce serveur." })
  }
  next()
}

router.use(requireVip)

router.get('/institutions', requireConfigured, async (req, res) => {
  try {
    const institutions = await listInstitutions(req.query.country || 'fr')
    res.json(institutions.map((i) => ({ id: i.id, name: i.name, logo: i.logo })))
  } catch (err) {
    console.error('[bank] Erreur listInstitutions', err.message)
    res.status(502).json({ error: 'Impossible de récupérer la liste des banques (sandbox GoCardless).' })
  }
})

router.get('/connections', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, provider, institutionId, status, expiresAt, createdAt, linkedAt, revokedAt
       FROM bank_connections WHERE userId = ? ORDER BY createdAt DESC`,
    )
    .all(req.user.id)
  res.json(rows)
})

router.post('/connect', requireConfigured, async (req, res) => {
  const { institutionId } = req.body
  if (!institutionId) return res.status(400).json({ error: 'institutionId requis' })

  const reference = crypto.randomBytes(24).toString('hex')
  const redirectUri = process.env.GOCARDLESS_REDIRECT_URI || 'http://localhost:3000/api/bank/callback'

  try {
    const requisition = await createRequisition({ institutionId, reference, redirectUri })
    db.prepare(
      `INSERT INTO bank_connections (userId, provider, institutionId, reference, status, encryptedRequisition, createdAt)
       VALUES (?, 'gocardless', ?, ?, 'pending', ?, ?)`,
    ).run(
      req.user.id,
      institutionId,
      reference,
      encryptJson({ requisitionId: requisition.id, accountIds: [] }),
      new Date().toISOString(),
    )

    res.status(201).json({ link: requisition.link })
  } catch (err) {
    console.error('[bank] Erreur createRequisition', err.message)
    res.status(502).json({ error: 'Impossible de démarrer la connexion bancaire (sandbox GoCardless).' })
  }
})

router.delete('/connections/:id', async (req, res) => {
  const connection = db
    .prepare('SELECT * FROM bank_connections WHERE id = ? AND userId = ?')
    .get(req.params.id, req.user.id)
  if (!connection) return res.status(404).json({ error: 'Connexion introuvable' })

  if (connection.status === 'linked' && gocardlessConfigured()) {
    try {
      const { requisitionId } = decryptJson(connection.encryptedRequisition)
      await deleteRequisition(requisitionId)
    } catch (err) {
      console.error('[bank] Erreur revoke côté GoCardless (poursuite de la révocation locale)', err.message)
    }
  }

  db.prepare("UPDATE bank_connections SET status = 'revoked', revokedAt = ? WHERE id = ?").run(
    new Date().toISOString(),
    connection.id,
  )
  res.status(204).end()
})

router.get('/suggestions', requireConfigured, async (req, res) => {
  const connections = db
    .prepare("SELECT * FROM bank_connections WHERE userId = ? AND status = 'linked'")
    .all(req.user.id)

  for (const connection of connections) {
    try {
      const { accountIds } = decryptJson(connection.encryptedRequisition)
      for (const accountId of accountIds) {
        const transactions = await getAccountTransactions(accountId)
        const detected = detectRecurringCharges(transactions)
        for (const item of detected) {
          const existing = db
            .prepare(
              `SELECT id FROM bank_suggestions
               WHERE userId = ? AND bankConnectionId = ? AND name = ? AND price = ? AND currency = ? AND frequency = ?`,
            )
            .get(req.user.id, connection.id, item.name, item.price, item.currency, item.frequency)
          if (!existing) {
            db.prepare(
              `INSERT INTO bank_suggestions (userId, bankConnectionId, name, price, currency, frequency, nextChargeDate, status, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
            ).run(
              req.user.id,
              connection.id,
              item.name,
              item.price,
              item.currency,
              item.frequency,
              item.nextChargeDate,
              new Date().toISOString(),
            )
          }
        }
      }
    } catch (err) {
      console.error(`[bank] Erreur analyse transactions (connexion #${connection.id})`, err.message)
    }
  }

  const suggestions = db
    .prepare("SELECT * FROM bank_suggestions WHERE userId = ? AND status = 'pending' ORDER BY createdAt DESC")
    .all(req.user.id)
  res.json(suggestions)
})

router.post('/suggestions/:id/accept', (req, res) => {
  const suggestion = db
    .prepare('SELECT * FROM bank_suggestions WHERE id = ? AND userId = ?')
    .get(req.params.id, req.user.id)
  if (!suggestion) return res.status(404).json({ error: 'Suggestion introuvable' })
  if (suggestion.status !== 'pending') return res.status(400).json({ error: 'Suggestion déjà traitée' })

  const now = new Date().toISOString()
  const info = db
    .prepare(
      `INSERT INTO subscriptions (userId, name, price, currency, frequency, nextChargeDate, category, isPaused, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'Détecté (banque)', 0, ?)`,
    )
    .run(req.user.id, suggestion.name, suggestion.price, suggestion.currency, suggestion.frequency, suggestion.nextChargeDate, now)

  db.prepare("UPDATE bank_suggestions SET status = 'accepted' WHERE id = ?").run(suggestion.id)

  const row = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json({ ...row, isPaused: !!row.isPaused })
})

router.post('/suggestions/:id/dismiss', (req, res) => {
  const suggestion = db
    .prepare('SELECT * FROM bank_suggestions WHERE id = ? AND userId = ?')
    .get(req.params.id, req.user.id)
  if (!suggestion) return res.status(404).json({ error: 'Suggestion introuvable' })

  db.prepare("UPDATE bank_suggestions SET status = 'dismissed' WHERE id = ?").run(suggestion.id)
  res.status(204).end()
})

export default router
