export function buildPageNumbers(current, total) {
  const pageCount = Math.max(1, Math.floor(Number(total) || 1))
  const page = Math.min(pageCount, Math.max(1, Math.floor(Number(current) || 1)))
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1)

  const pages = [1]
  if (page > 3) pages.push('…')
  for (let index = Math.max(2, page - 1); index <= Math.min(pageCount - 1, page + 1); index += 1) {
    pages.push(index)
  }
  if (page < pageCount - 2) pages.push('…')
  pages.push(pageCount)
  return pages
}
