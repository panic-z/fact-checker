// tests/shared/types.test.ts
import '@testing-library/jest-dom'
import type { Settings, Transcript, TranscriptSegment, Language, AIProvider, AnalysisType, AnalysisStatus } from '../../src/shared/types'

describe('shared types', () => {
  it('Settings has all required fields with correct types', () => {
    const settings: Settings = {
      claudeApiKey: 'sk-ant-test',
      claudeModel: 'claude-sonnet-4-6',
      openaiApiKey: 'sk-test',
      openaiModel: 'gpt-4o',
      openrouterApiKey: 'sk-or-test',
      openrouterModel: 'openai/gpt-4o',
      defaultProvider: 'claude',
      defaultLanguage: 'zh',
    }
    expect(settings.claudeModel).toBe('claude-sonnet-4-6')
  })

  it('Transcript has correct structure', () => {
    const segment: TranscriptSegment = { text: 'Hello', startMs: 0, durationMs: 1000 }
    const transcript: Transcript = {
      videoId: 'BV1abc',
      platform: 'bilibili',
      language: 'zh-CN',
      segments: [segment],
      fullText: 'Hello',
    }
    expect(transcript.segments).toHaveLength(1)
  })

  it('type unions are correct', () => {
    const lang: Language = 'auto'
    const provider: AIProvider = 'openai'
    const analysisType: AnalysisType = 'factcheck'
    const status: AnalysisStatus = 'streaming'
    expect(lang).toBe('auto')
    expect(provider).toBe('openai')
    expect(analysisType).toBe('factcheck')
    expect(status).toBe('streaming')
  })
})
