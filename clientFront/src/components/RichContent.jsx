import MathText from './MathText'
import 'katex/dist/katex.min.css'

function mediaUrl(id) {
  const base = String(import.meta.env?.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  return `${base}/media/${encodeURIComponent(id)}`
}

export default function RichContent({ blocks = [], imageUrls = {} }) {
  return <div className="rich-content">{blocks.map((block, index) => {
    if (block.type === 'image') return <figure key={index}>
      <img src={imageUrls[block.media_id] ?? mediaUrl(block.media_id)} alt={block.alt} loading="lazy" decoding="async" style={{ maxWidth: '100%', maxHeight: '28rem', objectFit: 'contain' }} />
    </figure>
    if (block.type === 'latex') return <div key={index}><MathText text={`\\[${block.text}\\]`} /></div>
    if (block.type === 'text') return <p key={index} style={{ whiteSpace: 'pre-wrap' }}><MathText text={block.text} /></p>
    return null
  })}</div>
}
