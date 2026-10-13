
import { InlineMath, BlockMath } from 'react-katex'

function renderMathParts(content) {
  if (!content) return null

  const parts = String(content).split(
    /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g
  )

  return parts.map((part, index) => {
    if (
      part.startsWith('$$') &&
      part.endsWith('$$')
    ) {
      return (
        <div className="math-display" key={index}>
          <BlockMath math={part.slice(2, -2).trim()} />
        </div>
      )
    }

    if (
      part.startsWith('$') &&
      part.endsWith('$')
    ) {
      return (
        <InlineMath
          key={index}
          math={part.slice(1, -1).trim()}
        />
      )
    }

    return <span key={index}>{part}</span>
  })
}

export default function MathText({ children }) {
  return <>{renderMathParts(children)}</>
}
