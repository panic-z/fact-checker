import { streamAnalysis } from '../../../src/services/ai/index'
import * as claude from '../../../src/services/ai/claude'
import * as openai from '../../../src/services/ai/openai'
import * as openrouter from '../../../src/services/ai/openrouter'
import type { Settings } from '../../../src/shared/types'

jest.mock('../../../src/services/ai/claude')
jest.mock('../../../src/services/ai/openai')
jest.mock('../../../src/services/ai/openrouter')

async function* mockStream(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) yield chunk
}

const BASE_SETTINGS: Settings = {
  claudeApiKey: 'sk-ant-test',
  claudeModel: 'claude-sonnet-4-6',
  openaiApiKey: 'sk-openai-test',
  openaiModel: 'gpt-4o',
  openrouterApiKey: 'sk-or-test',
  openrouterModel: 'openai/gpt-4o',
  defaultProvider: 'claude',
  defaultLanguage: 'zh',
}

describe('AI orchestrator', () => {
  it('routes to Claude when defaultProvider is claude', async () => {
    ;(claude.streamClaude as jest.Mock).mockReturnValue(mockStream(['Hello', ' world']))

    const chunks: string[] = []
    for await (const chunk of streamAnalysis(BASE_SETTINGS, 'summary', 'transcript text', 'zh')) {
      chunks.push(chunk)
    }

    expect(claude.streamClaude).toHaveBeenCalledWith('sk-ant-test', 'claude-sonnet-4-6', expect.any(String))
    expect(chunks).toEqual(['Hello', ' world'])
  })

  it('routes to OpenAI when defaultProvider is openai', async () => {
    ;(openai.streamOpenAI as jest.Mock).mockReturnValue(mockStream(['Hi']))

    const settings = { ...BASE_SETTINGS, defaultProvider: 'openai' as const }
    const chunks: string[] = []
    for await (const chunk of streamAnalysis(settings, 'factcheck', 'transcript', 'en')) {
      chunks.push(chunk)
    }

    expect(openai.streamOpenAI).toHaveBeenCalledWith('sk-openai-test', 'gpt-4o', expect.any(String))
    expect(chunks).toEqual(['Hi'])
  })

  it('routes to OpenRouter when defaultProvider is openrouter', async () => {
    ;(openrouter.streamOpenRouter as jest.Mock).mockReturnValue(mockStream(['From OR']))

    const settings = { ...BASE_SETTINGS, defaultProvider: 'openrouter' as const }
    const chunks: string[] = []
    for await (const chunk of streamAnalysis(settings, 'summary', 'transcript', 'zh')) {
      chunks.push(chunk)
    }

    expect(openrouter.streamOpenRouter).toHaveBeenCalledWith('sk-or-test', 'openai/gpt-4o', expect.any(String))
    expect(chunks).toEqual(['From OR'])
  })
})
