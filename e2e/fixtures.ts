import { test as base, chromium } from '@playwright/test'
import type { BrowserContext, Page, Worker } from '@playwright/test'
import { EXTENSION_PATH } from '../playwright.config'

export interface ExtensionFixtures {
  context: BrowserContext
  extensionId: string
  serviceWorker: Worker
  /** Navigate to a mock YouTube video page with transcript data injected */
  youtubeVideoPage: (videoId?: string) => Promise<Page>
}

export const test = base.extend<ExtensionFixtures>({
  // Each test gets a fresh persistent context with the extension loaded
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
      ],
    })
    await use(context)
    await context.close()
  },

  serviceWorker: async ({ context }, use) => {
    let [sw] = context.serviceWorkers()
    if (!sw) {
      sw = await context.waitForEvent('serviceworker')
    }
    // Wait for the service worker to become active
    await sw.evaluate(() => new Promise<void>(resolve => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((self as any).registration?.active) {
        resolve()
      } else {
        self.addEventListener('activate', () => resolve(), { once: true })
      }
    })).catch(() => { /* already active */ })
    await use(sw)
  },

  extensionId: async ({ serviceWorker }, use) => {
    const url = serviceWorker.url()
    const id = url.split('/')[2]
    await use(id)
  },

  youtubeVideoPage: async ({ context }, use) => {
    const factory = async (videoId = 'test123') => {
      const page = await context.newPage()

      // The CRXJS Vite build uses a preload helper that resolves asset paths
      // relative to the host origin (e.g. /assets/sidebar.css on youtube.com).
      // Those requests 404, and Vite's error handler throws, aborting the dynamic
      // import. We prevent that by:
      //   1. Intercepting /assets/** on youtube.com and returning empty responses.
      //   2. Installing a page-level vite:preloadError handler that cancels the error.
      await page.route('*://www.youtube.com/assets/**', route => {
        const url = route.request().url()
        const contentType = url.endsWith('.css') ? 'text/css' : 'application/javascript'
        route.fulfill({ contentType, body: '' })
      })

      // Prevent vite:preloadError from throwing (CSS already injected by manifest).
      await page.addInitScript(() => {
        window.addEventListener('vite:preloadError', e => e.preventDefault())
      })

      // Mock YouTube video page HTML with embedded ytInitialPlayerResponse
      const timedtextUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`
      const mockYouTubeHtml = buildMockYouTubePage(videoId, timedtextUrl)

      await page.route(`https://www.youtube.com/watch?v=${videoId}`, route =>
        route.fulfill({ contentType: 'text/html', body: mockYouTubeHtml })
      )

      // Mock the timedtext (subtitle) endpoint
      await page.route(timedtextUrl, route =>
        route.fulfill({ contentType: 'text/xml', body: MOCK_TRANSCRIPT_XML })
      )

      await page.goto(`https://www.youtube.com/watch?v=${videoId}`)
      // CRXJS content script loader does an async import(); wait for it to settle
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800)
      return page
    }
    await use(factory)
  },
})

export { expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMockYouTubePage(videoId: string, timedtextUrl: string): string {
  const playerResponse = {
    captions: {
      playerCaptionsTracklistRenderer: {
        captionTracks: [
          {
            baseUrl: timedtextUrl,
            languageCode: 'en',
            name: { simpleText: 'English' },
          },
        ],
      },
    },
  }
  return `<!DOCTYPE html>
<html>
<head><title>Test Video ${videoId}</title></head>
<body>
<script>var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};</script>
<div id="page-manager"><div id="content"></div></div>
</body>
</html>`
}

export const MOCK_TRANSCRIPT_XML = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
  <text start="0.00" dur="3.00">The earth is flat according to some people.</text>
  <text start="3.00" dur="3.00">Scientists have thoroughly debunked this claim.</text>
  <text start="6.00" dur="3.00">Here are five reasons why the moon landing was faked.</text>
</transcript>`

/** Build a mock Claude SSE streaming response body */
export function buildClaudeStreamBody(chunks: string[]): string {
  const lines = chunks.map(text =>
    `data: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } })}\n\n`
  )
  lines.push('data: {"type":"message_stop"}\n\n')
  return lines.join('')
}

/**
 * Send TOGGLE_SIDEBAR to the matching tab from the service worker context.
 * Retries up to 3 times in case the content script is still initializing.
 */
export async function toggleSidebar(sw: Worker, targetUrl: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const sent = await sw.evaluate(async (url: string) => {
      const tabs = await chrome.tabs.query({})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tab = tabs.find((t: any) => t.url?.includes(url))
      if (!tab?.id) return false
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' })
        return true
      } catch {
        return false
      }
    }, targetUrl)
    if (sent) return
    // Brief pause before retry (content script may still be loading)
    await new Promise(r => setTimeout(r, 400))
  }
}
