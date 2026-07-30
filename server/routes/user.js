import { Router } from 'express'
import bcrypt from 'bcrypt'
import db from '../db.js'
import { TIERS } from '../tiers.js'
import { publicUser } from '../serialize.js'

const router = Router()
const DISCORD_WEBHOOK_RE = /^https:\/\/discord(app)?\.com\/api\/webhooks\//

router.get('/me', (req, res) => {
  res.json(publicUser(req.user))
})

router.patch('/me', async (req, res) => {
  const { discordWebhookUrl, tier, currentPassword, newPassword } = req.body
  const updates = []
  const params = []

  if (discordWebhookUrl !== undefined) {
    if (discordWebhookUrl && !DISCORD_WEBHOOK_RE.test(discordWebhookUrl)) {
      return res.status(400).json({ error: 'URL de webhook Discord invalide' })
    }
    updates.push('discordWebhookUrl = ?')
    params.push(discordWebhookUrl || null)
  }

  if (tier !== undefined) {
    if (!TIERS.includes(tier)) return res.status(400).json({ error: 'Palier invalide' })
    updates.push('tier = ?')
    params.push(tier)
  }

  if (newPassword !== undefined) {
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' })
    }
    if (!req.user.mustChangePassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Mot de passe actuel requis' })
      const valid = await bcrypt.compare(currentPassword, req.user.passwordHash)
      if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' })
    }
    const passwordHash = await bcrypt.hash(newPassword, 10)
    updates.push('passwordHash = ?', 'mustChangePassword = 0')
    params.push(passwordHash)
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Aucune modification fournie' })
  }

  params.push(req.user.id)
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json(publicUser(user))
})

export default router
