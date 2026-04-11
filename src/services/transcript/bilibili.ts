import SparkMD5 from 'spark-md5'
import type { Transcript, TranscriptSegment } from '../../shared/types'

// Bilibili WBI signing. The player v2 endpoint now requires w_rid/wts
// params signed with a "mixin key" derived from two keys exposed via
// /x/web-interface/nav. Without signing, `subtitles` comes back empty.

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
]

let cachedMixinKey: { key: string; fetchedAt: number } | null = null

async function getMixinKey(): Promise<string | null> {
  if (cachedMixinKey && Date.now() - cachedMixinKey.fetchedAt < 6 * 60 * 60 * 1000) {
    return cachedMixinKey.key
  }
  try {
    const resp = await fetch('https://api.bilibili.com/x/web-interface/nav', {
      credentials: 'include',
    })
    if (!resp.ok) return null
    const data = await resp.json() as {
      data?: { wbi_img?: { img_url?: string; sub_url?: string } }
    }
    const imgUrl = data.data?.wbi_img?.img_url
    const subUrl = data.data?.wbi_img?.sub_url
    if (!imgUrl || !subUrl) return null
    const imgKey = imgUrl.slice(imgUrl.lastIndexOf('/') + 1).split('.')[0]
    const subKey = subUrl.slice(subUrl.lastIndexOf('/') + 1).split('.')[0]
    const raw = imgKey + subKey
    const mixin = MIXIN_KEY_ENC_TAB.map(i => raw[i]).join('').slice(0, 32)
    cachedMixinKey = { key: mixin, fetchedAt: Date.now() }
    return mixin
  } catch {
    return null
  }
}

async function signWbi(params: Record<string, string | number>): Promise<string | null> {
  const mixin = await getMixinKey()
  if (!mixin) return null
  const wts = Math.floor(Date.now() / 1000)
  const all: Record<string, string | number> = { ...params, wts }
  const sortedKeys = Object.keys(all).sort()
  const query = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(all[k]).replace(/[!'()*]/g, ''))}`)
    .join('&')
  const wRid = SparkMD5.hash(query + mixin)
  return `${query}&w_rid=${wRid}`
}

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
  const match = /window\.__INITIAL_STATE__\s*=\s*/.exec(scriptText)
  if (!match) return null
  const idx = match.index + match[0].length

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

async function fetchVideoInfo(bvid: string): Promise<{ aid?: number; cid?: number } | null> {
  try {
    const resp = await fetch(
      `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
      { credentials: 'include' }
    )
    if (!resp.ok) return null
    const json = await resp.json() as {
      code?: number
      message?: string
      data?: { aid?: number; cid?: number }
    }
    if (json.code !== 0) {
      console.warn('[FactChecker/bilibili] view API error:', json.code, json.message)
      return null
    }
    return { aid: json.data?.aid, cid: json.data?.cid }
  } catch (err) {
    console.warn('[FactChecker/bilibili] view API fetch failed:', err)
    return null
  }
}

export async function fetchBilibiliTranscript(bvid: string): Promise<Transcript | null> {
  const log = (...args: unknown[]) => console.log('[FactChecker/bilibili]', ...args)

  const info = await fetchVideoInfo(bvid)
  if (!info?.cid) {
    console.warn('[FactChecker/bilibili] could not resolve cid for', bvid)
    return null
  }
  const { aid, cid } = info
  log('resolved aid=', aid, 'cid=', cid, 'bvid=', bvid)

  const signed = await signWbi({ aid: aid ?? '', bvid, cid, isGaiaAvoided: 'true', web_location: 1315873 })
  log('wbi signed params:', signed ? 'ok' : 'failed (fallback to unsigned)')
  const playerUrl = signed
    ? `https://api.bilibili.com/x/player/wbi/v2?${signed}`
    : `https://api.bilibili.com/x/player/v2?bvid=${bvid}&cid=${cid}`
  log('fetching', playerUrl)
  const playerResp = await fetch(playerUrl, { credentials: 'include' })
  log('player response status:', playerResp.status)
  if (!playerResp.ok) {
    console.warn('[FactChecker/bilibili] player fetch failed', playerResp.status)
    return null
  }

  const playerData = await playerResp.json() as {
    code?: number
    message?: string
    data?: { subtitle?: { subtitles?: BilibiliSubtitleInfo[] } }
  }
  log('player API code:', playerData.code, 'message:', playerData.message)
  if (playerData.code !== 0 && playerData.code !== undefined) {
    console.warn('[FactChecker/bilibili] API error:', playerData.code, playerData.message)
    return null
  }
  const subtitles = playerData.data?.subtitle?.subtitles
  log('subtitles returned:', subtitles?.map(s => s.lan) ?? 'none')
  if (!subtitles || subtitles.length === 0) {
    console.warn('[FactChecker/bilibili] no subtitles returned. Are you logged in to Bilibili? AI subtitles require login.')
    return null
  }

  const preferred =
    subtitles.find(s => s.lan === 'zh-CN' || s.lan === 'zh-Hans') ??
    subtitles.find(s => s.lan.startsWith('zh')) ??
    subtitles.find(s => s.lan.startsWith('ai-zh') || s.lan.startsWith('ai-')) ??
    subtitles[0]
  log('preferred subtitle:', preferred.lan, 'url:', preferred.subtitle_url)
  const subtitleUrl = preferred.subtitle_url.startsWith('//')
    ? `https:${preferred.subtitle_url}`
    : preferred.subtitle_url
  if (!subtitleUrl) {
    console.warn('[FactChecker/bilibili] subtitle_url empty for', preferred.lan)
    return null
  }

  const subtitleResp = await fetch(subtitleUrl)
  log('subtitle fetch status:', subtitleResp.status)
  if (!subtitleResp.ok) return null

  const subtitleJson = await subtitleResp.json() as { body: BilibiliSubtitleEntry[] }
  const segments = parseBilibiliSubtitle(subtitleJson.body)
  log('parsed segments:', segments.length)

  return buildTranscript(bvid, preferred.lan, segments)
}
