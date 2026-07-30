import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { rollForwardToFuture } from '../utils/calculations'

function toIsoDate(date) {
  return date.toISOString().slice(0, 10)
}

export function useSubscriptions() {
  const subscriptions = useLiveQuery(async () => {
    const all = await db.subscriptions.toArray()
    for (const sub of all) {
      const { date, advanced } = rollForwardToFuture(sub.nextChargeDate, sub.frequency)
      if (advanced) {
        const iso = toIsoDate(date)
        await db.subscriptions.update(sub.id, { nextChargeDate: iso })
        sub.nextChargeDate = iso
      }
    }
    return all
  }, [])

  const addSubscription = async (data) => {
    if (!(Number(data.price) > 0)) {
      throw new Error('Le prix doit être positif')
    }
    return db.subscriptions.add({
      name: data.name,
      price: Number(data.price),
      currency: data.currency || 'EUR',
      frequency: data.frequency,
      nextChargeDate: data.nextChargeDate,
      category: data.category,
      isPaused: false,
      createdAt: new Date().toISOString(),
    })
  }

  const updateSubscription = async (id, changes) => {
    if (changes.price !== undefined && !(Number(changes.price) > 0)) {
      throw new Error('Le prix doit être positif')
    }
    const payload = changes.price !== undefined ? { ...changes, price: Number(changes.price) } : changes
    return db.subscriptions.update(id, payload)
  }

  const deleteSubscription = async (id) => db.subscriptions.delete(id)

  const togglePause = async (id, isPaused) => db.subscriptions.update(id, { isPaused })

  const importSubscriptions = async (items) => {
    if (!Array.isArray(items)) throw new Error('Format JSON invalide')
    await db.subscriptions.clear()
    await db.subscriptions.bulkAdd(items)
  }

  return {
    subscriptions: subscriptions ?? [],
    loading: subscriptions === undefined,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    togglePause,
    importSubscriptions,
  }
}
