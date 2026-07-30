import Dexie from 'dexie'

export const db = new Dexie('subtrack')

db.version(1).stores({
  subscriptions: '++id, name, price, currency, frequency, nextChargeDate, category, isPaused, createdAt',
})

export default db
