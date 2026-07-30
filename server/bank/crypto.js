import crypto from 'node:crypto'

const ALGO = 'aes-256-gcm'

function getKey() {
  const raw = process.env.BANK_TOKEN_ENCRYPTION_KEY
  if (!raw) throw new Error('BANK_TOKEN_ENCRYPTION_KEY manquante')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('BANK_TOKEN_ENCRYPTION_KEY doit être une clé de 32 octets encodée en base64')
  }
  return key
}

export function bankEncryptionConfigured() {
  if (!process.env.BANK_TOKEN_ENCRYPTION_KEY) return false
  try {
    getKey()
    return true
  } catch {
    return false
  }
}

export function encryptJson(payload) {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decryptJson(blob) {
  const key = getKey()
  const raw = Buffer.from(blob, 'base64')
  const iv = raw.subarray(0, 12)
  const authTag = raw.subarray(12, 28)
  const encrypted = raw.subarray(28)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return JSON.parse(decrypted.toString('utf8'))
}
