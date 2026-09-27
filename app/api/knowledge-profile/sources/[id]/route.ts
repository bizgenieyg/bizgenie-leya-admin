import {isId,knowledgeCall,knowledgeCode} from '@/lib/knowledge/proxy';
export const dynamic='force-dynamic';
/** Source status for polling; a failure reason goes out as a dictionary key, never backend text. */
export async function GET(request:Request,{params}:{params:{id:string}}){
 if(!isId(params.id))return Response.json({code:'kpErrorGone'},{status:404});
 const r=await knowledgeCall(request,`/api/admin/knowledge/sources/${params.id}`,{},15000,'kpErrorLoad');
 if(!r.ok)return r;
 const data=await r.json() as Record<string,unknown>;
 return Response.json({...data,error:data.error?knowledgeCode(data.error,'kpErrorProcessing'):null},{headers:{'Cache-Control':'no-store'}});
}
