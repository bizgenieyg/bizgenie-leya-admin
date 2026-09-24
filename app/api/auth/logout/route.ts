import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/backend/same-origin';
export async function POST(request:Request){if(!isSameOrigin(request))return Response.json({error:'logout_failed'},{status:403});const{error}=await createClient().auth.signOut();return error?Response.json({error:'logout_failed'},{status:500}):Response.json({ok:true});}
