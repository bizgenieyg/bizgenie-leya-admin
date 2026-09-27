import {isSameOrigin} from '@/lib/backend/same-origin';
import {isId,knowledgeCall} from '@/lib/knowledge/proxy';
export async function PATCH(request:Request,{params}:{params:{id:string}}){if(!isSameOrigin(request))return Response.json({code:'settingsRestricted'},{status:403});if(!isId(params.id))return Response.json({code:'kpErrorGone'},{status:404});
 const body=await request.json().catch(()=>({})) as {text?:unknown};
 return knowledgeCall(request,`/api/admin/knowledge/facts/${params.id}`,{method:'PATCH',body:JSON.stringify({text:typeof body.text==='string'?body.text:''})});}
export async function DELETE(request:Request,{params}:{params:{id:string}}){if(!isSameOrigin(request))return Response.json({code:'settingsRestricted'},{status:403});if(!isId(params.id))return Response.json({code:'kpErrorGone'},{status:404});return knowledgeCall(request,`/api/admin/knowledge/facts/${params.id}`,{method:'DELETE'});}
