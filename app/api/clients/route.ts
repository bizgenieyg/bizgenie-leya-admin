import {tenantBackend} from '@/lib/backend/tenant-proxy';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const auth=await tenantBackend(request);if('error'in auth)return auth.error;const incoming=new URL(request.url),response=await auth.call(`/api/admin/clients?search=${encodeURIComponent(incoming.searchParams.get('search')??'')}`);return Response.json(response.ok?await response.json():{error:'Не удалось загрузить клиентов.'},{status:response.ok?200:response.status});}catch{return Response.json({error:'Сервис временно недоступен.'},{status:502});}}
