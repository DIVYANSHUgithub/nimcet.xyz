export function parseMathParts(value) {
  const text = String(value ?? '')
  const delimiterPattern = /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g
  const parts = []
  let previousIndex = 0
  let match

  while ((match = delimiterPattern.exec(text)) !== null) {
    if (match.index > previousIndex) parts.push({ type: 'text', value: text.slice(previousIndex, match.index) })
    const token = match[0]
    const display = token.startsWith('$$') || token.startsWith('\\[')
    const delimiterLength = token.startsWith('$') ? (display ? 2 : 1) : 2
    parts.push({
      type: display ? 'display' : 'inline',
      value: token.slice(delimiterLength, -delimiterLength).trim(),
      source: token,
    })
    previousIndex = match.index + token.length
  }

  if (previousIndex < text.length) parts.push({ type: 'text', value: text.slice(previousIndex) })
  return parts
}
