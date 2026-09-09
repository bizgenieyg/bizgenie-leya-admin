import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/onboarding/roles';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
const editable = ['time_zone','weekly_schedule','auto_replies_paused','translate_owner_answer','escalation_remind_minutes','escalation_close_minutes','auto_resume_hours','deferred_max_age_hours','context_message_count','context_retention_hours','enabled_agents','default_agent'];
const system = ['messages_per_month','voice_minutes_per_month','warning_percent','plan'];
async function proxy(request: Request) {
 const fail=(error:string,status:number)=>Response.json({error},{status,headers});
 try {
  const origin=new URL(request.url);origin.host=request.headers.get('host')??origin.host;
  if(request.method==='PATCH'&&request.headers.get('origin')!==origin.origin)return fail('Запрос отклонён.',403);
  const db=createClient();const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user)return fail('Войдите в кабинет.',401);
  const {data,error}=await db.from('tenant_users').select('tenant_id,role').eq('user_id',user.id).limit(2);
  if(error||data?.length!==1)return fail('Не удалось определить бизнес.',403);
  try{requireRole(['owner','admin'],data[0].role);}catch{return fail('Доступно владельцу или администратору.',403);}
  if(!process.env.LEIA_API_URL||!process.env.LEIA_ADMIN_API_KEY)return fail('Сервис временно недоступен.',503);
  const call=async(path:string,method='GET',body?:Record<string,unknown>)=>{
   const url=new URL(path,process.env.LEIA_API_URL);url.searchParams.set('tenantId',data[0].tenant_id);
   return fetch(url,{method,headers:{Authorization:`Bearer ${process.env.LEIA_ADMIN_API_KEY}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  };
  if(request.method==='PATCH'){
   const input=await request.json();if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>system.includes(key)))return fail('Лимиты и тариф меняет только оператор платформы.',403);
   if(Object.keys(input).some(key=>!editable.includes(key)))return fail('Недопустимые настройки.',400);
   const saved=await call('/api/admin/tenant-settings','PATCH',input);
   if(!saved.ok)return fail(saved.status===400?'Проверьте настройки: время закрытия должно быть позже напоминания, агент по умолчанию должен быть включён.':'Не удалось сохранить настройки.',saved.status);
   return Response.json({saved:true},{headers});
  }
  const [settings,usage]=await Promise.all([call('/api/admin/tenant-settings'),call('/api/admin/usage')]);
  if(!settings.ok||!usage.ok)return fail('Не удалось загрузить настройки и расход.',502);
  const raw=await settings.json();const safe=Object.fromEntries([...editable,...system,'owner_phone','paired','exceptions','supported_time_zones'].map(key=>[key,raw[key]]));
  return Response.json({settings:safe,usage:await usage.json()},{headers});
 }catch{console.error('tenant_settings_proxy_failed');return fail('Сервис временно недоступен.',502);}
}
export const GET=proxy;
export const PATCH=proxy;
