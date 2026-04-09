import { ApiError, classifyApiError } from './claude'

export async function* streamOpenRouter(
  apiKey: string,
  model: string,
  prompt: string
): AsyncGenerator<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/fact-checker-extension',
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new ApiError(classifyApiError(response.status), `OpenRouter API error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new ApiError('network', 'No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return

      try {
        const event = JSON.parse(data) as {
          choices: Array<{ delta: { content?: string } }>
        }
        const text = event.choices?.[0]?.delta?.content
        if (text) yield text
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}
