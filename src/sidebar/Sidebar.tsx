import { useState } from 'react'
import { t, setLanguage, getLanguage } from '../shared/i18n'
import { SummaryTab } from './SummaryTab'
import { FactCheckTab } from './FactCheckTab'
import type { AnalysisType, Language } from '../shared/types'
import './sidebar.css'

type TabId = 'summary' | 'factcheck'

interface Props {
  onClose: () => void
  onAnalyze: (type: AnalysisType, lang: Language) => Promise<'ok' | 'noSubtitles'>
}

export function Sidebar({ onClose, onAnalyze }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('summary')
  const [language, setLang] = useState<Language>(getLanguage() as Language)

  function switchLanguage(lang: 'zh' | 'en') {
    setLanguage(lang)
    setLang(lang)
  }

  return (
    <div id="fact-checker-sidebar-root">
      <div className="fc-header">
        <span className="fc-title">FactChecker</span>
        <div className="fc-lang-toggle">
          <button
            className={`fc-lang-btn ${language === 'zh' ? 'active' : ''}`}
            onClick={() => switchLanguage('zh')}
            aria-label="中文"
          >
            中文
          </button>
          <button
            className={`fc-lang-btn ${language === 'en' ? 'active' : ''}`}
            onClick={() => switchLanguage('en')}
            aria-label="EN"
          >
            EN
          </button>
        </div>
        <button className="fc-close-btn" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="fc-tabs" role="tablist">
        <button
          role="tab"
          className="fc-tab"
          aria-selected={activeTab === 'summary'}
          onClick={() => setActiveTab('summary')}
        >
          {t('summary')}
        </button>
        <button
          role="tab"
          className="fc-tab"
          aria-selected={activeTab === 'factcheck'}
          onClick={() => setActiveTab('factcheck')}
        >
          {t('factCheck')}
        </button>
      </div>

      {activeTab === 'summary' ? (
        <SummaryTab
          language={language}
          onAnalyze={lang => onAnalyze('summary', lang)}
          onWhisperConfirm={lang => onAnalyze('summary', lang)}
        />
      ) : (
        <FactCheckTab
          language={language}
          onAnalyze={lang => onAnalyze('factcheck', lang)}
          onWhisperConfirm={lang => onAnalyze('factcheck', lang)}
        />
      )}
    </div>
  )
}
