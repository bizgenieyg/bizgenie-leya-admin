import {tenantBackend} from '@/lib/backend/tenant-proxy';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  const auth=await tenantBackend(request);if('error'in auth)return auth.error;
  const body=await request.json();
  if(typeof body.answer!=='string'||!body.answer.trim()||body.answer.trim().length>2000||typeof body.sessionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.sessionId))return Response.json({code:'simulatorInvalidMessage'},{status:400});
  const response=await auth.call('/api/admin/simulator/owner-answer',{method:'POST',body:JSON.stringify({answer:body.answer.trim(),sessionId:body.sessionId})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const upstreamCode=typeof data?.code==='string'?data.code:'';const code=response.status===429?'simulatorLimitError':upstreamCode==='simulator_no_question'?'simulatorNoQuestion':upstreamCode==='simulator_processing_unavailable'?'simulatorProcessingError':'serviceUnavailable';console.error('simulator_owner_answer_proxy_upstream_failed',{status:response.status,code:upstreamCode||'missing'});return Response.json({code},{status:response.status});}
  if(typeof data?.reply!=='string')return Response.json({code:'serviceUnavailable'},{status:502});
  return Response.json({reply:data.reply});
 }catch(error){console.error('simulator_owner_answer_proxy_failed',{errorName:error instanceof Error?error.name:'unknown'});return Response.json({code:'serviceUnavailable'},{status:502});}
}
