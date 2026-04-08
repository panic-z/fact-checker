// tests/shared/storage.test.ts
import { saveSettings, getSettings, encryptValue, decryptValue } from '../../src/shared/storage'
import type { Settings } from '../../src/shared/types'

describe('storage', () => {
  describe('encryption', () => {
    it('encrypts and decrypts a value round-trip', async () => {
      const original = 'sk-ant-super-secret-key'
      const encrypted = await encryptValue(original)
      expect(encrypted).not.toBe(original)
      const decrypted = await decryptValue(encrypted)
      expect(decrypted).toBe(original)
    })

    it('produces different ciphertext each time (random IV)', async () => {
      const val = 'same-value'
      const enc1 = await encryptValue(val)
      const enc2 = await encryptValue(val)
      expect(enc1).not.toBe(enc2)
    })
  })

  describe('settings', () => {
    it('returns default settings when storage is empty', async () => {
      const settings = await getSettings()
      expect(settings.claudeModel).toBe('claude-sonnet-4-6')
      expect(settings.openaiModel).toBe('gpt-4o')
      expect(settings.defaultProvider).toBe('claude')
      expect(settings.defaultLanguage).toBe('zh')
      expect(settings.claudeApiKey).toBe('')
      expect(settings.openaiApiKey).toBe('')
    })

    it('saves and retrieves settings with encrypted API keys', async () => {
      const partial: Partial<Settings> = {
        claudeApiKey: 'sk-ant-mykey',
        openaiApiKey: 'sk-openai-mykey',
        defaultProvider: 'openai',
      }
      await saveSettings(partial)
      const loaded = await getSettings()
      expect(loaded.claudeApiKey).toBe('sk-ant-mykey')
      expect(loaded.openaiApiKey).toBe('sk-openai-mykey')
      expect(loaded.defaultProvider).toBe('openai')
    })

    it('merges partial settings with existing values', async () => {
      await saveSettings({ claudeModel: 'claude-opus-4-6' })
      await saveSettings({ openaiModel: 'gpt-4o-mini' })
      const loaded = await getSettings()
      expect(loaded.claudeModel).toBe('claude-opus-4-6')
      expect(loaded.openaiModel).toBe('gpt-4o-mini')
    })
  })
})
