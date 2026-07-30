import { Router } from 'express'
import db from '../db.js'
import { TIERS } from '../tiers.js'
import { computeTotalsByCurrency } from '../../src/utils/calculations.js'

const router = Router()

router.get('/users', (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.email, u.role, u.tier, u.isActive, u.createdAt,
              COUNT(s.id) AS subscriptionCount
       FROM users u
       LEFT JOIN subscriptions s ON s.userId = u.id
       GROUP BY u.id
       ORDER BY u.createdAt ASC`,
    )
    .all()

  res.json(rows.map((r) => ({ ...r, isActive: !!r.isActive })))
})

router.get('/stats', (req, res) => {
  const byTier = { free: 0, basic: 0, pro: 0, vip: 0 }
  for (const row of db.prepare('SELECT tier, COUNT(*) AS n FROM users GROUP BY tier').all()) {
    byTier[row.tier] = row.n
  }

  const allSubscriptions = db.prepare('SELECT * FROM subscriptions').all().map((s) => ({ ...s, isPaused: !!s.isPaused }))

  res.json({
    totalUsers: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
    byTier,
    totalsByCurrency: computeTotalsByCurrency(allSubscriptions),
  })
})

router.patch('/users/:id', (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' })
  if (target.role === 'admin') {
    return res.status(400).json({ error: "Impossible de modifier un compte administrateur via cette route" })
  }

  const { tier, isActive } = req.body
  const updates = []
  const params = []

  if (tier !== undefined) {
    if (!TIERS.includes(tier)) return res.status(400).json({ error: 'Palier invalide' })
    updates.push('tier = ?')
    params.push(tier)
  }

  if (isActive !== undefined) {
    updates.push('isActive = ?')
    params.push(isActive ? 1 : 0)
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Aucune modification fournie' })
  }

  params.push(target.id)
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(target.id)
  res.json({ id: user.id, email: user.email, role: user.role, tier: user.tier, isActive: !!user.isActive })
})

export default router
