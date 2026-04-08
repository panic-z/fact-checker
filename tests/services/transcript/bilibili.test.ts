import { extractBilibiliState, parseBilibiliSubtitle, buildTranscript } from '../../../src/services/transcript/bilibili'

const MOCK_INITIAL_STATE = {
  videoData: {
    bvid: 'BV1xx411c7mD',
    cid: 12345678,
  },
}

const MOCK_SUBTITLE_JSON = {
  body: [
    { from: 0.5, to: 3.0, content: '你好世界' },
    { from: 3.5, to: 6.0, content: '这是一个测试' },
  ],
}

describe('Bilibili transcript', () => {
  describe('extractBilibiliState', () => {
    it('extracts initial state from script text', () => {
      const scriptText = `window.__INITIAL_STATE__=${JSON.stringify(MOCK_INITIAL_STATE)};`
      const result = extractBilibiliState(scriptText)
      expect(result).not.toBeNull()
      const videoData = result?.videoData as { bvid?: string } | undefined
      expect(videoData?.bvid).toBe('BV1xx411c7mD')
    })

    it('returns null when no initial state found', () => {
      expect(extractBilibiliState('var x = 1;')).toBeNull()
    })
  })

  describe('parseBilibiliSubtitle', () => {
    it('converts bilibili subtitle body to transcript segments', () => {
      const segments = parseBilibiliSubtitle(MOCK_SUBTITLE_JSON.body)
      expect(segments).toHaveLength(2)
      expect(segments[0].text).toBe('你好世界')
      expect(segments[0].startMs).toBe(500)
      expect(segments[0].durationMs).toBe(2500)
      expect(segments[1].text).toBe('这是一个测试')
    })
  })

  describe('buildTranscript', () => {
    it('builds transcript with platform set to bilibili', () => {
      const segments = parseBilibiliSubtitle(MOCK_SUBTITLE_JSON.body)
      const transcript = buildTranscript('BV1xx411c7mD', 'zh-CN', segments)
      expect(transcript.platform).toBe('bilibili')
      expect(transcript.fullText).toBe('你好世界 这是一个测试')
    })
  })
})
