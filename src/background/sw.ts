import { getSettings } from '../shared/storage'
import { streamAnalysis } from '../services/ai/index'
import { ApiError } from '../services/ai/claude'
import type { BackgroundMessage, ContentMessage } from '../shared/messages'

// Allow content scripts to read session storage (for transcript cache)
chrome.storage.session
  .setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
  .catch(() => { /* already set or unsupported */ })

chrome.action.onClicked.addListener(async (tab) => {
  let targetTabId = tab.id
  if (!targetTabId) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    targetTabId = activeTab?.id
  }
  if (!targetTabId) return

  chrome.tabs.sendMessage(targetTabId, { type: 'TOGGLE_SIDEBAR' }).catch(() => {
    // Ignore non-video pages where content script is not injected
  })
})


chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, sender, sendResponse) => {
    if (message.type === 'ANALYZE') {
      handleAnalyze(message, sender.tab?.id)
      sendResponse({ ok: true })
    } else if (message.type === 'OPEN_OPTIONS') {
      chrome.runtime.openOptionsPage().then(() => {
        sendResponse({ ok: true })
      }).catch(() => {
        sendResponse({ ok: false })
      })
      return true
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
      details: err instanceof Error ? err.message : undefined,
    }
    chrome.tabs.sendMessage(tabId, errorMsg).catch(() => {})
  }
}
