import {isSameOrigin} from '@/lib/backend/same-origin';
import {isId,knowledgeCall} from '@/lib/knowledge/proxy';
const ACTIONS=new Set(['accept','edit','skip','answer']);
export async function POST(request:Request,{params}:{params:{id:string}}){if(!isSameOrigin(request))return Response.json({code:'settingsRestricted'},{status:403});if(!isId(params.id))return Response.json({code:'kpErrorGone'},{status:404});
 const body=await request.json().catch(()=>({})) as {action?:unknown;text?:unknown};
 if(typeof body.action!=='string'||!ACTIONS.has(body.action))return Response.json({code:'kpErrorSave'},{status:400});
 return knowledgeCall(request,`/api/admin/knowledge/audit/${params.id}`,{method:'POST',body:JSON.stringify({action:body.action,text:typeof body.text==='string'?body.text:null})});}
