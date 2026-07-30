import { useEffect, useState } from 'react'
import { useSubscriptions } from './hooks/useSubscriptions.js'
import SubscriptionForm from './components/SubscriptionForm.jsx'
import SubscriptionList from './components/SubscriptionList.jsx'
import DashboardSummary from './components/DashboardSummary.jsx'
import ImportExport from './components/ImportExport.jsx'

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('subtrack-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('subtrack-theme', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, setDark]
}

export default function App() {
  const {
    subscriptions,
    loading,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    togglePause,
    importSubscriptions,
  } = useSubscriptions()

  const [dark, setDark] = useDarkMode()
  const [formOpen, setFormOpen] = useState(false)
  const [editingSub, setEditingSub] = useState(null)

  const openAddForm = () => {
    setEditingSub(null)
    setFormOpen(true)
  }

  const openEditForm = (sub) => {
    setEditingSub(sub)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingSub(null)
  }

  const handleSubmit = async (data) => {
    if (editingSub) {
      await updateSubscription(editingSub.id, data)
    } else {
      await addSubscription(data)
    }
    closeForm()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">SubTrack</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((d) => !d)}
              aria-label="Basculer le mode sombre"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              {dark ? '☀️ Clair' : '🌙 Sombre'}
            </button>
            <button
              onClick={openAddForm}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Ajouter
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
        ) : (
          <>
            <DashboardSummary subscriptions={subscriptions} />

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Abonnements</h2>
              <ImportExport subscriptions={subscriptions} onImport={importSubscriptions} />
            </div>

            <SubscriptionList
              subscriptions={subscriptions}
              onEdit={openEditForm}
              onDelete={deleteSubscription}
              onTogglePause={togglePause}
            />
          </>
        )}
      </main>

      {formOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold">
              {editingSub ? 'Modifier l’abonnement' : 'Nouvel abonnement'}
            </h2>
            <SubscriptionForm initialData={editingSub} onSubmit={handleSubmit} onCancel={closeForm} />
          </div>
        </div>
      )}

      <footer className="mx-auto max-w-4xl px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Toutes vos données restent dans votre navigateur. Aucune connexion réseau, aucun compte requis.
      </footer>
    </div>
  )
}
