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
