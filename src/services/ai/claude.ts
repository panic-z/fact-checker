export type ApiErrorType = 'invalidKey' | 'quotaExceeded' | 'network'

export class ApiError extends Error {
  constructor(public type: ApiErrorType, message: string) {
    super(message)
  }
}

export function classifyApiError(status: number): ApiErrorType {
  if (status === 401 || status === 403) return 'invalidKey'
  if (status === 429) return 'quotaExceeded'
  return 'network'
}

export async function* streamClaude(
  apiKey: string,
  model: string,
  prompt: string
): AsyncGenerator<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new ApiError(classifyApiError(response.status), `Claude API error: ${response.status}`)
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
          type: string
          delta?: { type: string; text?: string }
        }
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
          yield event.delta.text
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}
