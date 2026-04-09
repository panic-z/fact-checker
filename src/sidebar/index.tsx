import { createRoot } from 'react-dom/client'
import { Sidebar } from './Sidebar'
import type { AnalysisType, Language } from '../shared/types'

export function mountSidebar(
  container: HTMLElement,
  onClose: () => void,
  onAnalyze: (type: AnalysisType, lang: Language) => Promise<'ok' | 'noSubtitles'>
) {
  const root = createRoot(container)
  root.render(
    <Sidebar onClose={onClose} onAnalyze={onAnalyze} />
  )
  return root
}
