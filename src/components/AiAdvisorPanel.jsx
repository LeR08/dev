import { useEffect, useState } from 'react'
import { api } from '../utils/api.js'

export default function AiAdvisorPanel({ tier }) {
  const [usage, setUsage] = useState(null)
  const [advice, setAdvice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadUsage = async () => {
    try {
      setUsage(await api.get('/ai/usage'))
    } catch {
      // non-blocking — the request button will surface any real error
    }
  }

  useEffect(() => {
    if (tier !== 'free') loadUsage()
  }, [tier])

  const requestAdvice = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.post('/ai/advice', {})
      setAdvice(result.advice)
      setUsage(result.quota)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (tier === 'free') {
    return (
      <section className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">Conseiller IA</h2>
        <p>Disponible à partir du palier Basic (3 conseils/mois — illimité en VIP).</p>
      </section>
    )
  }

  const quotaExhausted = usage && usage.limit !== null && usage.used >= usage.limit

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">Conseiller IA</h2>
        {usage && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {usage.limit === null ? 'Illimité (VIP)' : `${usage.used}/${usage.limit} ce mois-ci`}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Analyse vos abonnements actifs (nom, prix, catégorie — jamais vos données bancaires) et suggère des doublons ou
        consolidations possibles. Ce sont des suggestions à vérifier vous-même, pas des actions automatiques.
      </p>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}

      {advice && (
        <div className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {advice}
        </div>
      )}

      <button
        onClick={requestAdvice}
        disabled={loading || quotaExhausted}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Analyse en cours…' : 'Demander un conseil'}
      </button>
    </section>
  )
}
