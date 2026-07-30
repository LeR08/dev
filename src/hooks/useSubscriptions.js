import { useCallback, useEffect, useState } from 'react'
import { api } from '../utils/api.js'

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setSubscriptions(await api.get('/subscriptions'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addSubscription = async (data) => {
    const created = await api.post('/subscriptions', data)
    setSubscriptions((prev) => [...prev, created])
    return created
  }

  const updateSubscription = async (id, changes) => {
    const updated = await api.put(`/subscriptions/${id}`, changes)
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? updated : s)))
    return updated
  }

  const deleteSubscription = async (id) => {
    await api.delete(`/subscriptions/${id}`)
    setSubscriptions((prev) => prev.filter((s) => s.id !== id))
  }

  const togglePause = async (id, isPaused) => {
    const updated = await api.patch(`/subscriptions/${id}/pause`, { isPaused })
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }

  return {
    subscriptions,
    loading,
    refresh,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    togglePause,
  }
}
