import { useEffect, useState } from 'react'
import { api } from '../utils/api.js'
import { formatCurrency } from '../utils/constants.js'

export default function BankConnectionPanel({ tier }) {
  const [institutions, setInstitutions] = useState([])
  const [selectedInstitution, setSelectedInstitution] = useState('')
  const [connections, setConnections] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const vip = tier === 'vip'

  const loadConnections = async () => {
    try {
      setConnections(await api.get('/bank/connections'))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (!vip) return
    loadConnections()
    api
      .get('/bank/institutions')
      .then(setInstitutions)
      .catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vip])

  const handleConnect = async (e) => {
    e.preventDefault()
    if (!selectedInstitution) return
    setLoading(true)
    setError('')
    try {
      const { link } = await api.post('/bank/connect', { institutionId: selectedInstitution })
      window.location.href = link
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleRevoke = async (id) => {
    try {
      await api.delete(`/bank/connections/${id}`)
      loadConnections()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleFetchSuggestions = async () => {
    setLoading(true)
    setError('')
    try {
      setSuggestions(await api.get('/bank/suggestions'))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (id) => {
    try {
      await api.post(`/bank/suggestions/${id}/accept`, {})
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
      setMessage('Abonnement ajouté à votre liste.')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDismiss = async (id) => {
    try {
      await api.post(`/bank/suggestions/${id}/dismiss`, {})
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  if (!vip) {
    return (
      <section className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">Connexion bancaire automatique</h2>
        <p>Réservée au palier VIP : détection automatique des abonnements depuis vos relevés (sandbox GoCardless).</p>
      </section>
    )
  }

  const hasLinkedConnection = connections.some((c) => c.status === 'linked')

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <h2 className="font-semibold text-slate-800 dark:text-slate-200">Connexion bancaire automatique</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Bêta-test en mode sandbox (GoCardless Bank Account Data) — aucune vraie donnée bancaire n'est nécessaire pour tester
        le flux. SubTrack ne voit jamais vos identifiants bancaires : l'agrégateur les gère, nous ne recevons qu'un accès en
        lecture seule, chiffré en base. Les abonnements détectés sont des suggestions : rien n'est ajouté sans votre
        confirmation.
      </p>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}
      {message && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {message}
        </p>
      )}

      <form onSubmit={handleConnect} className="flex flex-col gap-2 sm:flex-row">
        <select
          value={selectedInstitution}
          onChange={(e) => setSelectedInstitution(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Choisir une banque (sandbox)…</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || !selectedInstitution}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Connecter
        </button>
      </form>

      {connections.length > 0 && (
        <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
          {connections.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700"
            >
              <span>
                {c.institutionId} — <span className="text-xs">{c.status}</span>
              </span>
              {c.status === 'linked' && (
                <button
                  onClick={() => handleRevoke(c.id)}
                  className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Révoquer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasLinkedConnection && (
        <div className="space-y-2">
          <button
            onClick={handleFetchSuggestions}
            disabled={loading}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            {loading ? 'Analyse…' : 'Rechercher des abonnements détectés'}
          </button>

          {suggestions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-600 dark:bg-amber-950/40"
            >
              <span>
                {s.name} — {formatCurrency(s.price, s.currency)} ({s.frequency})
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(s.id)}
                  className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  Ajouter
                </button>
                <button
                  onClick={() => handleDismiss(s.id)}
                  className="text-xs font-medium text-slate-500 hover:underline dark:text-slate-400"
                >
                  Ignorer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
