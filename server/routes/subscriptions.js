import { Router } from 'express'
import db from '../db.js'
import { maxSubscriptionsFor } from '../tiers.js'
import { publicSubscription } from '../serialize.js'
import { rollForwardToFuture } from '../../src/utils/calculations.js'

const router = Router()

function findOwned(req, res) {
  const row = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(req.params.id)
  if (!row || row.userId !== req.user.id) {
    res.status(404).json({ error: 'Abonnement introuvable' })
    return null
  }
  return row
}

router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM subscriptions WHERE userId = ? ORDER BY nextChargeDate ASC')
    .all(req.user.id)

  const now = new Date()
  for (const row of rows) {
    const { date, advanced } = rollForwardToFuture(row.nextChargeDate, row.frequency, now)
    if (advanced) {
      const iso = date.toISOString().slice(0, 10)
      db.prepare('UPDATE subscriptions SET nextChargeDate = ? WHERE id = ?').run(iso, row.id)
      row.nextChargeDate = iso
    }
  }

  res.json(rows.map(publicSubscription))
})

router.post('/', (req, res) => {
  const { name, price, currency, frequency, nextChargeDate, category } = req.body
  if (!name || !(Number(price) > 0) || !['weekly', 'monthly', 'yearly'].includes(frequency) || !nextChargeDate) {
    return res.status(400).json({ error: 'Champs invalides' })
  }

  const count = db.prepare('SELECT COUNT(*) AS n FROM subscriptions WHERE userId = ?').get(req.user.id).n
  const limit = maxSubscriptionsFor(req.user.tier)
  if (count >= limit) {
    return res.status(403).json({
      error: `Palier ${req.user.tier} limité à ${limit} abonnement(s). Passez à un palier supérieur pour en ajouter davantage.`,
    })
  }

  const info = db
    .prepare(
      `INSERT INTO subscriptions (userId, name, price, currency, frequency, nextChargeDate, category, isPaused, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    )
    .run(req.user.id, name, Number(price), currency || 'EUR', frequency, nextChargeDate, category || null, new Date().toISOString())

  const row = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json(publicSubscription(row))
})

router.put('/:id', (req, res) => {
  const existing = findOwned(req, res)
  if (!existing) return

  const { name, price, currency, frequency, nextChargeDate, category } = req.body
  if (price !== undefined && !(Number(price) > 0)) {
    return res.status(400).json({ error: 'Le prix doit être positif' })
  }
  if (frequency !== undefined && !['weekly', 'monthly', 'yearly'].includes(frequency)) {
    return res.status(400).json({ error: 'Fréquence invalide' })
  }

  db.prepare(
    `UPDATE subscriptions SET name = ?, price = ?, currency = ?, frequency = ?, nextChargeDate = ?, category = ? WHERE id = ?`,
  ).run(
    name ?? existing.name,
    price !== undefined ? Number(price) : existing.price,
    currency ?? existing.currency,
    frequency ?? existing.frequency,
    nextChargeDate ?? existing.nextChargeDate,
    category ?? existing.category,
    existing.id,
  )

  const row = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(existing.id)
  res.json(publicSubscription(row))
})

router.patch('/:id/pause', (req, res) => {
  const existing = findOwned(req, res)
  if (!existing) return

  db.prepare('UPDATE subscriptions SET isPaused = ? WHERE id = ?').run(req.body.isPaused ? 1 : 0, existing.id)
  const row = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(existing.id)
  res.json(publicSubscription(row))
})

router.delete('/:id', (req, res) => {
  const existing = findOwned(req, res)
  if (!existing) return

  db.prepare('DELETE FROM subscriptions WHERE id = ?').run(existing.id)
  res.status(204).end()
})

export default router
