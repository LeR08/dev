import { useRef, useState } from 'react'

export default function ImportExport({ subscriptions, onImport }) {
  const fileInputRef = useRef(null)
  const [message, setMessage] = useState('')

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(subscriptions, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subtrack-export-${new Date().toISOString().slice(0, 10)}.json`
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
      const data = JSON.parse(text)
      if (!Array.isArray(data)) throw new Error('Le fichier doit contenir un tableau JSON.')
      if (subscriptions.length > 0) {
        const confirmed = window.confirm(
          "L'import va remplacer tous les abonnements existants par le contenu du fichier. Continuer ?",
        )
        if (!confirmed) {
          e.target.value = ''
          return
        }
      }
      await onImport(data)
      setMessage(`${data.length} abonnement(s) importé(s) avec succès.`)
    } catch (err) {
      setMessage(`Erreur d'import : ${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={handleExport}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Exporter (JSON)
      </button>
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
