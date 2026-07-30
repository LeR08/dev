import { useState } from 'react'
import { FREQUENCIES, DEFAULT_CATEGORIES, CURRENCIES } from '../utils/constants'

const emptyForm = {
  name: '',
  price: '',
  currency: 'EUR',
  frequency: 'monthly',
  nextChargeDate: new Date().toISOString().slice(0, 10),
  category: DEFAULT_CATEGORIES[0],
}

export default function SubscriptionForm({ initialData, onSubmit, onCancel, multiCurrency = true }) {
  const [form, setForm] = useState(() => (initialData ? { ...emptyForm, ...initialData } : emptyForm))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const price = Number(form.price)
    if (!form.name.trim()) {
      setError('Le nom est requis.')
      return
    }
    if (!(price > 0)) {
      setError('Le prix doit être un nombre positif.')
      return
    }
    if (!form.nextChargeDate) {
      setError('La date du prochain prélèvement est requise.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onSubmit({ ...form, price, currency: multiCurrency ? form.currency : 'EUR' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nom</label>
        <input
          type="text"
          value={form.name}
          onChange={handleChange('name')}
          placeholder="Netflix, Spotify, Salle de sport…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Prix</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.price}
            onChange={handleChange('price')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Devise</label>
          {multiCurrency ? (
            <select
              value={form.currency}
              onChange={handleChange('currency')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <div>
              <input
                type="text"
                value="EUR"
                disabled
                className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
              />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Multi-devises disponible en palier Pro.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fréquence</label>
          <select
            value={form.frequency}
            onChange={handleChange('frequency')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Prochain prélèvement
          </label>
          <input
            type="date"
            value={form.nextChargeDate}
            onChange={handleChange('nextChargeDate')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Catégorie</label>
        <input
          list="category-options"
          type="text"
          value={form.category}
          onChange={handleChange('category')}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <datalist id="category-options">
          {DEFAULT_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {initialData ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </form>
  )
}
