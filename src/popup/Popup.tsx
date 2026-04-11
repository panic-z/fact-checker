import { useEffect, useState } from 'react'
import { t } from '../shared/i18n'

type PageType = 'bilibili' | 'other' | 'loading'

function detectPageType(url: string): PageType {
  if (url.includes('bilibili.com/video/')) return 'bilibili'
  return 'other'
}

export function Popup() {
  const [pageType, setPageType] = useState<PageType>('loading')
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const tab = tabs[0]
      if (tab?.id) setCurrentTabId(tab.id)
      setPageType(tab?.url ? detectPageType(tab.url) : 'other')
    }
    load()
  }, [])

  function openPanel() {
    if (currentTabId == null) return
    chrome.tabs.sendMessage(currentTabId, { type: 'TOGGLE_SIDEBAR' })
    if (typeof chrome.extension !== 'undefined') window.close()
  }

  return (
    <div style={{ width: 240, padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Fact Checker</h3>
      {pageType === 'loading' && <p style={{ color: '#6b7280', fontSize: 13 }}>Loading…</p>}
      {pageType === 'bilibili' && (
        <button
          onClick={openPanel}
          style={{
            width: '100%', padding: '9px 0', background: '#2563eb',
            color: '#fff', border: 'none', borderRadius: 6,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
          aria-label={t('openPanel')}
        >
          {t('openPanel')}
        </button>
      )}
      {pageType === 'other' && (
        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{t('notVideoPage')}</p>
      )}
      <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
        <a
          href="#"
          onClick={e => { e.preventDefault(); chrome.runtime.openOptionsPage() }}
          style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}
        >
          ⚙ {t('settings')}
        </a>
      </div>
    </div>
  )
}
