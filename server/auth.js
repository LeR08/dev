import jwt from 'jsonwebtoken'
import db from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-prod'
const JWT_EXPIRES_IN = '7d'

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise' })
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}

// Loads the current user row fresh from the DB so tier/role/isActive changes
// (e.g. an admin demoting or disabling someone) take effect immediately,
// without waiting for the JWT to expire.
export function attachUser(req, res, next) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId)
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' })
  if (!user.isActive) return res.status(403).json({ error: 'Compte désactivé' })
  req.user = user
  next()
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' })
  }
  next()
}
