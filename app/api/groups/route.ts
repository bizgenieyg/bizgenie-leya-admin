import {tenantBackend} from '@/lib/backend/tenant-proxy';

export const dynamic='force-dynamic';

export async function GET(request:Request){
  try{
    const auth=await tenantBackend(request);
    if('error'in auth)return auth.error;
    const response=await auth.call('/api/admin/groups');
    const payload=await response.json().catch(()=>({groups:[]}));
    return Response.json(response.ok?payload:{code:'groupsLoadError'},{status:response.status,headers:{'Cache-Control':'private, max-age=120'}});
  }catch{
    return Response.json({code:'serviceUnavailable'},{status:502});
  }
}
