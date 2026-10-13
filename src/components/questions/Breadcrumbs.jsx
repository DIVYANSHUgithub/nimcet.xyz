import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs__list">
        {items.map((item, index) => (
          <li key={item.label} className="breadcrumbs__item">
            {index > 0 && (
              <ChevronRight size={14} className="breadcrumbs__sep" aria-hidden="true" />
            )}
            {item.href ? (
              <Link to={item.href} className="breadcrumbs__link">
                {item.label}
              </Link>
            ) : (
              <span className="breadcrumbs__current" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
