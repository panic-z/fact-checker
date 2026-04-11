import { useState, useEffect } from 'react'
import { t, type I18nKey } from '../shared/i18n'
import { Markdown } from './Markdown'
import type { AnalysisStatus, Language } from '../shared/types'
import type { ContentMessage } from '../shared/messages'

interface Props {
  language: Language
  onAnalyze: (lang: Language) => Promise<'ok' | 'noSubtitles'>
}

export function SummaryTab({ language, onAnalyze }: Props) {
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)

  useEffect(() => {
    const handler = (msg: ContentMessage) => {
      if (msg.type === 'ANALYSIS_CHUNK' && msg.analysisType === 'summary') {
        setStatus('streaming')
        setResult(prev => prev + msg.chunk)
      } else if (msg.type === 'ANALYSIS_DONE' && msg.analysisType === 'summary') {
        setStatus('done')
        setStartedAt(null)
      } else if (msg.type === 'ANALYSIS_ERROR' && msg.analysisType === 'summary') {
        setStatus('error')
        setStartedAt(null)
        const errorKey = `error${msg.error.charAt(0).toUpperCase() + msg.error.slice(1)}` as I18nKey
        setError(t(errorKey) ?? t('errorNetwork'))
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  useEffect(() => {
    if (startedAt === null) return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250)
    return () => clearInterval(id)
  }, [startedAt])

  async function startAnalysis() {
    setStatus('loading')
    setResult('')
    setError('')
    setElapsed(0)
    setStartedAt(Date.now())

    const outcome = await onAnalyze(language)
    if (outcome === 'noSubtitles') {
      setStatus('error')
      setError(t('noSubtitles'))
      setStartedAt(null)
    } else {
      setStatus('thinking')
    }
  }

  function copyResult() {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const isRunning = status === 'loading' || status === 'thinking' || status === 'streaming'
  const buttonLabel =
    status === 'loading' ? t('loadingTranscript') :
    status === 'thinking' ? `${t('loadingThinking')} ${elapsed}s` :
    status === 'streaming' ? `${t('streamingLabel')} ${elapsed}s` :
    t('startAnalysis')

  return (
    <div className="fc-tab-content">
      <button className="fc-analyze-btn" onClick={startAnalysis} disabled={isRunning}>
        {buttonLabel}
      </button>
      {status === 'error' && <div className="fc-error">{error}</div>}
      {result && (
        <>
          <div className="fc-result"><Markdown text={result} /></div>
          <button className="fc-copy-btn" onClick={copyResult}>
            {copied ? t('copied') : t('copyResult')}
          </button>
        </>
      )}
    </div>
  )
}
