export default function AdminStates({request,children}) {
  if(request.loading)return <p className="admin-status" role="status">Loading records…</p>
  if(request.error)return <div className="admin-notice" role="alert"><p>{request.error}</p><button type="button" className="admin-secondary" onClick={request.reload}>Retry</button></div>
  return children
}
