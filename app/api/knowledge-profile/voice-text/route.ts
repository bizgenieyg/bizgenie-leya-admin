import {isSameOrigin} from '@/lib/backend/same-origin';
import {knowledgeCall} from '@/lib/knowledge/proxy';
/** Z11: a voice answer (question card, «Исправить») → text the owner sees and sends. */
export async function POST(request:Request){if(!isSameOrigin(request))return Response.json({code:'settingsRestricted'},{status:403});
 const form=await request.formData().catch(()=>null),file=form?.get('file');
 if(!(file instanceof File)||!file.size)return Response.json({code:'kpErrorVoiceType'},{status:400});
 return knowledgeCall(request,'/api/admin/knowledge/voice-text',{method:'POST',headers:{'Content-Type':'application/octet-stream','x-file-type':file.type||'audio/webm'},body:await file.arrayBuffer()},120000);}
