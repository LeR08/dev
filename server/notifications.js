import cron from 'node-cron'
import db from './db.js'
import { isImminent } from '../src/utils/calculations.js'

const INTERVAL_HOURS = Math.max(1, Number(process.env.DISCORD_CHECK_INTERVAL_HOURS) || 6)

async function sendDiscordAlert(webhookUrl, subscription) {
  const content =
    `🔔 **${subscription.name}** — ${subscription.price} ${subscription.currency} ` +
    `sera prélevé le ${subscription.nextChargeDate}.`

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })

  if (!res.ok) {
    console.error(`[discord] Échec envoi webhook (${res.status}) pour l'abonnement #${subscription.id}`)
  }
  return res.ok
}

export async function checkAndNotify() {
  const users = db
    .prepare(
      `SELECT * FROM users
       WHERE isActive = 1 AND tier != 'free' AND discordWebhookUrl IS NOT NULL AND discordWebhookUrl != ''`,
    )
    .all()

  for (const user of users) {
    const subs = db.prepare('SELECT * FROM subscriptions WHERE userId = ? AND isPaused = 0').all(user.id)
    for (const sub of subs) {
      if (!isImminent(sub.nextChargeDate)) continue
      if (sub.lastAlertSentFor === sub.nextChargeDate) continue

      try {
        const ok = await sendDiscordAlert(user.discordWebhookUrl, sub)
        if (ok) {
          db.prepare('UPDATE subscriptions SET lastAlertSentFor = ? WHERE id = ?').run(sub.nextChargeDate, sub.id)
        }
      } catch (err) {
        console.error(`[discord] Erreur envoi webhook pour l'abonnement #${sub.id}`, err.message)
      }
    }
  }
}

export function startNotificationJob() {
  checkAndNotify().catch((err) => console.error('[discord] Erreur job notifications', err))

  cron.schedule(`0 */${INTERVAL_HOURS} * * *`, () => {
    checkAndNotify().catch((err) => console.error('[discord] Erreur job notifications', err))
  })

  console.log(`[discord] Job de notifications planifié toutes les ${INTERVAL_HOURS}h (+ vérification au démarrage).`)
}
