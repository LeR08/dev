import { useMemo, useState } from 'react'
import SubscriptionCard from './SubscriptionCard.jsx'

const SORT_OPTIONS = [
  { value: 'nextChargeDate', label: 'Date' },
  { value: 'price', label: 'Prix' },
  { value: 'category', label: 'Catégorie' },
]

export default function SubscriptionList({ subscriptions, onEdit, onDelete, onTogglePause }) {
  const [sortKey, setSortKey] = useState('nextChargeDate')
  const [sortDir, setSortDir] = useState('asc')

  const sorted = useMemo(() => {
    const copy = [...subscriptions]
    copy.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'price') cmp = a.price - b.price
      else if (sortKey === 'category') cmp = a.category.localeCompare(b.category)
      else cmp = a.nextChargeDate.localeCompare(b.nextChargeDate)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [subscriptions, sortKey, sortDir])

  const toggleDir = () => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))

  const handleDelete = (id) => {
    if (window.confirm('Supprimer cet abonnement ?')) {
      onDelete(id)
    }
  }

  if (subscriptions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Aucun abonnement pour le moment. Ajoutez-en un pour commencer.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <span>Trier par :</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => (sortKey === opt.value ? toggleDir() : setSortKey(opt.value))}
            className={`rounded-md px-2 py-1 ${
              sortKey === opt.value
                ? 'bg-indigo-100 font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {opt.label} {sortKey === opt.value ? (sortDir === 'asc' ? '↑' : '↓') : ''}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {sorted.map((sub) => (
          <SubscriptionCard
            key={sub.id}
            subscription={sub}
            onEdit={onEdit}
            onDelete={handleDelete}
            onTogglePause={onTogglePause}
          />
        ))}
      </div>
    </div>
  )
}
