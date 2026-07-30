import { useState } from 'react'
import { api } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function ChangePasswordForm({ mandatory = false, onDone }) {
  const { refreshUser } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.patch('/user/me', mandatory ? { newPassword } : { currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      await refreshUser()
      onDone?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}
      {!mandatory && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Mot de passe actuel</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nouveau mot de passe</label>
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Mettre à jour le mot de passe
      </button>
    </form>
  )
}
