import {isSameOrigin} from '@/lib/backend/same-origin';
import {knowledgeCall} from '@/lib/knowledge/proxy';
/** Z11: several addresses — all at once (staff) or the owner by a schedule (the days); saved as a fact. */
export async function POST(request:Request){if(!isSameOrigin(request))return Response.json({code:'settingsRestricted'},{status:403});
 const body=await request.json().catch(()=>({})) as {mode?:unknown;schedule?:unknown};
 if(body.mode!=='simultaneous'&&!(body.mode==='schedule'&&typeof body.schedule==='string'&&body.schedule.trim()))return Response.json({code:'kpErrorEmpty'},{status:400});
 return knowledgeCall(request,'/api/admin/knowledge/address-mode',{method:'POST',body:JSON.stringify({mode:body.mode,...(body.mode==='schedule'?{schedule:String(body.schedule).slice(0,500)}:{})})});}
