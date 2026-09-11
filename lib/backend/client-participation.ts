import 'server-only';

type DatabaseClient={from:(table:string)=>any};
type ClientRow={id:string;current_conversation_id?:string|null;[key:string]:unknown};

export async function enrichParticipation(db:DatabaseClient,tenantId:string,clients:ClientRow[]){
  const ids=clients.map(client=>client.id).filter(Boolean);
  if(!ids.length)return clients;
  const result=await db.from('conversations').select('id,client_id,bot_paused,status,last_message_at').eq('tenant_id',tenantId).in('client_id',ids).order('last_message_at',{ascending:false});
  if(result.error)return clients.map(client=>({...client,bot_paused:null}));
  const latest=new Map<string,{id:string;bot_paused:boolean}>();
  for(const row of result.data??[]){if(row.status==='active'&&!latest.has(row.client_id))latest.set(row.client_id,{id:row.id,bot_paused:row.bot_paused===true});}
  return clients.map(client=>({...client,bot_paused:latest.get(client.id)?.bot_paused??null,current_conversation_id:client.current_conversation_id??latest.get(client.id)?.id??null}));
}
