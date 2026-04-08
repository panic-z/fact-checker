import { streamClaude, classifyApiError } from '../../../src/services/ai/claude'

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

describe('Claude client', () => {
  describe('classifyApiError', () => {
    it('returns invalidKey for 401', () => {
      expect(classifyApiError(401)).toBe('invalidKey')
    })
    it('returns quotaExceeded for 429', () => {
      expect(classifyApiError(429)).toBe('quotaExceeded')
    })
    it('returns network for other status codes', () => {
      expect(classifyApiError(500)).toBe('network')
    })
  })

  describe('streamClaude', () => {
    it('yields text chunks from SSE stream', async () => {
      const sseChunks = [
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}\n\n',
        'data: {"type":"message_stop"}\n\n',
      ]

      global.fetch = jest.fn().mockResolvedValue(makeStreamResponse(sseChunks))

      const chunks: string[] = []
      for await (const chunk of streamClaude('sk-ant-test', 'claude-sonnet-4-6', 'Hello prompt')) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hello', ' world'])
    })

    it('throws error with type when API returns 401', async () => {
      global.fetch = jest.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 }))

      const gen = streamClaude('bad-key', 'claude-sonnet-4-6', 'prompt')
      await expect(gen.next()).rejects.toMatchObject({ type: 'invalidKey' })
    })
  })
})
