// tests/setup.ts
import '@testing-library/jest-dom'
import { webcrypto } from 'crypto'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill Web Crypto API for jsdom (not available by default)
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  writable: false,
})

// Polyfill TextEncoder/TextDecoder for jsdom
Object.assign(global, { TextEncoder, TextDecoder })

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
