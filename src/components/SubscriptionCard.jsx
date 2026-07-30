import { isImminent, daysUntil } from '../utils/calculations'
import { formatCurrency, FREQUENCIES } from '../utils/constants'

const frequencyLabel = (value) => FREQUENCIES.find((f) => f.value === value)?.label ?? value

export default function SubscriptionCard({ subscription, onEdit, onDelete, onTogglePause }) {
  const { id, name, price, currency, frequency, nextChargeDate, category, isPaused } = subscription
  const imminent = !isPaused && isImminent(nextChargeDate)
  const days = daysUntil(nextChargeDate)

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border p-4 shadow-sm transition sm:flex-row sm:items-center sm:justify-between ${
        isPaused
          ? 'border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-900'
          : imminent
            ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/40'
            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100">{name}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {category}
          </span>
          {isPaused && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-600 dark:text-slate-200">
              En pause
            </span>
          )}
          {imminent && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
              Prélèvement dans {days <= 0 ? "aujourd'hui" : `${days} j`}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {formatCurrency(price, currency)} · {frequencyLabel(frequency)} · prochain: {nextChargeDate}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        <button
          onClick={() => onTogglePause(id, !isPaused)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {isPaused ? 'Reprendre' : 'Mettre en pause'}
        </button>
        <button
          onClick={() => onEdit(subscription)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
        >
          Modifier
        </button>
        <button
          onClick={() => onDelete(id)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}
