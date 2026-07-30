import { useRef, useState } from 'react'

export default function ImportExport({ subscriptions, onAddSubscription, onTogglePause, advancedExport = false, summary }) {
  const fileInputRef = useRef(null)
  const [message, setMessage] = useState('')

  const handleExport = (advanced) => {
    const cleanSubs = subscriptions.map(({ name, price, currency, frequency, nextChargeDate, category, isPaused }) => ({
      name,
      price,
      currency,
      frequency,
      nextChargeDate,
      category,
      isPaused,
    }))
    const payload = advanced ? { exportedAt: new Date().toISOString(), summary, subscriptions: cleanSubs } : cleanSubs
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subtrack-export${advanced ? '-avance' : ''}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const items = Array.isArray(parsed) ? parsed : parsed.subscriptions
      if (!Array.isArray(items)) throw new Error('Le fichier doit contenir un tableau JSON.')

      let ok = 0
      let failed = 0
      for (const item of items) {
        try {
          const created = await onAddSubscription({
            name: item.name,
            price: item.price,
            currency: item.currency,
            frequency: item.frequency,
            nextChargeDate: item.nextChargeDate,
            category: item.category,
          })
          if (item.isPaused && onTogglePause) {
            await onTogglePause(created.id, true)
          }
          ok += 1
        } catch {
          failed += 1
        }
      }
      setMessage(
        `${ok} abonnement(s) importé(s).` + (failed > 0 ? ` ${failed} échec(s) (ex: limite du palier atteinte).` : ''),
      )
    } catch (err) {
      setMessage(`Erreur d'import : ${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => handleExport(false)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Exporter (JSON)
      </button>
      {advancedExport && (
        <button
          onClick={() => handleExport(true)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Exporter (avancé, Pro)
        </button>
      )}
      <button
        onClick={handleImportClick}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Importer (JSON)
      </button>
      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
      {message && <span className="text-xs text-slate-500 dark:text-slate-400">{message}</span>}
    </div>
  )
}
