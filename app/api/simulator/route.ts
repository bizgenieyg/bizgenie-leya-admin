import {tenantBackend} from '@/lib/backend/tenant-proxy';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  const auth=await tenantBackend(request);if('error'in auth)return auth.error;
  const body=await request.json();
  if(typeof body.text!=='string'||!body.text.trim()||body.text.trim().length>2000)return Response.json({code:'simulatorInvalidMessage'},{status:400});
  const response=await auth.call('/api/admin/simulator',{method:'POST',body:JSON.stringify({text:body.text.trim()})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const upstreamCode=typeof data?.code==='string'?data.code:'';const code=response.status===429?'simulatorLimitError':upstreamCode==='simulator_processing_unavailable'?'simulatorProcessingError':'serviceUnavailable';console.error('simulator_proxy_upstream_failed',{status:response.status,code:upstreamCode||'missing'});return Response.json({code},{status:response.status});}
  return Response.json(data,{status:response.status});
 }catch(error){console.error('simulator_proxy_request_failed',{errorName:error instanceof Error?error.name:'unknown',errorMessage:error instanceof Error?error.message:String(error)});return Response.json({code:'serviceUnavailable'},{status:502});}
}
