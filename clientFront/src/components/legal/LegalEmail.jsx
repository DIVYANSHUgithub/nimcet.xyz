import { legalDetails } from '../../lib/legal'

export default function LegalEmail({ subject }) {
  return <a href={`mailto:${legalDetails.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`}>{legalDetails.email}</a>
}
