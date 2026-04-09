import { DEFAULT_SETTINGS, type Settings, type Transcript } from './types'

const STORAGE_KEY_PREFIX = 'fc_'
const CRYPTO_KEY_STORAGE_KEY = `${STORAGE_KEY_PREFIX}crypto_key`
const SETTINGS_STORAGE_KEY = `${STORAGE_KEY_PREFIX}settings`

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// --- AES-GCM encryption ---

async function getOrCreateCryptoKey(): Promise<CryptoKey> {
  const stored = await chrome.storage.local.get(CRYPTO_KEY_STORAGE_KEY)
  if (stored[CRYPTO_KEY_STORAGE_KEY]) {
    const raw = Uint8Array.from(
      atob(stored[CRYPTO_KEY_STORAGE_KEY] as string),
      c => c.charCodeAt(0)
    )
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const exported = await crypto.subtle.exportKey('raw', key)
  const b64 = uint8ToBase64(new Uint8Array(exported))
  await chrome.storage.local.set({ [CRYPTO_KEY_STORAGE_KEY]: b64 })
  return key
}

export async function encryptValue(plaintext: string): Promise<string> {
  const key = await getOrCreateCryptoKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  return uint8ToBase64(combined)
}

export async function decryptValue(ciphertext: string): Promise<string> {
  const key = await getOrCreateCryptoKey()
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return new TextDecoder().decode(decrypted)
}

// --- Settings ---

interface StoredSettings {
  claudeApiKeyEnc?: string
  openaiApiKeyEnc?: string
  openrouterApiKeyEnc?: string
  claudeModel?: string
  openaiModel?: string
  openrouterModel?: string
  defaultProvider?: string
  defaultLanguage?: string
}

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY)
  const raw = (stored[SETTINGS_STORAGE_KEY] as StoredSettings) ?? {}

  const claudeApiKey = raw.claudeApiKeyEnc ? await decryptValue(raw.claudeApiKeyEnc) : ''
  const openaiApiKey = raw.openaiApiKeyEnc ? await decryptValue(raw.openaiApiKeyEnc) : ''
  const openrouterApiKey = raw.openrouterApiKeyEnc ? await decryptValue(raw.openrouterApiKeyEnc) : ''

  return {
    claudeApiKey,
    openaiApiKey,
    openrouterApiKey,
    claudeModel: raw.claudeModel ?? DEFAULT_SETTINGS.claudeModel,
    openaiModel: raw.openaiModel ?? DEFAULT_SETTINGS.openaiModel,
    openrouterModel: raw.openrouterModel ?? DEFAULT_SETTINGS.openrouterModel,
    defaultProvider: (raw.defaultProvider as Settings['defaultProvider']) ?? DEFAULT_SETTINGS.defaultProvider,
    defaultLanguage: (raw.defaultLanguage as Settings['defaultLanguage']) ?? DEFAULT_SETTINGS.defaultLanguage,
  }
}

export async function saveSettings(partial: Partial<Settings>): Promise<void> {
  const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY)
  const existing = (stored[SETTINGS_STORAGE_KEY] as StoredSettings) ?? {}

  const updated: StoredSettings = { ...existing }

  if (partial.claudeApiKey !== undefined) {
    updated.claudeApiKeyEnc = partial.claudeApiKey ? await encryptValue(partial.claudeApiKey) : ''
  }
  if (partial.openaiApiKey !== undefined) {
    updated.openaiApiKeyEnc = partial.openaiApiKey ? await encryptValue(partial.openaiApiKey) : ''
  }
  if (partial.openrouterApiKey !== undefined) {
    updated.openrouterApiKeyEnc = partial.openrouterApiKey ? await encryptValue(partial.openrouterApiKey) : ''
  }
  if (partial.claudeModel !== undefined) updated.claudeModel = partial.claudeModel
  if (partial.openaiModel !== undefined) updated.openaiModel = partial.openaiModel
  if (partial.openrouterModel !== undefined) updated.openrouterModel = partial.openrouterModel
  if (partial.defaultProvider !== undefined) updated.defaultProvider = partial.defaultProvider
  if (partial.defaultLanguage !== undefined) updated.defaultLanguage = partial.defaultLanguage

  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: updated })
}

// --- Transcript session cache ---

export async function getCachedTranscript(videoId: string): Promise<Transcript | null> {
  const key = `${STORAGE_KEY_PREFIX}transcript_${videoId}`
  const stored = await chrome.storage.session.get(key)
  return (stored[key] as Transcript) ?? null
}

export async function setCachedTranscript(videoId: string, transcript: Transcript): Promise<void> {
  const key = `${STORAGE_KEY_PREFIX}transcript_${videoId}`
  await chrome.storage.session.set({ [key]: transcript })
}
