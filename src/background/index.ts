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
