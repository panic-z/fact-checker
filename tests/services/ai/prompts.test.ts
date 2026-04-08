// tests/services/ai/prompts.test.ts
import { buildSummaryPrompt, buildFactCheckPrompt } from '../../../src/services/ai/prompts'

const TRANSCRIPT = 'Climate change is causing sea levels to rise by 3 meters per year. Scientists agree this will flood all coastal cities by 2025.'

describe('prompts', () => {
  describe('buildSummaryPrompt', () => {
    it('includes transcript in Chinese prompt', () => {
      const prompt = buildSummaryPrompt(TRANSCRIPT, 'zh')
      expect(prompt).toContain(TRANSCRIPT)
      expect(prompt).toContain('中文')
    })

    it('includes transcript in English prompt', () => {
      const prompt = buildSummaryPrompt(TRANSCRIPT, 'en')
      expect(prompt).toContain(TRANSCRIPT)
      expect(prompt).toContain('English')
    })

    it('includes required output sections', () => {
      const prompt = buildSummaryPrompt(TRANSCRIPT, 'en')
      expect(prompt).toContain('key point')
      expect(prompt).toContain('overview')
      expect(prompt).toContain('conclusion')
    })
  })

  describe('buildFactCheckPrompt', () => {
    it('includes transcript in prompt', () => {
      const prompt = buildFactCheckPrompt(TRANSCRIPT, 'zh')
      expect(prompt).toContain(TRANSCRIPT)
    })

    it('asks to identify factual errors and logical fallacies', () => {
      const prompt = buildFactCheckPrompt(TRANSCRIPT, 'en')
      expect(prompt.toLowerCase()).toContain('factual')
      expect(prompt.toLowerCase()).toContain('logical')
    })

    it('handles very long transcripts by truncating to 80000 chars', () => {
      const longTranscript = 'x'.repeat(100000)
      const prompt = buildFactCheckPrompt(longTranscript, 'en')
      expect(prompt.length).toBeLessThan(100000)
    })
  })
})
