export default function SectionHeader({
  title,
  subtitle,
  meta,
  action,
  className = '',
}) {
  return (
    <div className={`section-header ${className}`}>
      <div className="section-header__text">
        <h2 className="section-header__title">{title}</h2>
        {subtitle && <p className="section-header__subtitle">{subtitle}</p>}
      </div>
      {(meta || action) && (
        <div className="section-header__aside">
          {action}
          {meta && <span className="section-header__meta">{meta}</span>}
        </div>
      )}
    </div>
  )
}
