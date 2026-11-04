import MathText from '../MathText'

export function QuestionMedia({ text = '', imageUrl = '', alt = 'Question illustration', className = '' }) {
  return (
    <div className={className}>
      {text && <MathText text={text} />}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="mt-2 h-auto max-h-[28rem] max-w-full rounded-md object-contain object-left"
          onError={(event) => { event.currentTarget.hidden = true }}
        />
      )}
    </div>
  )
}

export function QuestionOptionContent({ option }) {
  if (typeof option === 'string') return <QuestionMedia text={option} />
  return <QuestionMedia text={option?.text ?? ''} imageUrl={option?.imageUrl ?? ''} alt="Answer option image" />
}
