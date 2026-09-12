import {tenantBackend} from '@/lib/backend/tenant-proxy';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  const auth=await tenantBackend(request);if('error'in auth)return auth.error;
  const body=await request.json();
  if(typeof body.text!=='string'||!body.text.trim()||body.text.trim().length>2000)return Response.json({error:'Invalid message'},{status:400});
  const response=await auth.call('/api/admin/simulator',{method:'POST',body:JSON.stringify({text:body.text.trim()})});
  return Response.json(await response.json(),{status:response.status});
 }catch{return Response.json({error:'Service unavailable'},{status:502});}
}
