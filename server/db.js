import Database from 'better-sqlite3'
import bcrypt from 'bcrypt'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'data')
fs.mkdirSync(dataDir, { recursive: true })

export const db = new Database(path.join(dataDir, 'subtrack.sqlite'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    tier TEXT NOT NULL DEFAULT 'free',
    discordWebhookUrl TEXT,
    isActive INTEGER NOT NULL DEFAULT 1,
    mustChangePassword INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    frequency TEXT NOT NULL,
    nextChargeDate TEXT NOT NULL,
    category TEXT,
    isPaused INTEGER NOT NULL DEFAULT 0,
    lastAlertSentFor TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_subscriptions_userId ON subscriptions(userId);

  CREATE TABLE IF NOT EXISTS ai_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    yearMonth TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(userId, yearMonth)
  );

  -- "encryptedRequisition" holds the GoCardless requisition id + linked account ids
  -- (AES-256-GCM, see server/bank/crypto.js) — these, combined with our platform
  -- secret, are what grants read access to the user's bank transactions, so they're
  -- treated as the sensitive credential here (GoCardless Bank Account Data has no
  -- long-lived per-user bearer token the way classic OAuth does).
  CREATE TABLE IF NOT EXISTS bank_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'gocardless',
    institutionId TEXT NOT NULL,
    reference TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    encryptedRequisition TEXT,
    expiresAt TEXT,
    createdAt TEXT NOT NULL,
    linkedAt TEXT,
    revokedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS bank_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bankConnectionId INTEGER REFERENCES bank_connections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    frequency TEXT NOT NULL,
    nextChargeDate TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_bank_connections_userId ON bank_connections(userId);
  CREATE INDEX IF NOT EXISTS idx_bank_suggestions_userId ON bank_suggestions(userId);
`)

const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL || 'admin@subtrack.local'
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'ChangeMe123!'

const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin')
if (!adminExists) {
  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10)
  db.prepare(
    `INSERT INTO users (email, passwordHash, role, tier, isActive, mustChangePassword, createdAt)
     VALUES (?, ?, 'admin', 'pro', 1, 1, ?)`,
  ).run(ADMIN_EMAIL, passwordHash, new Date().toISOString())
  console.log('[seed] Compte admin initial créé. Identifiants par défaut : voir .env.example / CLAUDE.md.')
}

export default db
