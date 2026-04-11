import { ApiError, classifyApiError } from './claude'

export async function* streamOpenRouter(
  apiKey: string,
  model: string,
  prompt: string
): AsyncGenerator<string> {
  console.log('[FactChecker/openrouter] request', { model, keyLen: apiKey.length, keyPrefix: apiKey.slice(0, 10) })
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/fact-checker-extension',
      'X-Title': 'Fact Checker',
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  console.log('[FactChecker/openrouter] response status', response.status)

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '<unreadable>')
    console.error('[FactChecker/openrouter] error body:', bodyText)
    throw new ApiError(classifyApiError(response.status), `OpenRouter API error: ${response.status} ${bodyText.slice(0, 200)}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new ApiError('network', 'No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  let sawFirstByte = false
  let sawFirstContent = false
  let reasoningOpen = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    if (!sawFirstByte) {
      sawFirstByte = true
      console.log('[FactChecker/openrouter] first bytes received')
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return

      try {
        const event = JSON.parse(data) as {
          choices: Array<{ delta: { content?: string; reasoning?: string } }>
        }
        const delta = event.choices?.[0]?.delta
        const reasoning = delta?.reasoning
        const text = delta?.content
        if (reasoning) {
          if (!reasoningOpen) {
            reasoningOpen = true
            yield '%%REASONING_START%%'
          }
          yield reasoning
        }
        if (text) {
          if (reasoningOpen) {
            reasoningOpen = false
            yield '%%REASONING_END%%'
          }
          if (!sawFirstContent) {
            sawFirstContent = true
            console.log('[FactChecker/openrouter] first content token')
          }
          yield text
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}
