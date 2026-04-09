export type Language = 'zh' | 'en' | 'auto'
export type AIProvider = 'claude' | 'openai' | 'openrouter'
export type AnalysisType = 'summary' | 'factcheck'
export type AnalysisStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

export interface Settings {
  claudeApiKey: string
  claudeModel: string
  openaiApiKey: string
  openaiModel: string
  openrouterApiKey: string
  openrouterModel: string
  defaultProvider: AIProvider
  defaultLanguage: Language
}

export const DEFAULT_SETTINGS: Settings = {
  claudeApiKey: '',
  claudeModel: 'claude-sonnet-4-6',
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  openrouterApiKey: '',
  openrouterModel: 'openai/gpt-4o',
  defaultProvider: 'claude',
  defaultLanguage: 'zh',
}

export interface TranscriptSegment {
  text: string
  startMs: number
  durationMs: number
}

export interface Transcript {
  videoId: string
  platform: 'youtube' | 'bilibili'
  language: string
  segments: TranscriptSegment[]
  fullText: string
}
