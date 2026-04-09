import type { Settings, AnalysisType, Language } from '../../shared/types'
import { streamClaude } from './claude'
import { streamOpenAI } from './openai'
import { buildPrompt } from './prompts'

export async function* streamAnalysis(
  settings: Settings,
  type: AnalysisType,
  transcript: string,
  lang: Language
): AsyncGenerator<string> {
  const prompt = buildPrompt(type, transcript, lang)

  if (settings.defaultProvider === 'claude') {
    yield* streamClaude(settings.claudeApiKey, settings.claudeModel, prompt)
  } else {
    yield* streamOpenAI(settings.openaiApiKey, settings.openaiModel, prompt)
  }
}
