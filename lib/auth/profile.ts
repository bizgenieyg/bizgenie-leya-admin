import 'server-only';
import {createClient} from '@/lib/supabase/server';

export type AccountProfile={email:string;role:string;businessName:string;createdAt:string};

export async function getAccountProfile():Promise<AccountProfile|null>{
 const db=createClient(),{data:{user},error}=await db.auth.getUser();
 if(error||!user)return null;
 const membership=await db.from('tenant_users').select('tenant_id,role').eq('user_id',user.id).limit(2);
 if(membership.error||membership.data?.length!==1)return null;
 const tenant=await db.from('tenants').select('business_name,name,created_at').eq('id',membership.data[0].tenant_id).single();
 if(tenant.error||!tenant.data)return null;
 return{email:user.email??'',role:String(membership.data[0].role),businessName:String(tenant.data.business_name||tenant.data.name||''),createdAt:String(user.created_at||tenant.data.created_at||'')};
}
