import { getTranscript } from '../../../src/services/transcript/index'
import * as bilibili from '../../../src/services/transcript/bilibili'
import type { Transcript } from '../../../src/shared/types'

const MOCK_TRANSCRIPT: Transcript = {
  videoId: 'BV1abc',
  platform: 'bilibili',
  language: 'zh-CN',
  segments: [{ text: '你好', startMs: 0, durationMs: 1000 }],
  fullText: '你好',
}

jest.mock('../../../src/services/transcript/bilibili')

describe('transcript orchestrator', () => {
  beforeEach(() => {
    ;(chrome.storage.session.get as jest.Mock).mockResolvedValue({})
  })

  it('returns cached transcript if available', async () => {
    const cacheKey = 'fc_transcript_BV1abc'
    ;(chrome.storage.session.get as jest.Mock).mockResolvedValue({
      [cacheKey]: MOCK_TRANSCRIPT,
    })

    const result = await getTranscript('BV1abc')
    expect(result.transcript).toEqual(MOCK_TRANSCRIPT)
    expect(bilibili.fetchBilibiliTranscript).not.toHaveBeenCalled()
  })

  it('fetches from Bilibili when not cached', async () => {
    ;(bilibili.fetchBilibiliTranscript as jest.Mock).mockResolvedValue(MOCK_TRANSCRIPT)

    const result = await getTranscript('BV1abc')
    expect(result.transcript).toEqual(MOCK_TRANSCRIPT)
    expect(chrome.storage.session.set).toHaveBeenCalled()
  })

  it('returns noSubtitles reason when fetch returns null', async () => {
    ;(bilibili.fetchBilibiliTranscript as jest.Mock).mockResolvedValue(null)

    const result = await getTranscript('BV1abc')
    expect(result.transcript).toBeNull()
    expect(result.reason).toBe('noSubtitles')
  })
})
