import { zh, type I18nKey } from './zh'
import { en } from './en'

type SupportedLanguage = 'zh' | 'en'

let currentLanguage: SupportedLanguage = 'zh'

export function setLanguage(lang: SupportedLanguage): void {
  currentLanguage = lang
}

export function getLanguage(): SupportedLanguage {
  return currentLanguage
}

export function t(key: I18nKey): string {
  const strings = currentLanguage === 'zh' ? zh : en
  return (strings as Record<string, string>)[key] ?? key
}
