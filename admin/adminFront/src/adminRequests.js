import { useEffect,useState } from 'react'
import { backendGet } from '../../../clientFront/src/lib/backendApi'

export function useAdminList(path,params={},refreshKey=0) {
  const query=JSON.stringify(params)
  const [revision,setRevision]=useState(0)
  const key=JSON.stringify([path,query,revision,refreshKey])
  const [request,setRequest]=useState({key:'',data:null,error:''})
  useEffect(()=>{
    if(!path) return undefined
    const controller=new AbortController()
    backendGet(path,{params:JSON.parse(query),signal:controller.signal})
      .then(data=>{if(!controller.signal.aborted)setRequest({key,data,error:''})})
      .catch(error=>{if(!controller.signal.aborted)setRequest({key,data:null,error:error.message})})
    return ()=>controller.abort()
  },[path,query,revision,key])
  const current=request.key===key
  return {data:current?request.data:null,error:current?request.error:'',loading:Boolean(path)&&!current,reload:()=>setRevision(r=>r+1)}
}
