
import { InlineMath } from 'react-katex'
import 'katex/dist/katex.min.css'

export default function MathText({ text = '' }) {
  const parts = String(text).split(/(\$[^$]+\$)/g)

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          return (
            <InlineMath
              key={index}
              math={part.slice(1, -1)}
            />
          )
        }

        return <span key={index}>{part}</span>
      })}
    </>
  )
}
