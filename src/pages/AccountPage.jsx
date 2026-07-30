import { useState } from 'react'
import { api } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import ChangePasswordForm from '../components/ChangePasswordForm.jsx'
import AiAdvisorPanel from '../components/AiAdvisorPanel.jsx'
import BankConnectionPanel from '../components/BankConnectionPanel.jsx'

const TIER_OPTIONS = [
  { value: 'free', label: 'Free — 5 abonnements max, alertes in-app' },
  { value: 'basic', label: 'Basic — illimité, alertes Discord, graphique par catégorie, 3 conseils IA/mois' },
  { value: 'pro', label: 'Pro — tout Basic + multi-devises, export avancé, 3 conseils IA/mois' },
  { value: 'vip', label: 'VIP — tout Pro + connexion bancaire automatique, conseiller IA illimité' },
]

export default function AccountPage({ onBack }) {
  const { user, refreshUser } = useAuth()
  const [webhook, setWebhook] = useState(user.discordWebhookUrl || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleTierChange = async (e) => {
    try {
      await api.patch('/user/me', { tier: e.target.value })
      await refreshUser()
      setMessage('Palier mis à jour.')
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleWebhookSave = async (e) => {
    e.preventDefault()
    try {
      await api.patch('/user/me', { discordWebhookUrl: webhook })
      await refreshUser()
      setMessage('Webhook Discord enregistré.')
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <button onClick={onBack} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
        ← Retour
      </button>
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Mon compte</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>

      {message && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">Palier</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Bêta-test : le changement de palier est une simulation, aucun paiement réel n'est requis.
        </p>
        <select
          value={user.tier}
          onChange={handleTierChange}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          {TIER_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </section>

      {user.tier !== 'free' && (
        <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Notifications Discord</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Renseignez l'URL d'un webhook Discord pour recevoir une alerte lorsqu'un prélèvement est imminent.
          </p>
          <form onSubmit={handleWebhookSave} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/…"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Enregistrer
            </button>
          </form>
        </section>
      )}

      <AiAdvisorPanel tier={user.tier} />

      <BankConnectionPanel tier={user.tier} />

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">Mot de passe</h2>
        <ChangePasswordForm onDone={() => setMessage('Mot de passe mis à jour.')} />
      </section>
    </div>
  )
}
