import {getAccountState} from '@/lib/auth/profile';
export const dynamic='force-dynamic';
/** 401 only without a user; a signed-in user whose profile is unavailable gets 503 (not a sign-out). */
export async function GET(){const state=await getAccountState();if(!state.signedIn)return Response.json({code:'connectionSessionExpired'},{status:401});return state.profile?Response.json(state.profile):Response.json({code:'serviceUnavailable'},{status:503});}
