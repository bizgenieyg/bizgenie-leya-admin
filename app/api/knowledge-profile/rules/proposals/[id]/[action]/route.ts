import {isSameOrigin} from '@/lib/backend/same-origin';
import {isId,knowledgeCall} from '@/lib/knowledge/proxy';
/** Z11: «Сохранить» / «Нет» to «Поняла так …», or the answer to «Какие условия …?» (details). */
export async function POST(request:Request,{params}:{params:{id:string;action:string}}){if(!isSameOrigin(request))return Response.json({code:'settingsRestricted'},{status:403});
 if(!isId(params.id)||!['confirm','decline','details'].includes(params.action))return Response.json({code:'kpErrorGone'},{status:404});
 const body=params.action==='details'?await request.json().catch(()=>({})) as {text?:unknown}:{};
 return knowledgeCall(request,`/api/admin/knowledge/rules/proposals/${params.id}/${params.action}`,{method:'POST',body:JSON.stringify(params.action==='details'?{text:typeof body.text==='string'?body.text.slice(0,3000):''}:{})},60000);}
