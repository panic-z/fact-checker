import type { AnalysisType, Language } from '../../shared/types'

const MAX_TRANSCRIPT_CHARS = 80000

function truncate(text: string): string {
  if (text.length <= MAX_TRANSCRIPT_CHARS) return text
  return text.slice(0, MAX_TRANSCRIPT_CHARS) + '\n[transcript truncated]'
}

function langInstruction(lang: Language): string {
  if (lang === 'zh') return 'Respond in Chinese (中文).'
  if (lang === 'en') return 'Respond in English.'
  return 'Respond in the same language as the transcript.'
}

export function buildSummaryPrompt(transcript: string, lang: Language): string {
  return `You are analyzing a video transcript. ${langInstruction(lang)}

Provide:
1. key points (3–5 bullet points) — the most important ideas or claims
2. content overview (under 150 words) — a concise summary of what the video covers
3. main conclusions — what the speaker concludes or recommends

Keep each section clearly labeled. Be factual and concise.

---TRANSCRIPT---
${truncate(transcript)}`
}

export function buildFactCheckPrompt(transcript: string, lang: Language): string {
  return `You are a fact-checker analyzing a video transcript. ${langInstruction(lang)}

Identify factual errors and logical fallacies. For each issue:
- Quote the relevant passage from the transcript
- Label the issue type: factual error / logical fallacy / exaggeration / misleading claim / unverified claim
- Briefly explain why it is problematic and (if known) what the accurate information is

If no significant issues are found, state clearly: "No significant issues detected."

Be objective and rigorous. Do not flag opinions as errors.

---TRANSCRIPT---
${truncate(transcript)}`
}

export function buildPrompt(type: AnalysisType, transcript: string, lang: Language): string {
  return type === 'summary'
    ? buildSummaryPrompt(transcript, lang)
    : buildFactCheckPrompt(transcript, lang)
}
