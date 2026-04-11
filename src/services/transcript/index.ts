import type { Transcript } from '../../shared/types'
import { getCachedTranscript, setCachedTranscript } from '../../shared/storage'
import { fetchBilibiliTranscript } from './bilibili'

export interface TranscriptResult {
  transcript: Transcript | null
  reason: 'ok' | 'noSubtitles' | 'error'
  error?: string
}

export async function getTranscript(videoId: string): Promise<TranscriptResult> {
  const cached = await getCachedTranscript(videoId)
  if (cached) return { transcript: cached, reason: 'ok' }

  try {
    const transcript = await fetchBilibiliTranscript(videoId)
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

export function detectVideoPage(): { videoId: string } | null {
  const url = window.location.href
  const biliMatch = url.match(/bilibili\.com\/video\/(BV[\w]+)/)
  if (biliMatch) return { videoId: biliMatch[1] }
  return null
}
