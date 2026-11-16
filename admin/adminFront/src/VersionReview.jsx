import { useState } from 'react'
import { backendRequest } from '../../../clientFront/src/lib/backendApi'
import { useAdminList } from './adminRequests'
import AdminStates from './AdminStates'
import { AdminRichContent } from './MediaLibrary'
import { QuestionOptionContent } from '../../../clientFront/src/components/ui/QuestionMedia'

export function VersionPreview({detail}){
  return <div className="admin-preview-panel"><h3>{detail.title} · version {detail.version_number}</h3><p>{detail.status==='published'?'Published':detail.workflow_state} · {detail.duration_seconds/60} minutes · {detail.attempt_limit} attempts</p><p>Results: {detail.review_policy.results}. Answer review: {detail.review_policy.answers}.</p>
    {detail.preview.map(section=><section key={section.code}><h4>{section.title}</h4>{section.questions.map((question,index)=><article className="admin-question-preview" key={question.id}><h5>Question {index+1}</h5>{question.question_blocks_snapshot?.length?<AdminRichContent blocks={question.question_blocks_snapshot}/>:<p>{question.question_snapshot}</p>}<ol>{question.options_snapshot.map((option,i)=><li key={i}><strong>{String.fromCharCode(65+i)}{i===question.correct_option_snapshot?' — correct':''}</strong>{option?.blocks?.length?<AdminRichContent blocks={option.blocks}/>:<QuestionOptionContent option={option}/>}</li>)}</ol><h5>Explanation</h5>{question.explanation_blocks_snapshot?.length?<AdminRichContent blocks={question.explanation_blocks_snapshot}/>:<p>{question.explanation_snapshot||'No explanation provided.'}</p>}</article>)}</section>)}
  </div>
}

export default function VersionReview({test,roles,onRevise,onSaved,refreshKey=0}){
  const versions=useAdminList(`admin/tests/${test.id}/versions`,{},refreshKey)
  const [selected,setSelected]=useState('');const [reason,setReason]=useState('');const [error,setError]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false)
  const id=selected||test.version_id||versions.data?.[0]?.id
  const detail=useAdminList(id?`admin/versions/${id}`:null)
  const admin=roles.some(role=>['administrator','super_administrator'].includes(role))
  async function transition(action){setBusy(true);setError('');setMessage('');try{await backendRequest(`admin/versions/${id}/review`,{method:'POST',body:{action,reason,expected_revision:detail.data.workflow_revision}});setMessage('Workflow updated and audited.');detail.reload();versions.reload();onSaved?.()}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <section className="admin-version-review"><h3>Existing versions and review</h3><AdminStates request={versions}>{versions.data&&<label>Version<select value={id||''} onChange={e=>{setSelected(e.target.value);setReason('');setError('')}}>{versions.data.map(version=><option value={version.id} key={version.id}>v{version.version_number} · {version.status==='published'?'published':version.workflow_state}</option>)}</select></label>}</AdminStates>
    {error&&<p className="admin-error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    {admin&&test.status&&<TestDetails key={test.id} test={test} onSaved={onSaved}/>}
    {id&&<AdminStates request={detail}>{detail.data&&<><VersionPreview detail={detail.data}/><p>Created by: {detail.data.created_by ?? 'Legacy version'} · Submitted by: {detail.data.submitted_by ?? 'Not submitted'} · Reviewed by: {detail.data.reviewed_by ?? 'Not reviewed'}</p><div className="admin-form" inert={busy}>
      <label>Reason<input minLength={10} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="admin-role-actions">
        {detail.data.status==='draft'&&['draft','rejected'].includes(detail.data.workflow_state)&&<button className="admin-secondary" disabled={reason.trim().length<10} onClick={()=>transition('submit')}>Submit for review</button>}
        {detail.data.status==='draft'&&detail.data.workflow_state==='submitted'&&<><button className="admin-secondary" disabled={reason.trim().length<10} onClick={()=>transition('withdraw')}>Withdraw submission</button>{admin&&<><button className="admin-secondary" disabled={reason.trim().length<10} onClick={()=>transition('approve')}>Approve</button><button className="admin-secondary" disabled={reason.trim().length<10} onClick={()=>transition('reject')}>Reject with reason</button></>}</>}
        {admin&&detail.data.status==='draft'&&detail.data.workflow_state==='approved'&&test.kind!=='pyq'&&<button className="admin-secondary" onClick={async()=>{setBusy(true);setError('');try{await backendRequest(`admin/tests/${test.id}/versions/${id}/publish`,{method:'POST'});setMessage('Approved version published.');detail.reload();versions.reload();onSaved?.()}catch(err){setError(err.message)}finally{setBusy(false)}}}>Publish approved version</button>}
        {test.kind==='pyq'&&detail.data.workflow_state==='approved'&&<p>Complete source verification in the PYQ verification tab before publishing.</p>}
        {onRevise&&<button className="admin-secondary" onClick={()=>onRevise(detail.data)}>Revise as a new version</button>}
      </div><p>{detail.data.review_reason||'No workflow reason recorded.'}</p></div></>}</AdminStates>}
  </section>
}

export function ReviewQueue({roles}){
  const [page,setPage]=useState(1);const [test,setTest]=useState(null);const queue=useAdminList('admin/review-queue',{page})
  return <section className="question-workspace"><h2>Submitted tests</h2><button className="admin-secondary" onClick={queue.reload}>Refresh queue</button><AdminStates request={queue}>{queue.data&&<>{queue.data.length===0?<p>No tests are awaiting review.</p>:<ul className="admin-record-list">{queue.data.map(row=><li key={row.id}><strong>{row.title} · version {row.version_number}</strong><button className="admin-secondary" onClick={()=>setTest({id:row.test_id,title:row.title,kind:row.kind,version_id:row.id})}>Review test</button></li>)}</ul>}<div className="admin-role-actions"><button className="admin-secondary" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><button className="admin-secondary" disabled={queue.data.length<30} onClick={()=>setPage(p=>p+1)}>Next</button></div></>}</AdminStates>{test&&<VersionReview key={test.id} test={test} roles={roles} onSaved={queue.reload}/>}</section>
}

function TestDetails({test,onSaved}){
  const [title,setTitle]=useState(test.title);const [reason,setReason]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false)
  async function save(archive){setBusy(true);setError('');try{await backendRequest(`admin/tests/${test.id}/${archive?'archive':'metadata'}`,{method:archive?'POST':'PUT',body:archive?{reason}:{title,reason}});onSaved?.()}catch(err){setError(err.message)}finally{setBusy(false)}}
  async function availability(){setBusy(true);setError('');try{await backendRequest(`admin/tests/${test.id}/availability`,{method:'PUT',body:{available:test.status!=='published',reason}});onSaved?.()}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <details><summary>Test title and availability</summary><form className="admin-form" inert={busy} onSubmit={e=>{e.preventDefault();save(false)}}><label>Title<input required maxLength={240} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Reason<input required minLength={10} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>{error&&<p role="alert" className="admin-error">{error}</p>}<button>Save title</button><button type="button" disabled={reason.trim().length<10} onClick={availability}>{test.status==='published'?'Suspend new attempts':'Resume published test'}</button><p>Suspension stops new attempts and preserves existing attempts and results. Resuming requires a published version.</p><p>Archiving removes the test from new attempts and authoring lists. Existing attempts, snapshots and results remain stored.</p><button type="button" disabled={reason.trim().length<10} onClick={()=>save(true)}>Archive test</button></form></details>
}
