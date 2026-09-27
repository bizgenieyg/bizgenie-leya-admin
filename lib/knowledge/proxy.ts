import 'server-only';
import {tenantBackend} from '@/lib/backend/tenant-proxy';

/** Backend error codes of "Что знает Лея" → dictionary keys; raw backend text never reaches the owner. */
const CODES:Record<string,string>={
 source_empty:'kpErrorEmpty',source_text_too_long:'kpErrorTooLong',knowledge_file_type:'kpErrorFileType',knowledge_file_too_large:'kpErrorFileTooLarge',
 knowledge_index_limit:'kpErrorLimit',knowledge_invalid_file:'kpErrorFileType',link_invalid:'kpErrorLinkInvalid',link_private:'kpErrorLinkInvalid',
 link_social:'kpErrorLinkSocial',link_timeout:'kpErrorLinkUnavailable',link_unavailable:'kpErrorLinkUnavailable',link_too_large:'kpErrorLinkUnavailable',
 link_not_html:'kpErrorLinkUnavailable',link_empty:'kpErrorLinkEmpty',photo_no_text:'kpErrorPhotoNoText',source_model_unavailable:'kpErrorUnavailable',
 source_failed:'kpErrorProcessing',fact_invalid:'kpErrorFactInvalid',fact_not_found:'kpErrorGone',fact_archived:'kpErrorGone',audit_not_found:'kpErrorGone',
 audit_decided:'kpErrorGone',audit_action:'kpErrorSave',source_not_found:'kpErrorGone',
};
export const knowledgeCode=(code:unknown,fallback='kpErrorSave')=>CODES[String(code)]??fallback;
export const isId=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Calls the backend for the signed-in owner's tenant and returns JSON with translated error codes. */
export async function knowledgeCall(request:Request,path:string,init:RequestInit={},timeoutMs=15000,fallback='kpErrorSave'):Promise<Response>{
 const auth=await tenantBackend(request);if('error' in auth)return auth.error??Response.json({code:'kpErrorUnavailable'},{status:503});
 let r:Response|undefined;try{r=await auth.call(path,init,timeoutMs);}catch{r=undefined;}
 if(!r)return Response.json({code:'kpErrorUnavailable'},{status:503});
 if(r.status===204)return new Response(null,{status:204});
 const data=await r.json().catch(()=>({})) as Record<string,unknown>;
 if(!r.ok)return Response.json({code:knowledgeCode(data.code,r.status===429?'kpErrorLimit':fallback)},{status:r.status});
 return Response.json(data,{status:r.status,headers:{'Cache-Control':'no-store'}});
}
