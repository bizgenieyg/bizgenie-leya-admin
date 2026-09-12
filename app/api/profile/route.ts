import {getAccountProfile} from '@/lib/auth/profile';
export const dynamic='force-dynamic';
export async function GET(){const profile=await getAccountProfile();return profile?Response.json(profile):Response.json({error:'Unauthorized'},{status:401});}
