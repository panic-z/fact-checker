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
