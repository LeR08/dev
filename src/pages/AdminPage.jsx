import { useEffect, useState } from 'react'
import { api } from '../utils/api.js'
import { formatCurrency } from '../utils/constants.js'

const TIER_OPTIONS = ['free', 'basic', 'pro']

export default function AdminPage({ onBack }) {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const [usersData, statsData] = await Promise.all([api.get('/admin/users'), api.get('/admin/stats')])
      setUsers(usersData)
      setStats(statsData)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const changeTier = async (id, tier) => {
    try {
      await api.patch(`/admin/users/${id}`, { tier })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleActive = async (id, isActive) => {
    try {
      await api.patch(`/admin/users/${id}`, { isActive: !isActive })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <button onClick={onBack} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
        ← Retour
      </button>
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Panel admin</h1>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Utilisateurs" value={stats.totalUsers} />
          <StatCard label="Free" value={stats.byTier.free ?? 0} />
          <StatCard label="Basic" value={stats.byTier.basic ?? 0} />
          <StatCard label="Pro" value={stats.byTier.pro ?? 0} />
        </div>
      )}

      {stats && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-2 font-semibold text-slate-800 dark:text-slate-200">Coût total suivi (tous utilisateurs)</h2>
          {stats.totalsByCurrency.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Aucun coût actif.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {stats.totalsByCurrency.map((t) => (
                <li key={t.currency}>
                  {formatCurrency(t.monthly, t.currency)} / mois — {formatCurrency(t.yearly, t.currency)} / an
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Abonnements</th>
              <th className="px-3 py-2">Inscrit le</th>
              <th className="px-3 py-2">Palier</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-3 py-2">
                  {u.email}
                  {u.role === 'admin' && <span className="ml-1 text-xs text-slate-400">(admin)</span>}
                </td>
                <td className="px-3 py-2">{u.subscriptionCount}</td>
                <td className="px-3 py-2">{u.createdAt.slice(0, 10)}</td>
                <td className="px-3 py-2">
                  {u.role === 'admin' ? (
                    u.tier
                  ) : (
                    <select
                      value={u.tier}
                      onChange={(e) => changeTier(u.id, e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                    >
                      {TIER_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2">{u.isActive ? 'Actif' : 'Désactivé'}</td>
                <td className="px-3 py-2">
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => toggleActive(u.id, u.isActive)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      {u.isActive ? 'Désactiver' : 'Réactiver'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}
