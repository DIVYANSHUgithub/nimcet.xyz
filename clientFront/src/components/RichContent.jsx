import MathText from './MathText'
import QuestionImage, { AttemptImage } from './ui/QuestionImage'
import { inlineImageUrl } from '../utils/normalizeQuestion'
import 'katex/dist/katex.min.css'

function mediaUrl(id) {
  const base = String(import.meta.env?.VITE_API_BASE_URL ?? '/api/v1').trim().replace(/\/+$/, '')
  return `${base}/media/${encodeURIComponent(id)}`
}

export default function RichContent({ blocks = [], imageUrls = {}, attemptId, review }) {
  return <span className="rich-content block">{blocks.map((block, index) => {
    const inlineUrl = inlineImageUrl(block)
    if (inlineUrl) {
      return <QuestionImage key={`${index}:${inlineUrl}`} src={inlineUrl} alt={block.alt ?? 'Question illustration'} />
    }
    if (block.type === 'image' && block.media_id) {
      if (attemptId) return <AttemptImage key={`${index}:${attemptId}:${block.media_id}:${review}`} attemptId={attemptId} mediaId={block.media_id} review={review} alt={block.alt} />
      const src = imageUrls[block.media_id] ?? mediaUrl(block.media_id)
      return <QuestionImage key={`${index}:${src}`} src={src} alt={block.alt} />
    }
    if (block.type === 'latex') return <span key={index} className="block"><MathText text={`\\[${block.text}\\]`} /></span>
    if (block.type === 'text') return <span key={index} className="block whitespace-pre-wrap"><MathText text={block.text} /></span>
    return null
  })}</span>
}
