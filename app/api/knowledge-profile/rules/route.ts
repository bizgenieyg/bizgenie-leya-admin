import {isSameOrigin} from '@/lib/backend/same-origin';
import {knowledgeCall} from '@/lib/knowledge/proxy';
/** Z11 «Правила»: the active rules; POST — what the owner meant («Поняла так …»), nothing is saved yet. */
export async function GET(request:Request){return knowledgeCall(request,'/api/admin/knowledge/rules',{},15000,'kpErrorLoad');}
export async function POST(request:Request){if(!isSameOrigin(request))return Response.json({code:'settingsRestricted'},{status:403});
 const body=await request.json().catch(()=>({})) as {text?:unknown;number?:unknown;context?:unknown};
 if(typeof body.text!=='string'||!body.text.trim())return Response.json({code:'kpErrorEmpty'},{status:400});
 return knowledgeCall(request,'/api/admin/knowledge/rules/understand',{method:'POST',body:JSON.stringify({text:body.text.slice(0,3000),
  ...(Number.isSafeInteger(body.number)?{number:body.number}:{}),...(typeof body.context==='string'?{context:body.context.slice(0,3000)}:{})})},60000);}
