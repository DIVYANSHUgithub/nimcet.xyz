import { useEffect,useState } from 'react'
import { backendRequest } from '../../../clientFront/src/lib/backendApi'
import { useAdminList } from './adminRequests'
import AdminStates from './AdminStates'
import RichContent from '../../../clientFront/src/components/RichContent'

export function AssetPreview({id,alt='Educational image'}) {
  const [request,setRequest]=useState({id:null,url:'',error:false})
  useEffect(()=>{
    const controller=new AbortController(); let url
    backendRequest(`admin/media/${id}`,{responseType:'blob',signal:controller.signal})
      .then(blob=>{if(!controller.signal.aborted){url=URL.createObjectURL(blob);setRequest({id,url,error:false})}})
      .catch(()=>{if(!controller.signal.aborted)setRequest({id,url:'',error:true})})
    return ()=>{controller.abort();if(url)URL.revokeObjectURL(url)}
  },[id])
  if(request.id!==id)return <span role="status">Loading image…</span>
  if(request.error)return <span role="status">Image preview unavailable: {alt}</span>
  return <img src={request.url} alt={alt} className="admin-media-preview" />
}

export function AdminRichContent({blocks=[],imageUrls={}}) {
  return <div>{blocks.map((block,index)=>block.type==='image'?(imageUrls[block.media_id]?<img key={index} src={imageUrls[block.media_id]} alt={block.alt} className="admin-media-preview"/>:<AssetPreview key={`${block.media_id}:${index}`} id={block.media_id} alt={block.alt}/>):<RichContent key={index} blocks={[block]}/>)}</div>
}

export default function MediaLibrary({onPick}) {
  const [page,setPage]=useState(1);const [archived,setArchived]=useState(false)
  const [preview,setPreview]=useState(null);const [reason,setReason]=useState('')
  const [busy,setBusy]=useState(false);const [error,setError]=useState('')
  const request=useAdminList('admin/media',{page,archived})
  return <section className="question-workspace"><h2>{onPick?'Choose an existing image':'Media library'}</h2>
    <p>Reusing images keeps content consistent. Archiving hides unused images from new selections; no stored object is deleted.</p>
    {!onPick&&<label><input type="checkbox" checked={archived} onChange={e=>{setArchived(e.target.checked);setPage(1)}}/>Show archived images</label>}
    {error&&<p className="admin-error" role="alert">{error}</p>}
    <AdminStates request={request}>{request.data&&<>
      {request.data.length===0?<p>No images found.</p>:<ul className="admin-record-list">{request.data.map(asset=><li key={asset.id}>
        <strong>{asset.content_type} · {Math.ceil(asset.byte_size/1024)} KB</strong><span>{new Date(asset.created_at).toLocaleString()}</span>
        <div className="admin-role-actions"><button type="button" className="admin-secondary" onClick={()=>setPreview(asset.id)}>Preview</button>
          {onPick?<button type="button" className="admin-secondary" onClick={()=>onPick(asset.id)}>Use image</button>:<button type="button" className="admin-secondary" disabled={busy||reason.trim().length<10} onClick={async()=>{
            setBusy(true);setError('');try{await backendRequest(`admin/media/${asset.id}/archive`,{method:'PUT',body:{archived:!archived,reason}});request.reload();setPreview(null)}catch(err){setError(err.message)}finally{setBusy(false)}
          }}>{archived?'Restore':'Archive if unused'}</button>}
        </div>
      </li>)}</ul>}
      {!onPick&&<label>Reason for archive/restore<input minLength={10} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>}
      <div className="admin-role-actions"><button type="button" className="admin-secondary" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page}</span><button type="button" className="admin-secondary" disabled={request.data.length<30} onClick={()=>setPage(p=>p+1)}>Next</button></div>
    </>}</AdminStates>
    {preview&&<div className="admin-preview-panel"><h3>Image preview</h3><AssetPreview id={preview}/><button type="button" className="admin-secondary" onClick={()=>setPreview(null)}>Close preview</button></div>}
  </section>
}
