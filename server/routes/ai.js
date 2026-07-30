import { Router } from 'express'
import db from '../db.js'
import { aiMonthlyQuotaFor } from '../tiers.js'
import { getAdvice, AiNotConfiguredError } from '../ai/advisor.js'

const router = Router()

function currentYearMonth() {
  return new Date().toISOString().slice(0, 7)
}

function getUsage(userId, yearMonth) {
  const row = db.prepare('SELECT count FROM ai_usage WHERE userId = ? AND yearMonth = ?').get(userId, yearMonth)
  return row?.count ?? 0
}

function incrementUsage(userId, yearMonth) {
  db.prepare(
    `INSERT INTO ai_usage (userId, yearMonth, count) VALUES (?, ?, 1)
     ON CONFLICT(userId, yearMonth) DO UPDATE SET count = count + 1`,
  ).run(userId, yearMonth)
}

router.get('/usage', (req, res) => {
  const quota = aiMonthlyQuotaFor(req.user.tier)
  const used = getUsage(req.user.id, currentYearMonth())
  res.json({ used, limit: Number.isFinite(quota) ? quota : null })
})

router.post('/advice', async (req, res) => {
  const quota = aiMonthlyQuotaFor(req.user.tier)
  if (quota <= 0) {
    return res.status(403).json({ error: 'Le conseiller IA est disponible à partir du palier Basic.' })
  }

  const yearMonth = currentYearMonth()
  const used = getUsage(req.user.id, yearMonth)
  if (used >= quota) {
    return res.status(429).json({
      error: `Quota de conseils IA atteint pour ce mois (${quota}/mois sur votre palier). Passez au palier VIP pour un accès illimité.`,
    })
  }

  const subscriptions = db
    .prepare('SELECT name, price, currency, frequency, category FROM subscriptions WHERE userId = ? AND isPaused = 0')
    .all(req.user.id)

  if (subscriptions.length === 0) {
    return res.status(400).json({ error: 'Ajoutez au moins un abonnement actif avant de demander un conseil.' })
  }

  try {
    const advice = await getAdvice(subscriptions)
    incrementUsage(req.user.id, yearMonth)
    const newUsed = used + 1
    res.json({ advice, quota: { used: newUsed, limit: Number.isFinite(quota) ? quota : null } })
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return res.status(503).json({ error: err.message })
    }
    console.error('[ai] Erreur appel API', err.message)
    res.status(502).json({ error: 'Le conseiller IA est momentanément indisponible.' })
  }
})

export default router
