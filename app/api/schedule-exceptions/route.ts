import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/onboarding/roles';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
async function proxy(request:Request){
 const fail=(error:string,status:number)=>Response.json({error},{status,headers});
 try{
  const origin=new URL(request.url);origin.host=request.headers.get('host')??origin.host;
  if(request.method!=='GET'&&request.headers.get('origin')!==origin.origin)return fail('Запрос отклонён.',403);
  const db=createClient(),{data:{user},error:authError}=await db.auth.getUser();if(authError||!user)return fail('Войдите в кабинет.',401);
  const {data,error}=await db.from('tenant_users').select('tenant_id,role').eq('user_id',user.id).limit(2);if(error||data?.length!==1)return fail('Не удалось определить бизнес.',403);
  try{requireRole(['owner','admin'],data[0].role);}catch{return fail('Доступно владельцу или администратору.',403);}
  if(!process.env.LEIA_API_URL||!process.env.LEIA_ADMIN_API_KEY)return fail('Сервис временно недоступен.',503);
  const incoming=new URL(request.url),url=new URL('/api/admin/schedule-exceptions',process.env.LEIA_API_URL);url.searchParams.set('tenantId',data[0].tenant_id);
  const id=incoming.searchParams.get('id');if(id)url.searchParams.set('id',id);
  const input=['POST','PATCH'].includes(request.method)?await request.json():undefined;
  const body=input&&typeof input==='object'&&!Array.isArray(input)?Object.fromEntries(['start_date','end_date','kind','work_start','work_end','name','recurs_annually'].map(key=>[key,input[key]])):undefined;
  const upstream=await fetch(url,{method:request.method,headers:{Authorization:`Bearer ${process.env.LEIA_ADMIN_API_KEY}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!upstream.ok)return fail(upstream.status===400?'Проверьте даты и часы исключения.':'Не удалось изменить календарь.',upstream.status);
  return upstream.status===204?new Response(null,{status:204,headers}):Response.json(await upstream.json(),{status:upstream.status,headers});
 }catch{console.error('schedule_exceptions_proxy_failed');return fail('Сервис временно недоступен.',502);}
}
export const GET=proxy;export const POST=proxy;export const PATCH=proxy;export const DELETE=proxy;
