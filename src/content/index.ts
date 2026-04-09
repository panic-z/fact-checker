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
