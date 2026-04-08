import { getTranscript } from '../../../src/services/transcript/index'
import * as youtube from '../../../src/services/transcript/youtube'
import * as bilibili from '../../../src/services/transcript/bilibili'
import type { Transcript } from '../../../src/shared/types'

const MOCK_TRANSCRIPT: Transcript = {
  videoId: 'abc123',
  platform: 'youtube',
  language: 'en',
  segments: [{ text: 'Hello', startMs: 0, durationMs: 1000 }],
  fullText: 'Hello',
}

jest.mock('../../../src/services/transcript/youtube')
jest.mock('../../../src/services/transcript/bilibili')

describe('transcript orchestrator', () => {
  beforeEach(() => {
    ;(chrome.storage.session.get as jest.Mock).mockResolvedValue({})
  })

  it('returns cached transcript if available', async () => {
    const cacheKey = 'fc_transcript_abc123'
    ;(chrome.storage.session.get as jest.Mock).mockResolvedValue({
      [cacheKey]: MOCK_TRANSCRIPT,
    })

    const result = await getTranscript('abc123', 'youtube', 'en')
    expect(result.transcript).toEqual(MOCK_TRANSCRIPT)
    expect(youtube.fetchYouTubeTranscript).not.toHaveBeenCalled()
  })

  it('fetches from YouTube when not cached', async () => {
    ;(youtube.fetchYouTubeTranscript as jest.Mock).mockResolvedValue(MOCK_TRANSCRIPT)

    const result = await getTranscript('abc123', 'youtube', 'en')
    expect(result.transcript).toEqual(MOCK_TRANSCRIPT)
    expect(chrome.storage.session.set).toHaveBeenCalled()
  })

  it('returns noSubtitles reason when fetch returns null', async () => {
    ;(youtube.fetchYouTubeTranscript as jest.Mock).mockResolvedValue(null)

    const result = await getTranscript('abc123', 'youtube', 'en')
    expect(result.transcript).toBeNull()
    expect(result.reason).toBe('noSubtitles')
  })

  it('fetches from Bilibili for bilibili platform', async () => {
    const bilibiliTranscript = { ...MOCK_TRANSCRIPT, platform: 'bilibili' as const }
    ;(bilibili.fetchBilibiliTranscript as jest.Mock).mockResolvedValue(bilibiliTranscript)

    const result = await getTranscript('BV1abc', 'bilibili', 'zh')
    expect(result.transcript?.platform).toBe('bilibili')
  })
})
