import type { AnalysisType, Language } from '../../shared/types'

const MAX_SUMMARY_CHARS = 24000
const MAX_FACTCHECK_CHARS = 16000

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '\n[transcript truncated]'
}

function langInstruction(lang: Language): string {
  if (lang === 'zh') return 'Respond in Chinese (中文).'
  if (lang === 'en') return 'Respond in English.'
  return 'Respond in the same language as the transcript.'
}

export function buildSummaryPrompt(transcript: string, lang: Language): string {
  return `Summarize this video transcript. ${langInstruction(lang)}

Output markdown with these sections, in order, starting immediately with the first heading — no preamble:

## 核心要点
3–5 bullet points of the most important ideas or claims.

## 内容概述
A concise overview (under 150 words).

## 主要结论
What the speaker concludes or recommends.

---TRANSCRIPT---
${truncate(transcript, MAX_SUMMARY_CHARS)}`
}

export function buildFactCheckPrompt(transcript: string, lang: Language): string {
  return `Fact-check this video transcript. ${langInstruction(lang)}

Start output immediately with the first issue — no preamble, no "let me analyze" text. Use this markdown format for each issue:

### 问题 N: <short title>
- **引用**: "<quoted passage>"
- **类型**: 事实错误 / 逻辑谬误 / 夸大 / 误导 / 未经证实
- **说明**: <brief explanation and, if known, the accurate information>

Limit to the 3–6 most important issues. Skip opinions and stylistic choices. If nothing significant, output exactly: **未发现明显问题**.

---TRANSCRIPT---
${truncate(transcript, MAX_FACTCHECK_CHARS)}`
}

export function buildPrompt(type: AnalysisType, transcript: string, lang: Language): string {
  return type === 'summary'
    ? buildSummaryPrompt(transcript, lang)
    : buildFactCheckPrompt(transcript, lang)
}
