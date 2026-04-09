import React, { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../shared/storage'
import { t } from '../shared/i18n'
import type { Settings } from '../shared/types'

const CLAUDE_MODELS = ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001']
const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']

export function Options() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    await saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) return <div style={{ padding: 32 }}>Loading…</div>

  return (
    <div style={{ maxWidth: 480, margin: '32px auto', padding: '0 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginBottom: 24 }}>Fact Checker — {t('settings')}</h2>
      <form onSubmit={handleSave}>
        <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <legend style={{ fontWeight: 600, padding: '0 8px' }}>Claude (Anthropic)</legend>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
            {t('claudeApiKey')}
            <input
              aria-label={t('claudeApiKey')}
              type="password"
              value={settings.claudeApiKey}
              onChange={e => setSettings({ ...settings, claudeApiKey: e.target.value })}
              placeholder="sk-ant-..."
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
            />
          </label>
          <label style={{ display: 'block', fontSize: 13 }}>
            {t('model')}
            <select
              value={settings.claudeModel}
              onChange={e => setSettings({ ...settings, claudeModel: e.target.value })}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
            >
              {CLAUDE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </fieldset>

        <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <legend style={{ fontWeight: 600, padding: '0 8px' }}>OpenAI</legend>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
            {t('openaiApiKey')}
            <input
              aria-label={t('openaiApiKey')}
              type="password"
              value={settings.openaiApiKey}
              onChange={e => setSettings({ ...settings, openaiApiKey: e.target.value })}
              placeholder="sk-..."
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
            />
          </label>
          <label style={{ display: 'block', fontSize: 13 }}>
            {t('model')}
            <select
              value={settings.openaiModel}
              onChange={e => setSettings({ ...settings, openaiModel: e.target.value })}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
            >
              {OPENAI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </fieldset>

        <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <legend style={{ fontWeight: 600, padding: '0 8px' }}>Preferences</legend>
          <label style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
            {t('defaultProvider')}
            <select
              value={settings.defaultProvider}
              onChange={e => setSettings({ ...settings, defaultProvider: e.target.value as 'claude' | 'openai' })}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
            >
              <option value="claude">Claude (Anthropic)</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>
          <label style={{ display: 'block', fontSize: 13 }}>
            {t('defaultLanguage')}
            <select
              value={settings.defaultLanguage}
              onChange={e => setSettings({ ...settings, defaultLanguage: e.target.value as 'zh' | 'en' | 'auto' })}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="auto">Follow video language</option>
            </select>
          </label>
        </fieldset>

        <button
          type="submit"
          aria-label={t('saveSettings')}
          style={{
            padding: '10px 24px', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {t('saveSettings')}
        </button>
        {saved && (
          <span style={{ marginLeft: 12, color: '#16a34a', fontSize: 13 }}>
            ✓ {t('settingsSaved')}
          </span>
        )}
      </form>
    </div>
  )
}
