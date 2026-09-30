import {isSameOrigin} from '@/lib/backend/same-origin';
import {knowledgeCall} from '@/lib/knowledge/proxy';
export const dynamic='force-dynamic';
const TOPICS=new Set(['services_prices','location_hours','booking','faq','payment_cancel','why_us','about','other']);
/** "Добавить что угодно": multipart form with kind=text|link|file (the photo is a file). */
export async function POST(request:Request){
if(!isSameOrigin(request))return Response.json({code:'settingsRestricted'},{status:403}); let form:FormData;try{form=await request.formData();}catch{return Response.json({code:'kpErrorSave'},{status:400});}
 const kind=form.get('kind');
 if(kind==='text'){const text=form.get('text'),topic=form.get('topic');if(typeof text!=='string'||!text.trim())return Response.json({code:'kpErrorEmpty'},{status:400});
  const query=typeof topic==='string'&&TOPICS.has(topic)?`?topic=${topic}`:'';
  return knowledgeCall(request,`/api/admin/knowledge/sources/text${query}`,{method:'POST',headers:{'Content-Type':'text/plain; charset=utf-8'},body:text});}
 if(kind==='link'){const url=form.get('url');if(typeof url!=='string'||!url.trim())return Response.json({code:'kpErrorLinkInvalid'},{status:400});
  return knowledgeCall(request,'/api/admin/knowledge/sources/link',{method:'POST',body:JSON.stringify({url:url.trim()})});}
 if(kind==='voice'){const file=form.get('file'),topic=form.get('topic');if(!(file instanceof File)||!file.size)return Response.json({code:'kpErrorVoiceType'},{status:400});
  const query=typeof topic==='string'&&TOPICS.has(topic)?`?topic=${topic}`:'';
  return knowledgeCall(request,`/api/admin/knowledge/sources/voice${query}`,{method:'POST',headers:{'Content-Type':'application/octet-stream','x-file-type':file.type||'audio/webm'},body:await file.arrayBuffer()},120000);}
 if(kind==='file'){const file=form.get('file');if(!(file instanceof File)||!file.size)return Response.json({code:'kpErrorFileType'},{status:400});
  return knowledgeCall(request,'/api/admin/knowledge/sources/file',{method:'POST',headers:{'Content-Type':'application/octet-stream','x-file-name':encodeURIComponent(file.name),'x-file-type':file.type||'application/octet-stream'},body:await file.arrayBuffer()},120000);}
 return Response.json({code:'kpErrorSave'},{status:400});
}
