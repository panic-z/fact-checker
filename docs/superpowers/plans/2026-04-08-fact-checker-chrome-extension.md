# Fact Checker Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension that summarizes YouTube/Bilibili videos and checks for factual/logical errors using the user's Claude or OpenAI API key.

**Architecture:** Pure frontend Chrome Extension (Manifest V3). Content scripts detect video pages, extract subtitle URLs from the page DOM, and inject a React sidebar. The Background Service Worker manages encrypted API key storage and calls Claude/OpenAI APIs, streaming results back to content scripts via `chrome.tabs.sendMessage`.

**Tech Stack:** TypeScript 5, React 18, Vite 5, @crxjs/vite-plugin@beta, Jest 29, @testing-library/react, Web Crypto API (AES-GCM)

---

## File Map

| File | Responsibility |
|------|----------------|
| `manifest.json` | Extension manifest (MV3), declares all entry points |
| `vite.config.ts` | Build config with CRXJS plugin |
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `jest.config.ts` | Jest configuration |
| `tests/setup.ts` | Chrome API mocks + jest-dom matchers |
| `tests/__mocks__/styleMock.ts` | CSS module mock |
| `src/shared/types.ts` | All shared TypeScript interfaces |
| `src/shared/messages.ts` | Chrome message type union |
| `src/shared/storage.ts` | chrome.storage wrapper + AES-GCM encryption |
| `src/shared/i18n/zh.ts` | Chinese UI strings |
| `src/shared/i18n/en.ts` | English UI strings |
| `src/shared/i18n/index.ts` | Language lookup helper |
| `src/services/transcript/youtube.ts` | Parse page DOM → fetch YouTube subtitles |
| `src/services/transcript/bilibili.ts` | Parse page DOM → fetch Bilibili subtitles |
| `src/services/transcript/index.ts` | Platform routing, session caching, Whisper prompt |
| `src/services/ai/prompts.ts` | Build summary and fact-check prompt strings |
| `src/services/ai/claude.ts` | Claude API streaming client |
| `src/services/ai/openai.ts` | OpenAI API streaming client |
| `src/services/ai/index.ts` | Route to Claude/OpenAI based on settings |
| `src/services/whisper/index.ts` | OpenAI Whisper API client |
| `src/background/index.ts` | Service Worker: message routing, API calls |
| `src/content/index.ts` | Content script: detect video, inject sidebar, relay messages |
| `src/sidebar/Sidebar.tsx` | Sidebar root: header, tabs, language toggle |
| `src/sidebar/SummaryTab.tsx` | Summary tab: trigger + stream results |
| `src/sidebar/FactCheckTab.tsx` | Fact check tab: trigger + stream results |
| `src/sidebar/index.tsx` | Sidebar React mount entry |
| `src/popup/Popup.tsx` | Toolbar popup: open sidebar button + settings link |
| `src/popup/index.tsx` | Popup React mount entry |
| `src/popup/index.html` | Popup HTML shell |
| `src/options/Options.tsx` | Settings page: API keys, models, language |
| `src/options/index.tsx` | Options React mount entry |
| `src/options/index.html` | Options HTML shell |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `jest.config.ts`
- Create: `vite.config.ts`
- Create: `manifest.json`
- Create: `src/popup/index.html`
- Create: `src/options/index.html`
- Create: `tests/__mocks__/styleMock.ts`

- [ ] **Step 1: Initialize project and install dependencies**

```bash
cd /Users/wubaiyu/DEV/side-projects/fact-checker
npm init -y
npm install react react-dom
npm install -D typescript @types/react @types/react-dom @types/chrome \
  vite @vitejs/plugin-react "@crxjs/vite-plugin@beta" \
  jest @types/jest ts-jest jest-environment-jsdom \
  "@testing-library/react" "@testing-library/jest-dom" "@testing-library/user-event"
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 2: Write package.json**

```json
{
  "name": "fact-checker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.32",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/chrome": "^0.0.300",
    "@types/jest": "^29.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "ts-jest": "^29.2.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "types": ["chrome"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Write jest.config.ts**

```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/tests/__mocks__/styleMock.ts',
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
}

export default config
```

- [ ] **Step 5: Write manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Fact Checker",
  "version": "1.0.0",
  "description": "Summarize and fact-check YouTube/Bilibili videos",
  "permissions": ["storage", "tabs"],
  "host_permissions": [
    "*://www.youtube.com/*",
    "*://www.bilibili.com/*",
    "*://api.anthropic.com/*",
    "*://api.openai.com/*",
    "*://timedtext.youtube.com/*",
    "*://api.bilibili.com/*"
  ],
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "*://www.youtube.com/watch*",
        "*://www.bilibili.com/video/*"
      ],
      "js": ["src/content/index.ts"],
      "css": ["src/content/sidebar.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_page": "src/options/index.html",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 6: Write vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
```

- [ ] **Step 7: Write src/popup/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fact Checker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Write src/options/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fact Checker Settings</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Write tests/__mocks__/styleMock.ts**

```typescript
export default {}
```

- [ ] **Step 10: Create placeholder icon directory**

```bash
mkdir -p public/icons
# Create 1×1 pixel placeholder PNGs (replace with real icons later)
node -e "
const fs = require('fs');
// Minimal valid 1x1 PNG bytes
const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108020000009001' + '2e00000000c4944415478016360f8cfc00000000200019721c2300000000049454e44ae426082', 'hex');
['16','48','128'].forEach(s => fs.writeFileSync('public/icons/icon' + s + '.png', png));
"
```

- [ ] **Step 11: Verify the build runs without error**

```bash
npm run build
```

Expected: `dist/` directory created, no TypeScript or build errors. (Content may be minimal since source files don't exist yet — that's fine.)

- [ ] **Step 12: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Chrome extension project with Vite + CRXJS"
```

---

## Task 2: Shared Types and Messages

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/messages.ts`
- Test: `tests/shared/types.test.ts`

- [ ] **Step 1: Write the failing type test**

```typescript
// tests/shared/types.test.ts
import '@testing-library/jest-dom'
import type { Settings, Transcript, TranscriptSegment, Language, AIProvider, AnalysisType, AnalysisStatus } from '../../src/shared/types'

describe('shared types', () => {
  it('Settings has all required fields with correct types', () => {
    const settings: Settings = {
      claudeApiKey: 'sk-ant-test',
      claudeModel: 'claude-sonnet-4-6',
      openaiApiKey: 'sk-test',
      openaiModel: 'gpt-4o',
      defaultProvider: 'claude',
      defaultLanguage: 'zh',
    }
    expect(settings.claudeModel).toBe('claude-sonnet-4-6')
  })

  it('Transcript has correct structure', () => {
    const segment: TranscriptSegment = { text: 'Hello', startMs: 0, durationMs: 1000 }
    const transcript: Transcript = {
      videoId: 'abc123',
      platform: 'youtube',
      language: 'en',
      segments: [segment],
      fullText: 'Hello',
    }
    expect(transcript.segments).toHaveLength(1)
  })

  it('type unions are correct', () => {
    const lang: Language = 'auto'
    const provider: AIProvider = 'openai'
    const analysisType: AnalysisType = 'factcheck'
    const status: AnalysisStatus = 'streaming'
    expect(lang).toBe('auto')
    expect(provider).toBe('openai')
    expect(analysisType).toBe('factcheck')
    expect(status).toBe('streaming')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/shared/types.test.ts
```

Expected: FAIL — `Cannot find module '../../src/shared/types'`

- [ ] **Step 3: Write src/shared/types.ts**

```typescript
export type Language = 'zh' | 'en' | 'auto'
export type AIProvider = 'claude' | 'openai'
export type AnalysisType = 'summary' | 'factcheck'
export type AnalysisStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export interface Settings {
  claudeApiKey: string
  claudeModel: string
  openaiApiKey: string
  openaiModel: string
  defaultProvider: AIProvider
  defaultLanguage: Language
}

export const DEFAULT_SETTINGS: Settings = {
  claudeApiKey: '',
  claudeModel: 'claude-sonnet-4-6',
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  defaultProvider: 'claude',
  defaultLanguage: 'zh',
}

export interface TranscriptSegment {
  text: string
  startMs: number
  durationMs: number
}

export interface Transcript {
  videoId: string
  platform: 'youtube' | 'bilibili'
  language: string
  segments: TranscriptSegment[]
  fullText: string
}
```

- [ ] **Step 4: Write src/shared/messages.ts**

```typescript
import type { AnalysisType, Language, Transcript } from './types'

export type BackgroundMessage =
  | { type: 'ANALYZE'; videoId: string; analysisType: AnalysisType; language: Language; transcript: Transcript }

export type ContentMessage =
  | { type: 'ANALYSIS_CHUNK'; chunk: string; analysisType: AnalysisType }
  | { type: 'ANALYSIS_DONE'; analysisType: AnalysisType }
  | { type: 'ANALYSIS_ERROR'; error: string; analysisType: AnalysisType }
  | { type: 'TOGGLE_SIDEBAR' }
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- tests/shared/types.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/types.ts src/shared/messages.ts tests/shared/types.test.ts
git commit -m "feat: add shared types and message type definitions"
```

---

## Task 3: i18n System

**Files:**
- Create: `src/shared/i18n/zh.ts`
- Create: `src/shared/i18n/en.ts`
- Create: `src/shared/i18n/index.ts`
- Test: `tests/shared/i18n.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/shared/i18n.test.ts
```

Expected: FAIL — `Cannot find module '../../src/shared/i18n'`

- [ ] **Step 3: Write src/shared/i18n/zh.ts**

```typescript
export const zh = {
  startAnalysis: '开始分析',
  summary: '视频总结',
  factCheck: '事实核查',
  loading: '分析中...',
  noSubtitles: '该视频暂无字幕',
  whisperPrompt: '该视频暂无字幕，是否使用 Whisper 语音识别？（将消耗你的 OpenAI API 额度）',
  whisperConfirm: '使用 Whisper',
  whisperCancel: '取消',
  copyResult: '复制结果',
  copied: '已复制',
  settings: '设置',
  openPanel: '打开分析面板',
  closePanel: '关闭',
  noIssuesFound: '未发现明显问题',
  errorInvalidKey: 'API Key 无效，请在设置中检查',
  errorQuotaExceeded: 'API 额度不足，请检查账户余额',
  errorNetwork: '网络请求失败，请重试',
  saveSettings: '保存设置',
  settingsSaved: '设置已保存',
  claudeApiKey: 'Claude API Key',
  openaiApiKey: 'OpenAI API Key',
  defaultProvider: '默认 AI 提供商',
  defaultLanguage: '默认输出语言',
  model: '模型',
  notVideoPage: '请在 YouTube 或 Bilibili 视频页使用',
  language: '语言',
} as const

export type I18nKey = keyof typeof zh
```

- [ ] **Step 4: Write src/shared/i18n/en.ts**

```typescript
import type { I18nKey } from './zh'

export const en: Record<I18nKey, string> = {
  startAnalysis: 'Start Analysis',
  summary: 'Summary',
  factCheck: 'Fact Check',
  loading: 'Analyzing...',
  noSubtitles: 'No subtitles available for this video',
  whisperPrompt: 'No subtitles found. Use Whisper speech recognition? (This will consume your OpenAI API quota.)',
  whisperConfirm: 'Use Whisper',
  whisperCancel: 'Cancel',
  copyResult: 'Copy Result',
  copied: 'Copied!',
  settings: 'Settings',
  openPanel: 'Open Analysis Panel',
  closePanel: 'Close',
  noIssuesFound: 'No significant issues detected.',
  errorInvalidKey: 'Invalid API key. Please check your settings.',
  errorQuotaExceeded: 'API quota exceeded. Please check your account balance.',
  errorNetwork: 'Network request failed. Please try again.',
  saveSettings: 'Save Settings',
  settingsSaved: 'Settings saved!',
  claudeApiKey: 'Claude API Key',
  openaiApiKey: 'OpenAI API Key',
  defaultProvider: 'Default AI Provider',
  defaultLanguage: 'Default Output Language',
  model: 'Model',
  notVideoPage: 'Please open a YouTube or Bilibili video page.',
  language: 'Language',
}
```

- [ ] **Step 5: Write src/shared/i18n/index.ts**

```typescript
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
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npm test -- tests/shared/i18n.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/i18n/ tests/shared/i18n.test.ts
git commit -m "feat: add i18n system with Chinese and English support"
```

---

## Task 4: Storage Service with Encryption

**Files:**
- Create: `src/shared/storage.ts`
- Test: `tests/shared/storage.test.ts`

This service encrypts API keys with AES-GCM before storing them in `chrome.storage.local`. A random 256-bit key is generated on first use and stored separately.

- [ ] **Step 1: Write tests/setup.ts with Chrome API mocks**

```typescript
// tests/setup.ts
import '@testing-library/jest-dom'

// Mock chrome.storage
const store: Record<string, unknown> = {}

global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys: string | string[] | null) =>
        Promise.resolve(
          keys === null
            ? store
            : Array.isArray(keys)
            ? Object.fromEntries(keys.map(k => [k, store[k]]))
            : { [keys as string]: store[keys as string] }
        )
      ),
      set: jest.fn((items: Record<string, unknown>) => {
        Object.assign(store, items)
        return Promise.resolve()
      }),
      remove: jest.fn((keys: string | string[]) => {
        const ks = Array.isArray(keys) ? keys : [keys]
        ks.forEach(k => delete store[k])
        return Promise.resolve()
      }),
    },
    session: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
    },
  },
  runtime: {
    id: 'test-extension-id',
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
} as unknown as typeof chrome

// Reset store before each test
beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k])
  jest.clearAllMocks()
})
```

- [ ] **Step 2: Write the failing test**

```typescript
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
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- tests/shared/storage.test.ts
```

Expected: FAIL — `Cannot find module '../../src/shared/storage'`

- [ ] **Step 4: Write src/shared/storage.ts**

```typescript
import { DEFAULT_SETTINGS, type Settings, type Transcript } from './types'

const STORAGE_KEY_PREFIX = 'fc_'
const CRYPTO_KEY_STORAGE_KEY = `${STORAGE_KEY_PREFIX}crypto_key`
const SETTINGS_STORAGE_KEY = `${STORAGE_KEY_PREFIX}settings`

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
  const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)))
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
  return btoa(String.fromCharCode(...combined))
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
  claudeModel?: string
  openaiModel?: string
  defaultProvider?: string
  defaultLanguage?: string
}

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY)
  const raw = (stored[SETTINGS_STORAGE_KEY] as StoredSettings) ?? {}

  const claudeApiKey = raw.claudeApiKeyEnc ? await decryptValue(raw.claudeApiKeyEnc) : ''
  const openaiApiKey = raw.openaiApiKeyEnc ? await decryptValue(raw.openaiApiKeyEnc) : ''

  return {
    claudeApiKey,
    openaiApiKey,
    claudeModel: raw.claudeModel ?? DEFAULT_SETTINGS.claudeModel,
    openaiModel: raw.openaiModel ?? DEFAULT_SETTINGS.openaiModel,
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
  if (partial.claudeModel !== undefined) updated.claudeModel = partial.claudeModel
  if (partial.openaiModel !== undefined) updated.openaiModel = partial.openaiModel
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
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- tests/shared/storage.test.ts
```

Expected: PASS (Note: Web Crypto API is available in jsdom)

- [ ] **Step 6: Commit**

```bash
git add src/shared/storage.ts tests/setup.ts tests/shared/storage.test.ts
git commit -m "feat: add storage service with AES-GCM encryption for API keys"
```

---

## Task 5: YouTube Transcript Fetcher

**Files:**
- Create: `src/services/transcript/youtube.ts`
- Test: `tests/services/transcript/youtube.test.ts`

Strategy: read the page's inline `<script>` tags to find `ytInitialPlayerResponse`, extract caption track URLs, then fetch the timed-text XML and parse it.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/services/transcript/youtube.test.ts
import { extractPlayerResponse, parseCaptionTracks, parseTimedText, buildTranscript } from '../../../src/services/transcript/youtube'

const MOCK_PLAYER_RESPONSE = {
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=abc&lang=en',
          name: { simpleText: 'English' },
          languageCode: 'en',
          kind: 'asr',
        },
        {
          baseUrl: 'https://www.youtube.com/api/timedtext?v=abc&lang=zh-Hans',
          name: { simpleText: 'Chinese (Simplified)' },
          languageCode: 'zh-Hans',
          kind: '',
        },
      ],
    },
  },
}

const MOCK_TIMED_TEXT_XML = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0.5" dur="2.5">Hello world</text>
  <text start="3.0" dur="2.0">This is a test</text>
  <text start="5.5" dur="1.5">Goodbye</text>
</transcript>`

describe('YouTube transcript', () => {
  describe('extractPlayerResponse', () => {
    it('extracts player response JSON from script tag text', () => {
      const scriptText = `var ytInitialPlayerResponse = ${JSON.stringify(MOCK_PLAYER_RESPONSE)};`
      const result = extractPlayerResponse(scriptText)
      expect(result).not.toBeNull()
      expect(result?.captions).toBeDefined()
    })

    it('returns null when no player response found', () => {
      expect(extractPlayerResponse('var something = 42;')).toBeNull()
    })
  })

  describe('parseCaptionTracks', () => {
    it('extracts caption tracks from player response', () => {
      const tracks = parseCaptionTracks(MOCK_PLAYER_RESPONSE)
      expect(tracks).toHaveLength(2)
      expect(tracks[0].languageCode).toBe('en')
      expect(tracks[0].isAutoGenerated).toBe(true)
      expect(tracks[1].languageCode).toBe('zh-Hans')
      expect(tracks[1].isAutoGenerated).toBe(false)
    })

    it('returns empty array when no captions', () => {
      expect(parseCaptionTracks({})).toEqual([])
    })
  })

  describe('parseTimedText', () => {
    it('parses timed text XML into transcript segments', () => {
      const segments = parseTimedText(MOCK_TIMED_TEXT_XML)
      expect(segments).toHaveLength(3)
      expect(segments[0].text).toBe('Hello world')
      expect(segments[0].startMs).toBe(500)
      expect(segments[0].durationMs).toBe(2500)
    })

    it('handles HTML entities in text', () => {
      const xml = `<transcript><text start="0" dur="1">Hello &amp; world</text></transcript>`
      const segments = parseTimedText(xml)
      expect(segments[0].text).toBe('Hello & world')
    })
  })

  describe('buildTranscript', () => {
    it('joins segments into fullText', () => {
      const transcript = buildTranscript('abc123', 'en', [
        { text: 'Hello world', startMs: 500, durationMs: 2500 },
        { text: 'Goodbye', startMs: 5500, durationMs: 1500 },
      ])
      expect(transcript.videoId).toBe('abc123')
      expect(transcript.platform).toBe('youtube')
      expect(transcript.fullText).toBe('Hello world Goodbye')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/services/transcript/youtube.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write src/services/transcript/youtube.ts**

```typescript
import type { Transcript, TranscriptSegment } from '../../shared/types'

export interface CaptionTrack {
  baseUrl: string
  languageCode: string
  name: string
  isAutoGenerated: boolean
}

export function extractPlayerResponse(scriptText: string): Record<string, unknown> | null {
  const marker = 'ytInitialPlayerResponse'
  const idx = scriptText.indexOf(marker)
  if (idx === -1) return null

  const jsonStart = scriptText.indexOf('{', idx)
  if (jsonStart === -1) return null

  let depth = 0
  for (let i = jsonStart; i < scriptText.length; i++) {
    if (scriptText[i] === '{') depth++
    else if (scriptText[i] === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(scriptText.slice(jsonStart, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

export function parseCaptionTracks(playerResponse: Record<string, unknown>): CaptionTrack[] {
  try {
    const renderer = (playerResponse as {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: Array<{
            baseUrl: string
            languageCode: string
            name: { simpleText: string }
            kind?: string
          }>
        }
      }
    }).captions?.playerCaptionsTracklistRenderer?.captionTracks

    if (!renderer) return []

    return renderer.map(t => ({
      baseUrl: t.baseUrl,
      languageCode: t.languageCode,
      name: t.name.simpleText,
      isAutoGenerated: t.kind === 'asr',
    }))
  } catch {
    return []
  }
}

export function parseTimedText(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = []
  const regex = /<text start="([\d.]+)"[^>]*dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(xml)) !== null) {
    const text = match[3]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, '') // strip any inner HTML tags
      .trim()

    if (text) {
      segments.push({
        text,
        startMs: Math.round(parseFloat(match[1]) * 1000),
        durationMs: Math.round(parseFloat(match[2]) * 1000),
      })
    }
  }

  return segments
}

export function buildTranscript(videoId: string, language: string, segments: TranscriptSegment[]): Transcript {
  return {
    videoId,
    platform: 'youtube',
    language,
    segments,
    fullText: segments.map(s => s.text).join(' '),
  }
}

export function selectBestTrack(tracks: CaptionTrack[], preferredLang: string): CaptionTrack | null {
  if (tracks.length === 0) return null

  // 1. Exact preferred language match (manual > auto)
  const exactManual = tracks.find(t => t.languageCode === preferredLang && !t.isAutoGenerated)
  if (exactManual) return exactManual

  // 2. Exact preferred language match (auto-generated)
  const exactAuto = tracks.find(t => t.languageCode === preferredLang)
  if (exactAuto) return exactAuto

  // 3. English manual
  const enManual = tracks.find(t => t.languageCode.startsWith('en') && !t.isAutoGenerated)
  if (enManual) return enManual

  // 4. Any manual
  const anyManual = tracks.find(t => !t.isAutoGenerated)
  if (anyManual) return anyManual

  // 5. First available
  return tracks[0]
}

export async function fetchYouTubeTranscript(videoId: string, preferredLang = 'en'): Promise<Transcript | null> {
  // Find the ytInitialPlayerResponse in inline script tags
  const scripts = Array.from(document.scripts)
  let playerResponse: Record<string, unknown> | null = null

  for (const script of scripts) {
    if (!script.src && script.textContent?.includes('ytInitialPlayerResponse')) {
      playerResponse = extractPlayerResponse(script.textContent)
      if (playerResponse) break
    }
  }

  if (!playerResponse) return null

  const tracks = parseCaptionTracks(playerResponse)
  if (tracks.length === 0) return null

  const track = selectBestTrack(tracks, preferredLang)
  if (!track) return null

  const response = await fetch(track.baseUrl)
  if (!response.ok) return null

  const xml = await response.text()
  const segments = parseTimedText(xml)

  return buildTranscript(videoId, track.languageCode, segments)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/services/transcript/youtube.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/transcript/youtube.ts tests/services/transcript/youtube.test.ts
git commit -m "feat: add YouTube transcript fetcher with caption track parsing"
```

---

## Task 6: Bilibili Transcript Fetcher

**Files:**
- Create: `src/services/transcript/bilibili.ts`
- Test: `tests/services/transcript/bilibili.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/services/transcript/bilibili.test.ts
import { extractBilibiliState, parseBilibiliSubtitle, buildTranscript } from '../../../src/services/transcript/bilibili'

const MOCK_INITIAL_STATE = {
  videoData: {
    bvid: 'BV1xx411c7mD',
    cid: 12345678,
  },
}

const MOCK_SUBTITLE_RESPONSE = {
  data: {
    subtitle: {
      subtitles: [
        {
          id: 1,
          lan: 'zh-CN',
          lan_doc: '中文（中国）',
          subtitle_url: '//example.com/subtitle.json',
        },
      ],
    },
  },
}

const MOCK_SUBTITLE_JSON = {
  body: [
    { from: 0.5, to: 3.0, content: '你好世界' },
    { from: 3.5, to: 6.0, content: '这是一个测试' },
  ],
}

describe('Bilibili transcript', () => {
  describe('extractBilibiliState', () => {
    it('extracts initial state from script text', () => {
      const scriptText = `window.__INITIAL_STATE__=${JSON.stringify(MOCK_INITIAL_STATE)};`
      const result = extractBilibiliState(scriptText)
      expect(result).not.toBeNull()
      expect(result?.videoData?.bvid).toBe('BV1xx411c7mD')
    })

    it('returns null when no initial state found', () => {
      expect(extractBilibiliState('var x = 1;')).toBeNull()
    })
  })

  describe('parseBilibiliSubtitle', () => {
    it('converts bilibili subtitle body to transcript segments', () => {
      const segments = parseBilibiliSubtitle(MOCK_SUBTITLE_JSON.body)
      expect(segments).toHaveLength(2)
      expect(segments[0].text).toBe('你好世界')
      expect(segments[0].startMs).toBe(500)
      expect(segments[0].durationMs).toBe(2500)
      expect(segments[1].text).toBe('这是一个测试')
    })
  })

  describe('buildTranscript', () => {
    it('builds transcript with platform set to bilibili', () => {
      const segments = parseBilibiliSubtitle(MOCK_SUBTITLE_JSON.body)
      const transcript = buildTranscript('BV1xx411c7mD', 'zh-CN', segments)
      expect(transcript.platform).toBe('bilibili')
      expect(transcript.fullText).toBe('你好世界 这是一个测试')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/services/transcript/bilibili.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write src/services/transcript/bilibili.ts**

```typescript
import type { Transcript, TranscriptSegment } from '../../shared/types'

interface BilibiliSubtitleEntry {
  from: number
  to: number
  content: string
}

interface BilibiliSubtitleInfo {
  id: number
  lan: string
  lan_doc: string
  subtitle_url: string
}

export function extractBilibiliState(scriptText: string): Record<string, unknown> | null {
  const marker = 'window.__INITIAL_STATE__='
  const idx = scriptText.indexOf(marker)
  if (idx === -1) return null

  const jsonStart = scriptText.indexOf('{', idx)
  if (jsonStart === -1) return null

  let depth = 0
  for (let i = jsonStart; i < scriptText.length; i++) {
    if (scriptText[i] === '{') depth++
    else if (scriptText[i] === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(scriptText.slice(jsonStart, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

export function parseBilibiliSubtitle(body: BilibiliSubtitleEntry[]): TranscriptSegment[] {
  return body.map(entry => ({
    text: entry.content,
    startMs: Math.round(entry.from * 1000),
    durationMs: Math.round((entry.to - entry.from) * 1000),
  }))
}

export function buildTranscript(videoId: string, language: string, segments: TranscriptSegment[]): Transcript {
  return {
    videoId,
    platform: 'bilibili',
    language,
    segments,
    fullText: segments.map(s => s.text).join(' '),
  }
}

export async function fetchBilibiliTranscript(bvid: string): Promise<Transcript | null> {
  // Read __INITIAL_STATE__ from inline scripts
  const scripts = Array.from(document.scripts)
  let state: Record<string, unknown> | null = null

  for (const script of scripts) {
    if (!script.src && script.textContent?.includes('__INITIAL_STATE__')) {
      state = extractBilibiliState(script.textContent)
      if (state) break
    }
  }

  if (!state) return null

  const videoData = state.videoData as { bvid?: string; cid?: number } | undefined
  const cid = videoData?.cid
  if (!cid) return null

  // Fetch subtitle list
  const playerResp = await fetch(
    `https://api.bilibili.com/x/player/v2?bvid=${bvid}&cid=${cid}`,
    { credentials: 'include' }
  )
  if (!playerResp.ok) return null

  const playerData = await playerResp.json() as {
    data?: { subtitle?: { subtitles?: BilibiliSubtitleInfo[] } }
  }
  const subtitles = playerData.data?.subtitle?.subtitles
  if (!subtitles || subtitles.length === 0) return null

  // Prefer Chinese subtitle
  const preferred = subtitles.find(s => s.lan.startsWith('zh')) ?? subtitles[0]
  const subtitleUrl = preferred.subtitle_url.startsWith('//')
    ? `https:${preferred.subtitle_url}`
    : preferred.subtitle_url

  const subtitleResp = await fetch(subtitleUrl)
  if (!subtitleResp.ok) return null

  const subtitleJson = await subtitleResp.json() as { body: BilibiliSubtitleEntry[] }
  const segments = parseBilibiliSubtitle(subtitleJson.body)

  return buildTranscript(bvid, preferred.lan, segments)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/services/transcript/bilibili.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/transcript/bilibili.ts tests/services/transcript/bilibili.test.ts
git commit -m "feat: add Bilibili transcript fetcher"
```

---

## Task 7: Transcript Orchestrator

**Files:**
- Create: `src/services/transcript/index.ts`
- Test: `tests/services/transcript/index.test.ts`

Routes to YouTube or Bilibili fetcher, returns `null` with a `reason` when no transcript is available.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/services/transcript/index.test.ts
import { getTranscript, type TranscriptResult } from '../../../src/services/transcript/index'
import * as youtube from '../../../src/services/transcript/youtube'
import * as bilibili from '../../../src/services/transcript/bilibili'
import type { Transcript } from '../../../src/shared/types'

const MOCK_TRANSCRIPT: Transcript = {
  videoId: 'abc123',
  platform: 'youtube',
  language: 'en',
  segments: [{ text: 'Hello', startMs: 0, durationMs: 1000 }],
  fullText: 'Hello',
}

jest.mock('../../../src/services/transcript/youtube')
jest.mock('../../../src/services/transcript/bilibili')

describe('transcript orchestrator', () => {
  beforeEach(() => {
    // Reset session cache mock
    ;(chrome.storage.session.get as jest.Mock).mockResolvedValue({})
  })

  it('returns cached transcript if available', async () => {
    const cacheKey = 'fc_transcript_abc123'
    ;(chrome.storage.session.get as jest.Mock).mockResolvedValue({
      [cacheKey]: MOCK_TRANSCRIPT,
    })

    const result = await getTranscript('abc123', 'youtube', 'en')
    expect(result.transcript).toEqual(MOCK_TRANSCRIPT)
    expect(youtube.fetchYouTubeTranscript).not.toHaveBeenCalled()
  })

  it('fetches from YouTube when not cached', async () => {
    ;(youtube.fetchYouTubeTranscript as jest.Mock).mockResolvedValue(MOCK_TRANSCRIPT)

    const result = await getTranscript('abc123', 'youtube', 'en')
    expect(result.transcript).toEqual(MOCK_TRANSCRIPT)
    expect(chrome.storage.session.set).toHaveBeenCalled()
  })

  it('returns noSubtitles reason when fetch returns null', async () => {
    ;(youtube.fetchYouTubeTranscript as jest.Mock).mockResolvedValue(null)

    const result = await getTranscript('abc123', 'youtube', 'en')
    expect(result.transcript).toBeNull()
    expect(result.reason).toBe('noSubtitles')
  })

  it('fetches from Bilibili for bilibili platform', async () => {
    const bilibiliTranscript = { ...MOCK_TRANSCRIPT, platform: 'bilibili' as const }
    ;(bilibili.fetchBilibiliTranscript as jest.Mock).mockResolvedValue(bilibiliTranscript)

    const result = await getTranscript('BV1abc', 'bilibili', 'zh')
    expect(result.transcript?.platform).toBe('bilibili')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/services/transcript/index.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write src/services/transcript/index.ts**

```typescript
import type { Transcript, Language } from '../../shared/types'
import { getCachedTranscript, setCachedTranscript } from '../../shared/storage'
import { fetchYouTubeTranscript } from './youtube'
import { fetchBilibiliTranscript } from './bilibili'

export interface TranscriptResult {
  transcript: Transcript | null
  reason: 'ok' | 'noSubtitles' | 'error'
  error?: string
}

export async function getTranscript(
  videoId: string,
  platform: 'youtube' | 'bilibili',
  preferredLang: Language
): Promise<TranscriptResult> {
  const cached = await getCachedTranscript(videoId)
  if (cached) return { transcript: cached, reason: 'ok' }

  try {
    let transcript: Transcript | null = null

    if (platform === 'youtube') {
      const lang = preferredLang === 'auto' ? 'en' : preferredLang
      transcript = await fetchYouTubeTranscript(videoId, lang)
    } else {
      transcript = await fetchBilibiliTranscript(videoId)
    }

    if (!transcript) return { transcript: null, reason: 'noSubtitles' }

    await setCachedTranscript(videoId, transcript)
    return { transcript, reason: 'ok' }
  } catch (err) {
    return {
      transcript: null,
      reason: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export function detectVideoPage(): { platform: 'youtube' | 'bilibili'; videoId: string } | null {
  const url = window.location.href
  const ytMatch = url.match(/youtube\.com\/watch\?.*v=([^&]+)/)
  if (ytMatch) return { platform: 'youtube', videoId: ytMatch[1] }

  const biliMatch = url.match(/bilibili\.com\/video\/(BV[\w]+)/)
  if (biliMatch) return { platform: 'bilibili', videoId: biliMatch[1] }

  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/services/transcript/index.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/transcript/index.ts tests/services/transcript/index.test.ts
git commit -m "feat: add transcript orchestrator with caching and platform routing"
```

---

## Task 8: AI Prompt Builder

**Files:**
- Create: `src/services/ai/prompts.ts`
- Test: `tests/services/ai/prompts.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/services/ai/prompts.test.ts
import { buildSummaryPrompt, buildFactCheckPrompt } from '../../../src/services/ai/prompts'

const TRANSCRIPT = 'Climate change is causing sea levels to rise by 3 meters per year. Scientists agree this will flood all coastal cities by 2025.'

describe('prompts', () => {
  describe('buildSummaryPrompt', () => {
    it('includes transcript in Chinese prompt', () => {
      const prompt = buildSummaryPrompt(TRANSCRIPT, 'zh')
      expect(prompt).toContain(TRANSCRIPT)
      expect(prompt).toContain('中文')
    })

    it('includes transcript in English prompt', () => {
      const prompt = buildSummaryPrompt(TRANSCRIPT, 'en')
      expect(prompt).toContain(TRANSCRIPT)
      expect(prompt).toContain('English')
    })

    it('includes required output sections', () => {
      const prompt = buildSummaryPrompt(TRANSCRIPT, 'en')
      expect(prompt).toContain('key point')
      expect(prompt).toContain('overview')
      expect(prompt).toContain('conclusion')
    })
  })

  describe('buildFactCheckPrompt', () => {
    it('includes transcript in prompt', () => {
      const prompt = buildFactCheckPrompt(TRANSCRIPT, 'zh')
      expect(prompt).toContain(TRANSCRIPT)
    })

    it('asks to identify factual errors and logical fallacies', () => {
      const prompt = buildFactCheckPrompt(TRANSCRIPT, 'en')
      expect(prompt.toLowerCase()).toContain('factual')
      expect(prompt.toLowerCase()).toContain('logical')
    })

    it('handles very long transcripts by truncating to 80000 chars', () => {
      const longTranscript = 'x'.repeat(100000)
      const prompt = buildFactCheckPrompt(longTranscript, 'en')
      expect(prompt.length).toBeLessThan(100000)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/services/ai/prompts.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write src/services/ai/prompts.ts**

```typescript
import type { AnalysisType, Language } from '../../shared/types'

const MAX_TRANSCRIPT_CHARS = 80000

function truncate(text: string): string {
  if (text.length <= MAX_TRANSCRIPT_CHARS) return text
  return text.slice(0, MAX_TRANSCRIPT_CHARS) + '\n[transcript truncated]'
}

function langInstruction(lang: Language): string {
  if (lang === 'zh') return 'Respond in Chinese (中文).'
  if (lang === 'en') return 'Respond in English.'
  return 'Respond in the same language as the transcript.'
}

export function buildSummaryPrompt(transcript: string, lang: Language): string {
  return `You are analyzing a video transcript. ${langInstruction(lang)}

Provide:
1. Key points (3–5 bullet points) — the most important ideas or claims
2. Content overview (under 150 words) — a concise summary of what the video covers
3. Main conclusions — what the speaker concludes or recommends

Keep each section clearly labeled. Be factual and concise.

---TRANSCRIPT---
${truncate(transcript)}`
}

export function buildFactCheckPrompt(transcript: string, lang: Language): string {
  return `You are a fact-checker analyzing a video transcript. ${langInstruction(lang)}

Identify factual errors and logical fallacies. For each issue:
- Quote the relevant passage from the transcript
- Label the issue type: factual error / logical fallacy / exaggeration / misleading claim / unverified claim
- Briefly explain why it is problematic and (if known) what the accurate information is

If no significant issues are found, state clearly: "No significant issues detected."

Be objective and rigorous. Do not flag opinions as errors.

---TRANSCRIPT---
${truncate(transcript)}`
}

export function buildPrompt(type: AnalysisType, transcript: string, lang: Language): string {
  return type === 'summary'
    ? buildSummaryPrompt(transcript, lang)
    : buildFactCheckPrompt(transcript, lang)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/services/ai/prompts.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/prompts.ts tests/services/ai/prompts.test.ts
git commit -m "feat: add AI prompt builder for summary and fact-check"
```

---

## Task 9: Claude API Client

**Files:**
- Create: `src/services/ai/claude.ts`
- Test: `tests/services/ai/claude.test.ts`

Streams Claude API responses as async generator of text chunks.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/services/ai/claude.test.ts
import { streamClaude, classifyApiError } from '../../../src/services/ai/claude'

function makeStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)))
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

describe('Claude client', () => {
  describe('classifyApiError', () => {
    it('returns invalidKey for 401', () => {
      expect(classifyApiError(401)).toBe('invalidKey')
    })
    it('returns quotaExceeded for 429', () => {
      expect(classifyApiError(429)).toBe('quotaExceeded')
    })
    it('returns network for other status codes', () => {
      expect(classifyApiError(500)).toBe('network')
    })
  })

  describe('streamClaude', () => {
    it('yields text chunks from SSE stream', async () => {
      const sseChunks = [
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}\n\n',
        'data: {"type":"message_stop"}\n\n',
      ]

      global.fetch = jest.fn().mockResolvedValue(makeStreamResponse(sseChunks))

      const chunks: string[] = []
      for await (const chunk of streamClaude('sk-ant-test', 'claude-sonnet-4-6', 'Hello prompt')) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hello', ' world'])
    })

    it('throws error with type when API returns 401', async () => {
      global.fetch = jest.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 }))

      const gen = streamClaude('bad-key', 'claude-sonnet-4-6', 'prompt')
      await expect(gen.next()).rejects.toMatchObject({ type: 'invalidKey' })
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/services/ai/claude.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write src/services/ai/claude.ts**

```typescript
export type ApiErrorType = 'invalidKey' | 'quotaExceeded' | 'network'

export class ApiError extends Error {
  constructor(public type: ApiErrorType, message: string) {
    super(message)
  }
}

export function classifyApiError(status: number): ApiErrorType {
  if (status === 401 || status === 403) return 'invalidKey'
  if (status === 429) return 'quotaExceeded'
  return 'network'
}

export async function* streamClaude(
  apiKey: string,
  model: string,
  prompt: string
): AsyncGenerator<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new ApiError(classifyApiError(response.status), `Claude API error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new ApiError('network', 'No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return

      try {
        const event = JSON.parse(data) as {
          type: string
          delta?: { type: string; text?: string }
        }
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
          yield event.delta.text
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/services/ai/claude.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/claude.ts tests/services/ai/claude.test.ts
git commit -m "feat: add Claude API streaming client"
```

---

## Task 10: OpenAI API Client

**Files:**
- Create: `src/services/ai/openai.ts`
- Test: `tests/services/ai/openai.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/services/ai/openai.test.ts
import { streamOpenAI } from '../../../src/services/ai/openai'
import { ApiError } from '../../../src/services/ai/claude'

function makeStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)))
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

describe('OpenAI client', () => {
  it('yields text chunks from SSE stream', async () => {
    const sseChunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ]

    global.fetch = jest.fn().mockResolvedValue(makeStreamResponse(sseChunks))

    const chunks: string[] = []
    for await (const chunk of streamOpenAI('sk-test', 'gpt-4o', 'Hello prompt')) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual(['Hello', ' world'])
  })

  it('throws ApiError with invalidKey type on 401', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 }))

    const gen = streamOpenAI('bad-key', 'gpt-4o', 'prompt')
    await expect(gen.next()).rejects.toBeInstanceOf(ApiError)
    await expect(streamOpenAI('bad-key', 'gpt-4o', 'prompt').next()).rejects.toMatchObject({ type: 'invalidKey' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/services/ai/openai.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write src/services/ai/openai.ts**

```typescript
import { ApiError, classifyApiError } from './claude'

export async function* streamOpenAI(
  apiKey: string,
  model: string,
  prompt: string
): AsyncGenerator<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new ApiError(classifyApiError(response.status), `OpenAI API error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new ApiError('network', 'No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return

      try {
        const event = JSON.parse(data) as {
          choices: Array<{ delta: { content?: string } }>
        }
        const text = event.choices?.[0]?.delta?.content
        if (text) yield text
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/services/ai/openai.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/openai.ts tests/services/ai/openai.test.ts
git commit -m "feat: add OpenAI API streaming client"
```

---

## Task 11: AI Service Orchestrator + Whisper Client

**Files:**
- Create: `src/services/ai/index.ts`
- Create: `src/services/whisper/index.ts`
- Test: `tests/services/ai/index.test.ts`
- Test: `tests/services/whisper/index.test.ts`

- [ ] **Step 1: Write failing test for AI orchestrator**

```typescript
// tests/services/ai/index.test.ts
import { streamAnalysis } from '../../../src/services/ai/index'
import * as claude from '../../../src/services/ai/claude'
import * as openai from '../../../src/services/ai/openai'
import type { Settings } from '../../../src/shared/types'

jest.mock('../../../src/services/ai/claude')
jest.mock('../../../src/services/ai/openai')

async function* mockStream(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) yield chunk
}

const BASE_SETTINGS: Settings = {
  claudeApiKey: 'sk-ant-test',
  claudeModel: 'claude-sonnet-4-6',
  openaiApiKey: 'sk-openai-test',
  openaiModel: 'gpt-4o',
  defaultProvider: 'claude',
  defaultLanguage: 'zh',
}

describe('AI orchestrator', () => {
  it('routes to Claude when defaultProvider is claude', async () => {
    ;(claude.streamClaude as jest.Mock).mockReturnValue(mockStream(['Hello', ' world']))

    const chunks: string[] = []
    for await (const chunk of streamAnalysis(BASE_SETTINGS, 'summary', 'transcript text', 'zh')) {
      chunks.push(chunk)
    }

    expect(claude.streamClaude).toHaveBeenCalledWith('sk-ant-test', 'claude-sonnet-4-6', expect.any(String))
    expect(chunks).toEqual(['Hello', ' world'])
  })

  it('routes to OpenAI when defaultProvider is openai', async () => {
    ;(openai.streamOpenAI as jest.Mock).mockReturnValue(mockStream(['Hi']))

    const settings = { ...BASE_SETTINGS, defaultProvider: 'openai' as const }
    const chunks: string[] = []
    for await (const chunk of streamAnalysis(settings, 'factcheck', 'transcript', 'en')) {
      chunks.push(chunk)
    }

    expect(openai.streamOpenAI).toHaveBeenCalledWith('sk-openai-test', 'gpt-4o', expect.any(String))
    expect(chunks).toEqual(['Hi'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/services/ai/index.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write src/services/ai/index.ts**

```typescript
import type { Settings, AnalysisType, Language } from '../../shared/types'
import { streamClaude } from './claude'
import { streamOpenAI } from './openai'
import { buildPrompt } from './prompts'

export async function* streamAnalysis(
  settings: Settings,
  type: AnalysisType,
  transcript: string,
  lang: Language
): AsyncGenerator<string> {
  const prompt = buildPrompt(type, transcript, lang)

  if (settings.defaultProvider === 'claude') {
    yield* streamClaude(settings.claudeApiKey, settings.claudeModel, prompt)
  } else {
    yield* streamOpenAI(settings.openaiApiKey, settings.openaiModel, prompt)
  }
}
```

- [ ] **Step 4: Write failing test for Whisper client**

```typescript
// tests/services/whisper/index.test.ts
import { transcribeWithWhisper } from '../../../src/services/whisper/index'

describe('Whisper client', () => {
  it('sends audio to OpenAI Whisper and returns text', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(
        new Response(new ArrayBuffer(100), {
          status: 200,
          headers: { 'Content-Type': 'audio/mp4' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ text: 'Hello world this is a test transcript' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    const result = await transcribeWithWhisper('sk-test', 'https://example.com/audio.m4a')
    expect(result).toBe('Hello world this is a test transcript')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws on API error', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(new Response(new ArrayBuffer(10), { status: 200 }))
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))

    await expect(transcribeWithWhisper('bad-key', 'https://example.com/audio.m4a'))
      .rejects.toMatchObject({ type: 'invalidKey' })
  })
})
```

- [ ] **Step 5: Write src/services/whisper/index.ts**

```typescript
import { ApiError, classifyApiError } from '../ai/claude'

export async function transcribeWithWhisper(apiKey: string, audioUrl: string): Promise<string> {
  // Fetch the audio file
  const audioResp = await fetch(audioUrl)
  if (!audioResp.ok) {
    throw new ApiError('network', `Failed to fetch audio: ${audioResp.status}`)
  }
  const audioBuffer = await audioResp.arrayBuffer()
  const audioBlob = new Blob([audioBuffer], { type: 'audio/mp4' })

  const form = new FormData()
  form.append('file', audioBlob, 'audio.m4a')
  form.append('model', 'whisper-1')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!response.ok) {
    throw new ApiError(classifyApiError(response.status), `Whisper API error: ${response.status}`)
  }

  const data = await response.json() as { text: string }
  return data.text
}
```

- [ ] **Step 6: Run all new tests**

```bash
npm test -- tests/services/ai/index.test.ts tests/services/whisper/index.test.ts
```

Expected: PASS

- [ ] **Step 7: Run full test suite to check for regressions**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/services/ai/index.ts src/services/whisper/index.ts tests/services/ai/index.test.ts tests/services/whisper/index.test.ts
git commit -m "feat: add AI orchestrator and Whisper transcription client"
```

---

## Task 12: Background Service Worker

**Files:**
- Create: `src/background/index.ts`

The service worker receives `ANALYZE` messages from content scripts, calls the AI streaming service, and relays chunks back via `chrome.tabs.sendMessage`.

- [ ] **Step 1: Write src/background/index.ts**

```typescript
import { getSettings } from '../shared/storage'
import { streamAnalysis } from '../services/ai/index'
import { ApiError } from '../services/ai/claude'
import type { BackgroundMessage, ContentMessage } from '../shared/messages'
import type { AnalysisType } from '../shared/types'

chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, sender, sendResponse) => {
    if (message.type === 'ANALYZE') {
      handleAnalyze(message, sender.tab?.id)
      sendResponse({ ok: true })
    }
    return false
  }
)

async function handleAnalyze(
  message: Extract<BackgroundMessage, { type: 'ANALYZE' }>,
  tabId: number | undefined
): Promise<void> {
  if (!tabId) return

  const settings = await getSettings()
  const { analysisType, language, transcript } = message

  try {
    for await (const chunk of streamAnalysis(settings, analysisType, transcript.fullText, language)) {
      const msg: ContentMessage = { type: 'ANALYSIS_CHUNK', chunk, analysisType }
      chrome.tabs.sendMessage(tabId, msg).catch(() => {
        // Tab may have been closed; ignore
      })
    }

    const doneMsg: ContentMessage = { type: 'ANALYSIS_DONE', analysisType }
    chrome.tabs.sendMessage(tabId, doneMsg).catch(() => {})
  } catch (err) {
    const errorMsg: ContentMessage = {
      type: 'ANALYSIS_ERROR',
      analysisType,
      error: err instanceof ApiError ? err.type : 'network',
    }
    chrome.tabs.sendMessage(tabId, errorMsg).catch(() => {})
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: add background service worker for AI message routing"
```

---

## Task 13: Sidebar React Components

**Files:**
- Create: `src/sidebar/Sidebar.tsx`
- Create: `src/sidebar/SummaryTab.tsx`
- Create: `src/sidebar/FactCheckTab.tsx`
- Create: `src/sidebar/index.tsx`
- Create: `src/sidebar/sidebar.css`
- Test: `tests/sidebar/Sidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/sidebar/Sidebar.test.tsx
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../../src/sidebar/Sidebar'
import type { AnalysisType, Language } from '../../src/shared/types'

describe('Sidebar', () => {
  const onAnalyze = jest.fn().mockResolvedValue('ok')
  const defaultProps = {
    onClose: jest.fn(),
    onAnalyze,
  }

  it('renders Summary and Fact Check tabs', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText(/summary/i)).toBeInTheDocument()
    expect(screen.getByText(/fact check/i)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(<Sidebar {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('switches between tabs', () => {
    render(<Sidebar {...defaultProps} />)
    const factCheckTab = screen.getByRole('tab', { name: /fact check/i })
    fireEvent.click(factCheckTab)
    expect(factCheckTab).toHaveAttribute('aria-selected', 'true')
  })

  it('shows language toggle buttons', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByRole('button', { name: /中文/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /en/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/sidebar/Sidebar.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Write src/sidebar/sidebar.css**

```css
#fact-checker-sidebar-root {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  height: 100vh;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.15);
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.fc-title {
  font-weight: 600;
  font-size: 15px;
  color: #111827;
}

.fc-lang-toggle {
  display: flex;
  gap: 4px;
}

.fc-lang-btn {
  padding: 3px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: #6b7280;
}

.fc-lang-btn.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.fc-close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #6b7280;
  padding: 4px;
  line-height: 1;
}

.fc-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.fc-tab {
  flex: 1;
  padding: 10px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}

.fc-tab[aria-selected="true"] {
  border-bottom-color: #2563eb;
  color: #2563eb;
}

.fc-tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.fc-analyze-btn {
  width: 100%;
  padding: 10px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 16px;
}

.fc-analyze-btn:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.fc-result {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #374151;
}

.fc-copy-btn {
  margin-top: 12px;
  padding: 6px 12px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #374151;
}

.fc-error {
  color: #dc2626;
  padding: 8px;
  background: #fef2f2;
  border-radius: 4px;
}

.fc-loading {
  color: #6b7280;
  font-style: italic;
}

.fc-whisper-prompt {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.fc-whisper-prompt p {
  margin: 0 0 10px;
  color: #92400e;
  font-size: 13px;
}

.fc-whisper-actions {
  display: flex;
  gap: 8px;
}

.fc-whisper-confirm {
  padding: 6px 12px;
  background: #f59e0b;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.fc-whisper-cancel {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #6b7280;
}
```

- [ ] **Step 4: Write src/sidebar/SummaryTab.tsx**

**Architecture note:** The sidebar does NOT call `chrome.runtime.sendMessage` directly — content scripts cannot receive messages they send themselves. Instead, the tab calls `onAnalyze` (a callback from the content script). The background sends chunk messages back via `chrome.tabs.sendMessage`, which content scripts DO receive via `chrome.runtime.onMessage`.

```typescript
import React, { useState, useEffect } from 'react'
import { t, type I18nKey } from '../shared/i18n'
import type { AnalysisStatus, Language } from '../shared/types'
import type { ContentMessage } from '../shared/messages'

interface Props {
  language: Language
  // Called by clicking Start Analysis. Content script fetches transcript then calls background.
  // Returns 'ok' if analysis started, 'noSubtitles' if transcript unavailable.
  onAnalyze: (lang: Language) => Promise<'ok' | 'noSubtitles'>
  // Called when user confirms Whisper usage
  onWhisperConfirm: (lang: Language) => void
}

export function SummaryTab({ language, onAnalyze, onWhisperConfirm }: Props) {
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showWhisperPrompt, setShowWhisperPrompt] = useState(false)

  useEffect(() => {
    // Receive streaming chunks from background (sent via chrome.tabs.sendMessage)
    const handler = (msg: ContentMessage) => {
      if (msg.type === 'ANALYSIS_CHUNK' && msg.analysisType === 'summary') {
        setStatus('streaming')
        setResult(prev => prev + msg.chunk)
      } else if (msg.type === 'ANALYSIS_DONE' && msg.analysisType === 'summary') {
        setStatus('done')
      } else if (msg.type === 'ANALYSIS_ERROR' && msg.analysisType === 'summary') {
        setStatus('error')
        const errorKey = `error${msg.error.charAt(0).toUpperCase() + msg.error.slice(1)}` as I18nKey
        setError(t(errorKey) ?? t('errorNetwork'))
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  async function startAnalysis() {
    setStatus('loading')
    setResult('')
    setError('')
    setShowWhisperPrompt(false)

    const outcome = await onAnalyze(language)
    if (outcome === 'noSubtitles') {
      setShowWhisperPrompt(true)
      setStatus('idle')
    }
  }

  function copyResult() {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const isRunning = status === 'loading' || status === 'streaming'

  return (
    <div className="fc-tab-content">
      {showWhisperPrompt && (
        <div className="fc-whisper-prompt">
          <p>{t('whisperPrompt')}</p>
          <div className="fc-whisper-actions">
            <button className="fc-whisper-confirm" onClick={() => {
              setShowWhisperPrompt(false)
              onWhisperConfirm(language)
            }}>
              {t('whisperConfirm')}
            </button>
            <button className="fc-whisper-cancel" onClick={() => setShowWhisperPrompt(false)}>
              {t('whisperCancel')}
            </button>
          </div>
        </div>
      )}
      <button className="fc-analyze-btn" onClick={startAnalysis} disabled={isRunning}>
        {isRunning ? t('loading') : t('startAnalysis')}
      </button>
      {status === 'error' && <div className="fc-error">{error}</div>}
      {result && (
        <>
          <div className="fc-result">{result}</div>
          <button className="fc-copy-btn" onClick={copyResult}>
            {copied ? t('copied') : t('copyResult')}
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Write src/sidebar/FactCheckTab.tsx**

Same callback-based structure as SummaryTab but for `analysisType: 'factcheck'`:

```typescript
import React, { useState, useEffect } from 'react'
import { t, type I18nKey } from '../shared/i18n'
import type { AnalysisStatus, Language } from '../shared/types'
import type { ContentMessage } from '../shared/messages'

interface Props {
  language: Language
  onAnalyze: (lang: Language) => Promise<'ok' | 'noSubtitles'>
  onWhisperConfirm: (lang: Language) => void
}

export function FactCheckTab({ language, onAnalyze, onWhisperConfirm }: Props) {
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showWhisperPrompt, setShowWhisperPrompt] = useState(false)

  useEffect(() => {
    const handler = (msg: ContentMessage) => {
      if (msg.type === 'ANALYSIS_CHUNK' && msg.analysisType === 'factcheck') {
        setStatus('streaming')
        setResult(prev => prev + msg.chunk)
      } else if (msg.type === 'ANALYSIS_DONE' && msg.analysisType === 'factcheck') {
        setStatus('done')
      } else if (msg.type === 'ANALYSIS_ERROR' && msg.analysisType === 'factcheck') {
        setStatus('error')
        const errorKey = `error${msg.error.charAt(0).toUpperCase() + msg.error.slice(1)}` as I18nKey
        setError(t(errorKey) ?? t('errorNetwork'))
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  async function startAnalysis() {
    setStatus('loading')
    setResult('')
    setError('')
    setShowWhisperPrompt(false)

    const outcome = await onAnalyze(language)
    if (outcome === 'noSubtitles') {
      setShowWhisperPrompt(true)
      setStatus('idle')
    }
  }

  function copyResult() {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const isRunning = status === 'loading' || status === 'streaming'

  return (
    <div className="fc-tab-content">
      {showWhisperPrompt && (
        <div className="fc-whisper-prompt">
          <p>{t('whisperPrompt')}</p>
          <div className="fc-whisper-actions">
            <button className="fc-whisper-confirm" onClick={() => {
              setShowWhisperPrompt(false)
              onWhisperConfirm(language)
            }}>
              {t('whisperConfirm')}
            </button>
            <button className="fc-whisper-cancel" onClick={() => setShowWhisperPrompt(false)}>
              {t('whisperCancel')}
            </button>
          </div>
        </div>
      )}
      <button className="fc-analyze-btn" onClick={startAnalysis} disabled={isRunning}>
        {isRunning ? t('loading') : t('startAnalysis')}
      </button>
      {status === 'error' && <div className="fc-error">{error}</div>}
      {result && (
        <>
          <div className="fc-result">{result}</div>
          <button className="fc-copy-btn" onClick={copyResult}>
            {copied ? t('copied') : t('copyResult')}
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Write src/sidebar/Sidebar.tsx**

```typescript
import React, { useState } from 'react'
import { t, setLanguage, getLanguage } from '../shared/i18n'
import { SummaryTab } from './SummaryTab'
import { FactCheckTab } from './FactCheckTab'
import type { AnalysisType, Language } from '../shared/types'
import './sidebar.css'

type TabId = 'summary' | 'factcheck'

interface Props {
  onClose: () => void
  // Content script provides this: fetches transcript, sends ANALYZE to background
  onAnalyze: (type: AnalysisType, lang: Language) => Promise<'ok' | 'noSubtitles'>
}

export function Sidebar({ onClose, onAnalyze }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('summary')
  const [language, setLang] = useState<Language>(getLanguage() as Language)

  function switchLanguage(lang: 'zh' | 'en') {
    setLanguage(lang)
    setLang(lang)
  }

  return (
    <div id="fact-checker-sidebar-root">
      <div className="fc-header">
        <span className="fc-title">Fact Checker</span>
        <div className="fc-lang-toggle">
          <button
            className={`fc-lang-btn ${language === 'zh' ? 'active' : ''}`}
            onClick={() => switchLanguage('zh')}
            aria-label="中文"
          >
            中文
          </button>
          <button
            className={`fc-lang-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => switchLanguage('en')}
            aria-label="EN"
          >
            EN
          </button>
        </div>
        <button className="fc-close-btn" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="fc-tabs" role="tablist">
        <button
          role="tab"
          className="fc-tab"
          aria-selected={activeTab === 'summary'}
          onClick={() => setActiveTab('summary')}
        >
          {t('summary')}
        </button>
        <button
          role="tab"
          className="fc-tab"
          aria-selected={activeTab === 'factcheck'}
          onClick={() => setActiveTab('factcheck')}
        >
          {t('factCheck')}
        </button>
      </div>

      {activeTab === 'summary' ? (
        <SummaryTab
          language={language}
          onAnalyze={lang => onAnalyze('summary', lang)}
          onWhisperConfirm={lang => onAnalyze('summary', lang)}
        />
      ) : (
        <FactCheckTab
          language={language}
          onAnalyze={lang => onAnalyze('factcheck', lang)}
          onWhisperConfirm={lang => onAnalyze('factcheck', lang)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 7: Write src/sidebar/index.tsx**

```typescript
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Sidebar } from './Sidebar'
import type { AnalysisType, Language } from '../shared/types'

// Called by the content script after injecting the container.
// onAnalyze: content script handles transcript fetch + sends ANALYZE to background.
export function mountSidebar(
  container: HTMLElement,
  onClose: () => void,
  onAnalyze: (type: AnalysisType, lang: Language) => Promise<'ok' | 'noSubtitles'>
) {
  const root = createRoot(container)
  root.render(
    <Sidebar onClose={onClose} onAnalyze={onAnalyze} />
  )
  return root
}
```

- [ ] **Step 8: Run sidebar tests**

```bash
npm test -- tests/sidebar/Sidebar.test.tsx
```

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/sidebar/ tests/sidebar/
git commit -m "feat: add sidebar React components with tabs, language toggle, and streaming results"
```

---

## Task 14: Content Script

**Files:**
- Create: `src/content/index.ts`

Detects video page, injects sidebar, and provides the `onAnalyze` callback to the sidebar. The callback fetches the transcript and sends the enriched ANALYZE message to the background. Background streams chunks back via `chrome.tabs.sendMessage`, which the sidebar receives via `chrome.runtime.onMessage`.

**Key architecture:** Sidebar → content script (callback) → background (sendMessage) → content script/sidebar (tabs.sendMessage via onMessage).

- [ ] **Step 1: Write src/content/index.ts**

```typescript
import type { Root } from 'react-dom/client'
import { detectVideoPage, getTranscript } from '../services/transcript/index'
import { getSettings } from '../shared/storage'
import { setLanguage } from '../shared/i18n'
import { transcribeWithWhisper } from '../services/whisper/index'
import type { AnalysisType, Language } from '../shared/types'
import type { BackgroundMessage, ContentMessage } from '../shared/messages'

let sidebarRoot: Root | null = null
let sidebarContainer: HTMLElement | null = null
let isVisible = false

async function init() {
  const videoInfo = detectVideoPage()
  if (!videoInfo) return

  const settings = await getSettings()
  const defaultLang = settings.defaultLanguage === 'auto' ? 'zh' : settings.defaultLanguage
  setLanguage(defaultLang as 'zh' | 'en')

  // Listen for TOGGLE_SIDEBAR messages from popup
  chrome.runtime.onMessage.addListener((msg: ContentMessage) => {
    if (msg.type === 'TOGGLE_SIDEBAR') {
      toggleSidebar(videoInfo.videoId, videoInfo.platform)
    }
  })
}

async function handleAnalyze(
  type: AnalysisType,
  lang: Language,
  videoId: string,
  platform: 'youtube' | 'bilibili',
  useWhisper = false
): Promise<'ok' | 'noSubtitles'> {
  const settings = await getSettings()
  const effectiveLang = lang === 'auto' ? 'zh' : lang

  let transcript = null

  if (useWhisper) {
    // Whisper path: get audio URL from the page and transcribe
    // YouTube audio URL is extracted from ytInitialPlayerResponse.streamingData
    const scriptTags = Array.from(document.scripts)
    let audioUrl: string | null = null

    for (const script of scriptTags) {
      if (script.textContent?.includes('ytInitialPlayerResponse')) {
        try {
          const match = script.textContent.match(/"url":"(https:\/\/[^"]*\.googlevideo[^"]*)"/)
          if (match) { audioUrl = match[1]; break }
        } catch { /* continue */ }
      }
    }

    if (!audioUrl) return 'noSubtitles'

    const text = await transcribeWithWhisper(settings.openaiApiKey, audioUrl)
    transcript = {
      videoId, platform, language: lang as string,
      segments: [{ text, startMs: 0, durationMs: 0 }],
      fullText: text,
    }
  } else {
    const result = await getTranscript(videoId, platform, effectiveLang as 'zh' | 'en')
    if (!result.transcript) return 'noSubtitles'
    transcript = result.transcript
  }

  const msg: BackgroundMessage = {
    type: 'ANALYZE',
    videoId,
    analysisType: type,
    language: lang,
    transcript,
  }
  chrome.runtime.sendMessage(msg)
  return 'ok'
}

async function toggleSidebar(videoId: string, platform: 'youtube' | 'bilibili') {
  if (isVisible) {
    hideSidebar()
    return
  }

  if (!sidebarContainer) {
    sidebarContainer = document.createElement('div')
    sidebarContainer.id = 'fact-checker-root'
    document.body.appendChild(sidebarContainer)
  }

  sidebarContainer.style.display = ''

  const { mountSidebar } = await import('../sidebar/index')
  sidebarRoot = mountSidebar(
    sidebarContainer,
    hideSidebar,
    (type, lang) => handleAnalyze(type, lang, videoId, platform)
  )
  isVisible = true
}

function hideSidebar() {
  if (sidebarContainer) {
    sidebarContainer.style.display = 'none'
  }
  isVisible = false
}

init()
```

- [ ] **Step 2: Commit**

```bash
git add src/content/index.ts
git commit -m "feat: add content script for sidebar injection and transcript fetching"
```

---

## Task 15: Popup Component

**Files:**
- Create: `src/popup/Popup.tsx`
- Create: `src/popup/index.tsx`
- Test: `tests/popup/Popup.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/popup/Popup.test.tsx
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Popup } from '../../src/popup/Popup'

beforeEach(() => {
  ;(chrome.tabs.query as jest.Mock).mockResolvedValue([{ id: 1, url: 'https://www.youtube.com/watch?v=abc' }])
  ;(chrome.tabs.sendMessage as jest.Mock).mockResolvedValue({})
})

describe('Popup', () => {
  it('shows open panel button on video pages', async () => {
    render(<Popup />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open analysis panel/i })).toBeInTheDocument()
    })
  })

  it('sends TOGGLE_SIDEBAR message when open panel is clicked', async () => {
    render(<Popup />)
    await waitFor(() => screen.getByRole('button', { name: /open analysis panel/i }))
    fireEvent.click(screen.getByRole('button', { name: /open analysis panel/i }))
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, { type: 'TOGGLE_SIDEBAR' })
  })

  it('shows non-video-page message on non-video pages', async () => {
    ;(chrome.tabs.query as jest.Mock).mockResolvedValue([{ id: 2, url: 'https://google.com' }])
    render(<Popup />)
    await waitFor(() => {
      expect(screen.getByText(/youtube or bilibili/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/popup/Popup.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Write src/popup/Popup.tsx**

```typescript
import React, { useEffect, useState } from 'react'
import { t, setLanguage } from '../shared/i18n'
import { getSettings } from '../shared/storage'

type PageType = 'youtube' | 'bilibili' | 'other' | 'loading'

function detectPageType(url: string): PageType {
  if (url.includes('youtube.com/watch')) return 'youtube'
  if (url.includes('bilibili.com/video/')) return 'bilibili'
  return 'other'
}

export function Popup() {
  const [pageType, setPageType] = useState<PageType>('loading')
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const settings = await getSettings()
      const lang = settings.defaultLanguage === 'auto' ? 'zh' : settings.defaultLanguage
      setLanguage(lang as 'zh' | 'en')

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const tab = tabs[0]
      if (tab?.id) setCurrentTabId(tab.id)
      setPageType(tab?.url ? detectPageType(tab.url) : 'other')
    }
    load()
  }, [])

  function openPanel() {
    if (currentTabId == null) return
    chrome.tabs.sendMessage(currentTabId, { type: 'TOGGLE_SIDEBAR' })
    window.close()
  }

  return (
    <div style={{ width: 240, padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Fact Checker</h3>
      {pageType === 'loading' && <p style={{ color: '#6b7280', fontSize: 13 }}>Loading…</p>}
      {(pageType === 'youtube' || pageType === 'bilibili') && (
        <button
          onClick={openPanel}
          style={{
            width: '100%', padding: '9px 0', background: '#2563eb',
            color: '#fff', border: 'none', borderRadius: 6,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
          aria-label={t('openPanel')}
        >
          {t('openPanel')}
        </button>
      )}
      {pageType === 'other' && (
        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{t('notVideoPage')}</p>
      )}
      <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
        <a
          href="#"
          onClick={e => { e.preventDefault(); chrome.runtime.openOptionsPage() }}
          style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}
        >
          ⚙ {t('settings')}
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write src/popup/index.tsx**

```typescript
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Popup } from './Popup'

const container = document.getElementById('root')!
createRoot(container).render(<Popup />)
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- tests/popup/Popup.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/popup/ tests/popup/
git commit -m "feat: add toolbar popup component"
```

---

## Task 16: Options / Settings Page

**Files:**
- Create: `src/options/Options.tsx`
- Create: `src/options/index.tsx`
- Test: `tests/options/Options.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/options/Options.test.tsx
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Options } from '../../src/options/Options'

beforeEach(() => {
  ;(chrome.storage.local.get as jest.Mock).mockResolvedValue({})
})

describe('Options', () => {
  it('renders all settings fields', async () => {
    render(<Options />)
    await waitFor(() => {
      expect(screen.getByLabelText(/claude api key/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/openai api key/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('saves settings when save button is clicked', async () => {
    render(<Options />)
    await waitFor(() => screen.getByLabelText(/claude api key/i))

    fireEvent.change(screen.getByLabelText(/claude api key/i), {
      target: { value: 'sk-ant-new' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/options/Options.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Write src/options/Options.tsx**

```typescript
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
```

- [ ] **Step 4: Write src/options/index.tsx**

```typescript
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Options } from './Options'

const container = document.getElementById('root')!
createRoot(container).render(<Options />)
```

- [ ] **Step 5: Run test**

```bash
npm test -- tests/options/Options.test.tsx
```

Expected: PASS

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 7: Build the extension**

```bash
npm run build
```

Expected: `dist/` directory contains all extension files, no build errors.

- [ ] **Step 8: Commit**

```bash
git add src/options/ tests/options/
git commit -m "feat: add options/settings page with API key management"
```

---

## Task 17: End-to-End Verification

Manual verification steps before considering the extension complete.

- [ ] **Step 1: Load unpacked extension in Chrome**

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `dist/` directory
4. Verify the extension icon appears in the toolbar

- [ ] **Step 2: Test on a YouTube video with auto-captions**

1. Open `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
2. Click the Fact Checker toolbar icon
3. Click "Open Analysis Panel"
4. Verify sidebar slides in from the right
5. Click "Start Analysis" on the Summary tab
6. Verify loading spinner appears, then streamed text output

- [ ] **Step 3: Test on a Bilibili video**

1. Open a Bilibili video at `https://www.bilibili.com/video/BV...`
2. Repeat steps 2–6 from above

- [ ] **Step 4: Test language toggle**

1. Open sidebar on any video
2. Click "EN" in the header
3. Click "Start Analysis" — verify AI output is in English
4. Click "中文" — click "Start Analysis" — verify Chinese output

- [ ] **Step 5: Test settings page**

1. Click ⚙ Settings in popup
2. Enter Claude and OpenAI API keys
3. Click "Save Settings"
4. Verify "Settings saved!" confirmation appears
5. Close and reopen settings — verify keys are still populated

- [ ] **Step 6: Test Whisper fallback**

1. Open a YouTube video known to have no captions
2. Open Analysis Panel and click "Start Analysis"
3. Verify Whisper prompt card appears with confirm/cancel buttons

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "feat: complete fact-checker Chrome extension v1.0"
```
