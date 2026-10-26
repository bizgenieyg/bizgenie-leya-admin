import {isSameOrigin} from '@/lib/backend/same-origin';
import {knowledgeCall} from '@/lib/knowledge/proxy';
/** Z11: «удалить» a rule (confirmed in the cabinet dialog). */
export async function DELETE(request:Request,{params}:{params:{number:string}}){if(!isSameOrigin(request))return Response.json({code:'settingsRestricted'},{status:403});
 if(!/^\d{1,3}$/.test(params.number))return Response.json({code:'kpErrorGone'},{status:404});
 return knowledgeCall(request,`/api/admin/knowledge/rules/${params.number}`,{method:'DELETE'});}
