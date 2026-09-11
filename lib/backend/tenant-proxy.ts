import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {requireRole,type TenantRole} from '@/lib/onboarding/roles';
import {readLeyaBackendEnv} from '@/lib/backend/leya-env';
export async function tenantBackend(request:Request,roles:readonly TenantRole[]=['owner','admin']){
 const db=createClient(),{data:{user},error}=await db.auth.getUser();if(error||!user)return{error:Response.json({error:'Войдите в кабинет.'},{status:401})} as const;
 const membership=await db.from('tenant_users').select('tenant_id,role').eq('user_id',user.id).limit(2);if(membership.error||membership.data?.length!==1)return{error:Response.json({error:'Не удалось определить бизнес.'},{status:403})} as const;
 try{requireRole(roles,membership.data[0].role);}catch{return{error:Response.json({error:'Недостаточно прав.'},{status:403})} as const;}
 const{apiUrl,adminApiKey}=readLeyaBackendEnv();if(!apiUrl||!adminApiKey)return{error:Response.json({error:'Сервис временно недоступен.'},{status:503})} as const;
 const call=async(path:string,init:RequestInit={})=>{const url=new URL(path,apiUrl);url.searchParams.set('tenantId',membership.data[0].tenant_id);return fetch(url,{...init,headers:{Authorization:`Bearer ${adminApiKey}`,'Content-Type':'application/json',...(init.headers??{})},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});};
 return{call,tenantId:membership.data[0].tenant_id,db} as const;
}
