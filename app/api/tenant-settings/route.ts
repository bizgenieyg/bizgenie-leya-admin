import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/onboarding/roles';
import { normalizeTenantSettings } from '@/lib/tenant-settings/normalize';
import { editable, operatorOnly, system } from '@/lib/tenant-settings/fields';
import {readLeyaBackendEnv} from '@/lib/backend/leya-env';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
async function proxy(request: Request) {
 const fail=(code:string,status:number)=>Response.json({code},{status,headers});
 try {
  const origin=new URL(request.url);origin.host=request.headers.get('host')??origin.host;
  if(request.method==='PATCH'&&request.headers.get('origin')!==origin.origin)return fail('settingsRestricted',403);
  const db=createClient();const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user)return fail('connectionSessionExpired',401);
  const {data,error}=await db.from('tenant_users').select('tenant_id,role').eq('user_id',user.id).limit(2);
  if(error||data?.length!==1)return fail('settingsRestricted',403);
  try{requireRole(['owner','admin'],data[0].role);}catch{return fail('settingsRestricted',403);}
  const{apiUrl,adminApiKey}=readLeyaBackendEnv();if(!apiUrl||!adminApiKey)return fail('serviceUnavailable',503);
  const call=async(path:string,method='GET',body?:Record<string,unknown>)=>{
   const url=new URL(path,apiUrl);url.searchParams.set('tenantId',data[0].tenant_id);
   return fetch(url,{method,headers:{Authorization:`Bearer ${adminApiKey}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  };
  if(request.method==='PATCH'){
   const input=await request.json();if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>[...system,...operatorOnly].includes(key)))return fail('settingsRestricted',403);
   if(Object.keys(input).some(key=>!editable.includes(key)))return fail('settingsInvalid',400);
   if('business_sector' in input&&(typeof input.business_sector!=='string'||input.business_sector.trim().length>100))return fail('settingsInvalid',400);
   const saved=await call('/api/admin/tenant-settings','PATCH',input);
   if(!saved.ok)return fail(saved.status===400?'settingsInvalid':'serviceUnavailable',saved.status);
   return Response.json({saved:true},{headers});
  }
  const [settings,usage]=await Promise.all([call('/api/admin/tenant-settings'),call('/api/admin/usage')]);
  if(!settings.ok||!usage.ok)return fail('serviceUnavailable',502);
  const raw=normalizeTenantSettings(await settings.json());const safe=Object.fromEntries([...editable,...system,'owner_phone','paired','exceptions','supported_time_zones','greeting_template_defaults'].map(key=>[key,raw[key as keyof typeof raw]]));
  return Response.json({settings:safe,usage:await usage.json()},{headers});
 }catch{console.error('tenant_settings_proxy_failed');return fail('serviceUnavailable',502);}
}
export const GET=proxy;
export const PATCH=proxy;
