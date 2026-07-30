import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { computeTotalsByCurrency, computeByCategory, isImminent } from '../utils/calculations'
import { formatCurrency } from '../utils/constants'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#84cc16']

export default function DashboardSummary({ subscriptions }) {
  const totalsByCurrency = useMemo(() => computeTotalsByCurrency(subscriptions), [subscriptions])
  const byCategory = useMemo(() => computeByCategory(subscriptions), [subscriptions])
  const imminentCount = useMemo(
    () => subscriptions.filter((s) => !s.isPaused && isImminent(s.nextChargeDate)).length,
    [subscriptions],
  )
  const activeCount = subscriptions.filter((s) => !s.isPaused).length
  const pausedCount = subscriptions.filter((s) => s.isPaused).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Abonnements actifs" value={activeCount} />
        <SummaryCard label="En pause" value={pausedCount} />
        <SummaryCard
          label="Prélèvements imminents (< 3j)"
          value={imminentCount}
          highlight={imminentCount > 0}
        />
        <SummaryCard label="Catégories" value={byCategory.length} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {totalsByCurrency.length === 0 ? (
          <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:col-span-2">
            Aucun coût actif à afficher.
          </p>
        ) : (
          totalsByCurrency.map(({ currency, monthly, yearly }) => (
            <div
              key={currency}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total ({currency})
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(monthly, currency)}
                <span className="ml-1 text-sm font-normal text-slate-500 dark:text-slate-400">/ mois</span>
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatCurrency(yearly, currency)} / an
              </p>
            </div>
          ))
        )}
      </div>

      {byCategory.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Répartition mensuelle par catégorie
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="monthly"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ category, monthly }) => `${category}: ${monthly.toFixed(2)}`}
                >
                  {byCategory.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toFixed(2)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, highlight }) {
  return (
    <div
      className={`rounded-lg border p-3 text-center ${
        highlight
          ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/40'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
      }`}
    >
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}
