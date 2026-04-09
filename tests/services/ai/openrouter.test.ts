import { streamOpenRouter } from '../../../src/services/ai/openrouter'
import { ApiError } from '../../../src/services/ai/claude'

function makeStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)))
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

describe('OpenRouter client', () => {
  it('yields text chunks from SSE stream', async () => {
    const sseChunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ]

    global.fetch = jest.fn().mockResolvedValue(makeStreamResponse(sseChunks))

    const chunks: string[] = []
    for await (const chunk of streamOpenRouter('sk-or-test', 'openai/gpt-4o', 'Hello prompt')) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual(['Hello', ' world'])
  })

  it('sends request to openrouter.ai endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue(makeStreamResponse(['data: [DONE]\n\n']))

    for await (const _ of streamOpenRouter('sk-or-test', 'openai/gpt-4o', 'prompt')) { /* drain */ }

    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer sk-or-test' }),
      })
    )
  })

  it('throws ApiError with invalidKey type on 401', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 }))

    const gen = streamOpenRouter('bad-key', 'openai/gpt-4o', 'prompt')
    await expect(gen.next()).rejects.toBeInstanceOf(ApiError)
    await expect(streamOpenRouter('bad-key', 'openai/gpt-4o', 'prompt').next()).rejects.toMatchObject({ type: 'invalidKey' })
  })
})
