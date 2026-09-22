import {tenantBackend} from '@/lib/backend/tenant-proxy';

export async function POST(request:Request){
  try{
    const expected=new URL(request.url);expected.host=request.headers.get('host')??expected.host;
    if(request.headers.get('origin')!==expected.origin)return Response.json({code:'feedbackError'},{status:403});
    const auth=await tenantBackend(request,['owner']);if('error'in auth)return auth.error;
    const body=await request.json(),message=typeof body.message==='string'?body.message.trim():'';
    if(!message||message.length>2000)return Response.json({code:'feedbackInvalid'},{status:400});
    const response=await auth.call('/api/admin/feedback',{method:'POST',body:JSON.stringify({message})});
    if(!response.ok)return Response.json({code:'feedbackError'},{status:response.status});
    return Response.json({saved:true},{status:201});
  }catch{
    return Response.json({code:'feedbackError'},{status:502});
  }
}
