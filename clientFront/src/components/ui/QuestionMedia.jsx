import MathText from '../MathText'
import RichContent from '../RichContent'
import QuestionImage from './QuestionImage'
import { normalizeOption } from '../../utils/normalizeQuestion'

export function QuestionMedia({ text = '', imageUrl = '', alt = 'Question illustration', className = '' }) {
  return (
    <span className={`block ${className}`}>
      {text && <MathText text={text} />}
      {imageUrl && (
        <QuestionImage key={imageUrl} src={imageUrl} alt={alt} />
      )}
    </span>
  )
}

export function QuestionOptionContent({ option, attemptId, review }) {
  option = normalizeOption(option)
  if (option?.blocks?.length) return <RichContent blocks={option.blocks} attemptId={attemptId} review={review} />
  if (typeof option === 'string') return <QuestionMedia text={option} />
  return <QuestionMedia text={option?.text ?? ''} imageUrl={option?.imageUrl ?? ''} alt="Answer option image" />
}
