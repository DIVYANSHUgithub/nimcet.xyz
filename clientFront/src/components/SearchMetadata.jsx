import { legalDetails } from '../lib/legal.js'
import { getSearchPage } from '../lib/searchPages.js'

export default function SearchMetadata({ pathname }) {
  const page = getSearchPage(pathname)
  if (!page) return null
  const url = `${legalDetails.origin}${pathname.replace(/\/+$/, '') || '/'}`
  return (
    <>
      <link rel="canonical" href={url} />
      <meta name="description" content={page.description} />
      <meta property="og:type" content={page.openGraphType ?? 'website'} />
      <meta property="og:site_name" content="NIMCET.XYZ" />
      <meta property="og:title" content={page.title} />
      <meta property="og:description" content={page.description} />
      <meta property="og:url" content={url} />
    </>
  )
}
