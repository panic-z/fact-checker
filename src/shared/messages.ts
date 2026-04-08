import type { AnalysisType, Language, Transcript } from './types'

export type BackgroundMessage =
  | { type: 'ANALYZE'; videoId: string; analysisType: AnalysisType; language: Language; transcript: Transcript }

export type ContentMessage =
  | { type: 'ANALYSIS_CHUNK'; chunk: string; analysisType: AnalysisType }
  | { type: 'ANALYSIS_DONE'; analysisType: AnalysisType }
  | { type: 'ANALYSIS_ERROR'; error: string; analysisType: AnalysisType }
  | { type: 'TOGGLE_SIDEBAR' }
