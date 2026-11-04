import { Component } from 'react'
import { BlockMath, InlineMath } from 'react-katex'
import { parseMathParts } from '../utils/parseMathParts'

class SafeMath extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return <span>{this.props.fallback}</span>
    return this.props.children
  }
}

function renderTextWithBreaks(value, key) {
  const lines = String(value).split('\n')
  return lines.map((line, index) => (
    <span key={`${key}-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ))
}

export default function MathText({ text, children, className = '' }) {
  const content = children ?? text ?? ''
  const parts = parseMathParts(content)

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'display') {
          return (
            <div className={`my-2 max-w-full overflow-x-auto overflow-y-hidden py-1 [&_.katex-display]:m-0 ${className}`} key={`math-${index}`}>
              <SafeMath key={part.source} fallback={part.source}>
                <BlockMath math={part.value} />
              </SafeMath>
            </div>
          )
        }
        if (part.type === 'inline') {
          return (
            <span className={`inline-block max-w-full overflow-x-auto align-middle [overflow-wrap:anywhere] [&_.katex]:text-[1.05em] ${className}`} key={`math-${index}`}>
              <SafeMath key={part.source} fallback={part.source}>
                <InlineMath math={part.value} />
              </SafeMath>
            </span>
          )
        }
        return <span className={`[overflow-wrap:anywhere] ${className}`} key={`text-${index}`}>{renderTextWithBreaks(part.value, index)}</span>
      })}
    </>
  )
}
