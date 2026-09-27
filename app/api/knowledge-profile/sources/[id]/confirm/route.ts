import {isSameOrigin} from '@/lib/backend/same-origin';
import {isId,knowledgeCall} from '@/lib/knowledge/proxy';
export async function POST(request:Request,{params}:{params:{id:string}}){if(!isSameOrigin(request))return Response.json({code:'settingsRestricted'},{status:403});if(!isId(params.id))return Response.json({code:'kpErrorGone'},{status:404});return knowledgeCall(request,`/api/admin/knowledge/sources/${params.id}/confirm`,{method:'POST'});}
