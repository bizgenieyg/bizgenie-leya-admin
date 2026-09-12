import {createClient} from '@/lib/supabase/server';
export async function POST(){const{error}=await createClient().auth.signOut();return error?Response.json({error:'logout_failed'},{status:500}):Response.json({ok:true});}
