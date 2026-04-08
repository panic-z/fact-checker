// tests/shared/i18n.test.ts
import { t, setLanguage, getLanguage } from '../../src/shared/i18n'

describe('i18n', () => {
  it('returns Chinese string by default', () => {
    setLanguage('zh')
    expect(t('startAnalysis')).toBe('开始分析')
  })

  it('returns English string when language is en', () => {
    setLanguage('en')
    expect(t('startAnalysis')).toBe('Start Analysis')
  })

  it('getLanguage returns current language', () => {
    setLanguage('zh')
    expect(getLanguage()).toBe('zh')
  })

  it('falls back to key name if string is missing', () => {
    setLanguage('en')
    // @ts-expect-error testing missing key
    expect(t('nonExistentKey')).toBe('nonExistentKey')
  })

  it('supports all required keys in both languages', () => {
    const keys: string[] = [
      'startAnalysis', 'summary', 'factCheck', 'loading',
      'noSubtitles', 'whisperPrompt', 'whisperConfirm', 'whisperCancel',
      'copyResult', 'copied', 'settings', 'openPanel', 'closePanel',
      'noIssuesFound', 'errorInvalidKey', 'errorQuotaExceeded', 'errorNetwork',
      'saveSettings', 'settingsSaved', 'claudeApiKey', 'openaiApiKey',
      'defaultProvider', 'defaultLanguage', 'model',
    ]
    setLanguage('zh')
    keys.forEach(k => expect(t(k as never)).not.toBe(''))
    setLanguage('en')
    keys.forEach(k => expect(t(k as never)).not.toBe(''))
  })
})
