import type { Root } from 'react-dom/client'
import { detectVideoPage, getTranscript } from '../services/transcript/index'
import { getSettings } from '../shared/storage'
import { setLanguage } from '../shared/i18n'
import { mountSidebar } from '../sidebar/index'
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

  chrome.runtime.onMessage.addListener((msg: ContentMessage) => {
    if (msg.type === 'TOGGLE_SIDEBAR') {
      toggleSidebar(videoInfo.videoId)
    }
  })
}

async function handleAnalyze(
  type: AnalysisType,
  lang: Language,
  videoId: string
): Promise<'ok' | 'noSubtitles'> {
  const result = await getTranscript(videoId)
  if (!result.transcript) return 'noSubtitles'

  const msg: BackgroundMessage = {
    type: 'ANALYZE',
    videoId,
    analysisType: type,
    language: lang,
    transcript: result.transcript,
  }
  chrome.runtime.sendMessage(msg)
  return 'ok'
}

async function toggleSidebar(videoId: string) {
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

  sidebarRoot = mountSidebar(
    sidebarContainer,
    hideSidebar,
    (type, lang) => handleAnalyze(type, lang, videoId)
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
