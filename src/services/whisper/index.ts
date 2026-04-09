import { ApiError, classifyApiError } from '../ai/claude'

export async function transcribeWithWhisper(apiKey: string, audioUrl: string): Promise<string> {
  const audioResp = await fetch(audioUrl)
  if (!audioResp.ok) {
    throw new ApiError('network', `Failed to fetch audio: ${audioResp.status}`)
  }
  const audioBuffer = await audioResp.arrayBuffer()
  const audioBlob = new Blob([audioBuffer], { type: 'audio/mp4' })

  const form = new FormData()
  form.append('file', audioBlob, 'audio.m4a')
  form.append('model', 'whisper-1')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!response.ok) {
    throw new ApiError(classifyApiError(response.status), `Whisper API error: ${response.status}`)
  }

  const data = await response.json() as { text: string }
  return data.text
}
