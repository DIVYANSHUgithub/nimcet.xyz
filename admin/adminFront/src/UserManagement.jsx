import { useState } from 'react'
import { backendRequest } from '../../../clientFront/src/lib/backendApi'
import { useAuth } from '../../../clientFront/src/context/useAuth'
import { useAdminList } from './adminRequests'
import AdminStates from './AdminStates'

export default function UserManagement({roles}) {
  const {user}=useAuth();const [page,setPage]=useState(1);const [lookup,setLookup]=useState('');const [id,setId]=useState('')
  const [selected,setSelected]=useState(null);const [reason,setReason]=useState('');const [role,setRole]=useState('student')
  const [until,setUntil]=useState('');const [error,setError]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false)
  const request=useAdminList(id?`admin/users/${id}`:'admin/users',id?{}:{page})
  const [search,setSearch]=useState('');const [roleFilter,setRoleFilter]=useState('');const [statusFilter,setStatusFilter]=useState('')
  const pageItems=request.data?(id?[request.data]:request.data.items):[]
  const items=pageItems.filter(account=>`${account.email??''} ${account.name} ${account.id}`.toLowerCase().includes(search.toLowerCase())&&(!roleFilter||(account.roles[0]||'student')===roleFilter)&&(!statusFilter||account.status===statusFilter))
  const superAdmin=roles.includes('super_administrator')
  async function change(path,body){setBusy(true);setError('');setMessage('');try{await backendRequest(path,{method:'PUT',body});setMessage('Account change saved and audited.');setSelected(null);request.reload()}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <section className="question-workspace"><h2>Users and application access</h2><p>Account names are display information. Only trusted backend assignments grant permissions.</p>
    <form className="admin-form" onSubmit={e=>{e.preventDefault();setId(lookup.trim());setSelected(null)}}><label>Find account by UUID<input required pattern="[0-9a-fA-F-]{36}" value={lookup} onChange={e=>setLookup(e.target.value)}/></label><button>Find account</button><button type="button" onClick={()=>{setId('');setPage(1);setSelected(null)}}>Browse directory</button></form>
    {error&&<p role="alert" className="admin-error">{error}</p>}{message&&<p role="status">{message}</p>}
    <div className="admin-filter-row"><label>Search this directory page<input value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Role on this page<select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}><option value="">All roles</option>{['student','editor','test_manager','administrator','super_administrator'].map(value=><option key={value}>{value}</option>)}</select></label><label>Access on this page<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">All accounts</option><option>active</option><option>suspended</option></select></label></div>
    <AdminStates request={request}>{request.data&&<>
      {items.length===0?<p>No accounts on this page.</p>:<ul className="admin-record-list">{items.map(account=><li key={account.id}><strong>{account.name||'Name not provided'}</strong><span>{account.email}</span><small>{account.id}</small><span>{account.email_verified?'Email verified':'Email unverified'} · {account.roles.join(', ')||'Student (legacy default)'} · {account.status}</span><button type="button" className="admin-secondary" onClick={()=>{setSelected(account);setUntil('');setRole(account.roles[0]||'student');setReason('');setError('')}}>Manage account</button></li>)}</ul>}
      {!id&&<div className="admin-role-actions"><button className="admin-secondary" disabled={page===1} onClick={()=>{setPage(p=>p-1);setSelected(null)}}>Previous</button><span>Page {page}</span><button className="admin-secondary" disabled={!request.data.has_more} onClick={()=>{setPage(p=>p+1);setSelected(null)}}>Next</button></div>}
    </>}</AdminStates>
    {selected&&<form className="admin-form admin-preview-panel" inert={busy} onSubmit={e=>e.preventDefault()}><h3>{selected.email}</h3><p>Current role: {selected.roles.join(', ')||'student (implicit)'}. Application access: {selected.status}.</p>
      <label>Reason<input required minLength={10} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      {superAdmin&&<><label>New primary role<select value={role} onChange={e=>setRole(e.target.value)}>{['student','editor','test_manager','administrator','super_administrator'].map(value=><option key={value}>{value}</option>)}</select></label><button disabled={selected.id===user.id||reason.trim().length<10} onClick={()=>change(`admin/users/${selected.id}/primary-role`,{role,reason,expected_role:selected.roles[0]??null})}>Replace primary role</button></>}
      {!selected.roles.some(value=>['administrator','super_administrator'].includes(value))&&<><label>Suspension end (optional, local time)<input type="datetime-local" value={until} onChange={e=>setUntil(e.target.value)}/></label><button disabled={selected.id===user.id||reason.trim().length<10} onClick={()=>change(`admin/users/${selected.id}/status`,{status:selected.status==='suspended'?'active':'suspended',suspended_until:selected.status!=='suspended'&&until?new Date(until).toISOString():null,reason})}>{selected.status==='suspended'?'Restore application access':'Suspend application access'}</button></>}
      <p>Self-changes and removal of the last Super Administrator are blocked. Privileged accounts cannot be suspended through student-support controls.</p><button type="button" onClick={()=>setSelected(null)}>Close account</button>
    </form>}
  </section>
}
