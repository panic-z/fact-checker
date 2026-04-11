import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  text: string
}

function splitReasoning(text: string): { reasoning: string | null; main: string; reasoningDone: boolean } {
  const start = text.indexOf('%%REASONING_START%%')
  if (start === -1) return { reasoning: null, main: text, reasoningDone: true }

  const before = text.slice(0, start)
  const afterStart = text.slice(start + '%%REASONING_START%%'.length)
  const end = afterStart.indexOf('%%REASONING_END%%')

  if (end === -1) {
    return { reasoning: afterStart, main: before, reasoningDone: false }
  }
  const reasoning = afterStart.slice(0, end)
  const rest = afterStart.slice(end + '%%REASONING_END%%'.length)
  return { reasoning, main: before + rest, reasoningDone: true }
}

function MdBody({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

export function Markdown({ text }: Props) {
  const { reasoning, main, reasoningDone } = splitReasoning(text)
  return (
    <div className="fc-markdown">
      {reasoning !== null && (
        <details className="fc-reasoning" open={!reasoningDone}>
          <summary>{reasoningDone ? '思考过程' : '思考中…'}</summary>
          <MdBody text={reasoning} />
        </details>
      )}
      <MdBody text={main} />
    </div>
  )
}
