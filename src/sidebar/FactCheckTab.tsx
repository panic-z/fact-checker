import { useState, useEffect } from 'react'
import { t, type I18nKey } from '../shared/i18n'
import type { AnalysisStatus, Language } from '../shared/types'
import type { ContentMessage } from '../shared/messages'

interface Props {
  language: Language
  onAnalyze: (lang: Language) => Promise<'ok' | 'noSubtitles'>
  onWhisperConfirm: (lang: Language) => void
}

export function FactCheckTab({ language, onAnalyze, onWhisperConfirm }: Props) {
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showWhisperPrompt, setShowWhisperPrompt] = useState(false)

  useEffect(() => {
    const handler = (msg: ContentMessage) => {
      if (msg.type === 'ANALYSIS_CHUNK' && msg.analysisType === 'factcheck') {
        setStatus('streaming')
        setResult(prev => prev + msg.chunk)
      } else if (msg.type === 'ANALYSIS_DONE' && msg.analysisType === 'factcheck') {
        setStatus('done')
      } else if (msg.type === 'ANALYSIS_ERROR' && msg.analysisType === 'factcheck') {
        setStatus('error')
        const errorKey = `error${msg.error.charAt(0).toUpperCase() + msg.error.slice(1)}` as I18nKey
        setError(t(errorKey) ?? t('errorNetwork'))
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  async function startAnalysis() {
    setStatus('loading')
    setResult('')
    setError('')
    setShowWhisperPrompt(false)

    const outcome = await onAnalyze(language)
    if (outcome === 'noSubtitles') {
      setShowWhisperPrompt(true)
      setStatus('idle')
    }
  }

  function copyResult() {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const isRunning = status === 'loading' || status === 'streaming'

  return (
    <div className="fc-tab-content">
      {showWhisperPrompt && (
        <div className="fc-whisper-prompt">
          <p>{t('whisperPrompt')}</p>
          <div className="fc-whisper-actions">
            <button className="fc-whisper-confirm" onClick={() => {
              setShowWhisperPrompt(false)
              onWhisperConfirm(language)
            }}>
              {t('whisperConfirm')}
            </button>
            <button className="fc-whisper-cancel" onClick={() => setShowWhisperPrompt(false)}>
              {t('whisperCancel')}
            </button>
          </div>
        </div>
      )}
      <button className="fc-analyze-btn" onClick={startAnalysis} disabled={isRunning}>
        {isRunning ? t('loading') : t('startAnalysis')}
      </button>
      {status === 'error' && <div className="fc-error">{error}</div>}
      {result && (
        <>
          <div className="fc-result">{result}</div>
          <button className="fc-copy-btn" onClick={copyResult}>
            {copied ? t('copied') : t('copyResult')}
          </button>
        </>
      )}
    </div>
  )
}
