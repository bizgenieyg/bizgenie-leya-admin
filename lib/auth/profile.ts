import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {readLeyaBackendEnv} from '@/lib/backend/leya-env';

export type AccountProfile={email:string;role:string;businessName:string;createdAt:string};
/** Z8.1: no user → sign in again; a user whose profile could not be loaded is still signed in (profile: null). */
export type AccountState={signedIn:false}|{signedIn:true;profile:AccountProfile|null};

/**
 * The account of the signed-in user. `tenants` is not readable with the user's key (RLS: no SELECT policy), so the
 * business name comes from the backend, like «Настройки → Бизнес»: membership is checked here (tenant_users, one
 * tenant), the backend is called for that tenant with the admin key.
 */
export async function getAccountState():Promise<AccountState>{
 const db=createClient(),{data:{user},error}=await db.auth.getUser();
 if(error||!user)return{signedIn:false};
 try{
  const membership=await db.from('tenant_users').select('tenant_id,role').eq('user_id',user.id).limit(2);
  if(membership.error||membership.data?.length!==1)return{signedIn:true,profile:null};
  const{apiUrl,adminApiKey}=readLeyaBackendEnv();if(!apiUrl||!adminApiKey)return{signedIn:true,profile:null};
  const url=new URL('/api/admin/tenant-settings',apiUrl);url.searchParams.set('tenantId',String(membership.data[0].tenant_id));
  const response=await fetch(url,{headers:{Authorization:`Bearer ${adminApiKey}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)return{signedIn:true,profile:null};
  const settings=await response.json() as {business_name?:unknown;owner_name?:unknown};
  const businessName=typeof settings.business_name==='string'&&settings.business_name.trim()?settings.business_name:typeof settings.owner_name==='string'?settings.owner_name:'';
  return{signedIn:true,profile:{email:user.email??'',role:String(membership.data[0].role),businessName,createdAt:String(user.created_at??'')}};
 }catch{console.error('account_profile_unavailable');return{signedIn:true,profile:null};}
}
