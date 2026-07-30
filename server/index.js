import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import './db.js'
import authRoutes from './routes/auth.js'
import subscriptionsRoutes from './routes/subscriptions.js'
import userRoutes from './routes/user.js'
import adminRoutes from './routes/admin.js'
import { requireAuth, attachUser, requireAdmin } from './auth.js'
import { startNotificationJob } from './notifications.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/subscriptions', requireAuth, attachUser, subscriptionsRoutes)
app.use('/api/user', requireAuth, attachUser, userRoutes)
app.use('/api/admin', requireAuth, attachUser, requireAdmin, adminRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' })
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erreur serveur' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`SubTrack API à l'écoute sur http://localhost:${PORT}`)
  startNotificationJob()
})
