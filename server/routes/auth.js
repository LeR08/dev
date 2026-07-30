import { Router } from 'express'
import bcrypt from 'bcrypt'
import db from '../db.js'
import { signToken } from '../auth.js'
import { publicUser } from '../serialize.js'

const router = Router()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

router.post('/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Email invalide' })
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ error: 'Cet email est déjà utilisé' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const info = db
    .prepare(
      `INSERT INTO users (email, passwordHash, role, tier, isActive, mustChangePassword, createdAt)
       VALUES (?, ?, 'user', 'free', 1, 0, ?)`,
    )
    .run(email, passwordHash, new Date().toISOString())

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json({ token: signToken(user), user: publicUser(user) })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' })
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) return res.status(401).json({ error: 'Identifiants invalides' })
  if (!user.isActive) return res.status(403).json({ error: 'Compte désactivé' })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Identifiants invalides' })

  res.json({ token: signToken(user), user: publicUser(user) })
})

export default router
