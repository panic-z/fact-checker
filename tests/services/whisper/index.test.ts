import { transcribeWithWhisper } from '../../../src/services/whisper/index'

describe('Whisper client', () => {
  it('sends audio to OpenAI Whisper and returns text', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(
        new Response(new ArrayBuffer(100), {
          status: 200,
          headers: { 'Content-Type': 'audio/mp4' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ text: 'Hello world this is a test transcript' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    const result = await transcribeWithWhisper('sk-test', 'https://example.com/audio.m4a')
    expect(result).toBe('Hello world this is a test transcript')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws on API error', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(new Response(new ArrayBuffer(10), { status: 200 }))
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))

    await expect(transcribeWithWhisper('bad-key', 'https://example.com/audio.m4a'))
      .rejects.toMatchObject({ type: 'invalidKey' })
  })
})
