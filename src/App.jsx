import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext.jsx'
import { useSubscriptions } from './hooks/useSubscriptions.js'
import { computeTotalsByCurrency, computeByCategory } from './utils/calculations.js'
import AuthForm from './components/AuthForm.jsx'
import ChangePasswordForm from './components/ChangePasswordForm.jsx'
import SubscriptionForm from './components/SubscriptionForm.jsx'
import SubscriptionList from './components/SubscriptionList.jsx'
import DashboardSummary from './components/DashboardSummary.jsx'
import ImportExport from './components/ImportExport.jsx'
import AccountPage from './pages/AccountPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

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

const TIER_LABELS = { free: 'Free', basic: 'Basic', pro: 'Pro' }

export default function App() {
  const { user, loading: authLoading, logout } = useAuth()
  const [dark, setDark] = useDarkMode()

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 dark:bg-slate-950">
        <AuthForm />
      </div>
    )
  }

  if (user.mustChangePassword) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 dark:bg-slate-950">
        <div className="mx-auto mt-16 w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="mb-1 text-xl font-bold text-slate-900 dark:text-slate-100">Changement de mot de passe requis</h1>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Ce compte a été créé avec un mot de passe temporaire. Choisissez-en un nouveau pour continuer.
          </p>
          <ChangePasswordForm mandatory />
        </div>
      </div>
    )
  }

  return <AuthenticatedApp user={user} dark={dark} setDark={setDark} logout={logout} />
}

function AuthenticatedApp({ user, dark, setDark, logout }) {
  const {
    subscriptions,
    loading,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    togglePause,
  } = useSubscriptions()

  const [view, setView] = useState('app')
  const [formOpen, setFormOpen] = useState(false)
  const [editingSub, setEditingSub] = useState(null)

  const multiCurrency = user.tier === 'pro'
  const chartUnlocked = user.tier !== 'free'

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

  const summary = {
    totalsByCurrency: computeTotalsByCurrency(subscriptions),
    byCategory: computeByCategory(subscriptions),
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-4">
          <button onClick={() => setView('app')} className="text-xl font-bold">
            SubTrack
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
              {TIER_LABELS[user.tier]}
            </span>
            <button
              onClick={() => setView('account')}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              Mon compte
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => setView('admin')}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                Admin
              </button>
            )}
            <button
              onClick={() => setDark((d) => !d)}
              aria-label="Basculer le mode sombre"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {view === 'account' && <AccountPage onBack={() => setView('app')} />}
      {view === 'admin' && user.role === 'admin' && <AdminPage onBack={() => setView('app')} />}

      {view === 'app' && (
        <>
          <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
            ) : (
              <>
                <DashboardSummary subscriptions={subscriptions} chartUnlocked={chartUnlocked} />

                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Abonnements</h2>
                  <button
                    onClick={openAddForm}
                    className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    + Ajouter
                  </button>
                </div>

                <ImportExport
                  subscriptions={subscriptions}
                  onAddSubscription={addSubscription}
                  onTogglePause={togglePause}
                  advancedExport={user.tier === 'pro'}
                  summary={summary}
                />

                <SubscriptionList
                  subscriptions={subscriptions}
                  onEdit={openEditForm}
                  onDelete={deleteSubscription}
                  onTogglePause={togglePause}
                />
              </>
            )}
          </main>

          <footer className="mx-auto max-w-4xl px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            Bêta-test local — vos abonnements sont stockés sur le serveur SubTrack de ce compte.
          </footer>
        </>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold">
              {editingSub ? 'Modifier l’abonnement' : 'Nouvel abonnement'}
            </h2>
            <SubscriptionForm
              initialData={editingSub}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              multiCurrency={multiCurrency}
            />
          </div>
        </div>
      )}
    </div>
  )
}
