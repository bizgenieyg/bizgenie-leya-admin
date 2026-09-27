import {knowledgeCall} from '@/lib/knowledge/proxy';
export const dynamic='force-dynamic';
export async function GET(request:Request){return knowledgeCall(request,'/api/admin/knowledge/profile',{},15000,'kpErrorLoad');}
