const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

test('client cabinet exposes search, safe mutations, preserved-history deletion and summary periods',()=>{
 const directory=fs.readFileSync('components/tenant/client-directory.tsx','utf8');
 const summary=fs.readFileSync('components/tenant/owner-summary.tsx','utf8');
 const route=fs.readFileSync('app/api/clients/[id]/route.ts','utf8');
 for(const key of ['noClients','searchClients','disableAuto','hideConfirm','hideCard','eraseCard','recentMessages'])assert.match(directory,new RegExp(`t\\('${key}'`));
 for(const method of ['GET','PATCH','DELETE'])assert.match(route,new RegExp(`export async function ${method}`));
 assert.match(route,/tenantBackend/);
 assert.match(route,/bot_paused/);
 assert.match(route,/permanent=true/);
 for(const key of ['day','week','month','missingKnowledge'])assert.match(summary,new RegExp(`t\\('${key}'`));
});
test('client list hides the GOWS identifier, translates codes and supports dialogue takeover',()=>{
 const directory=fs.readFileSync('components/tenant/client-directory.tsx','utf8');
 assert.doesNotMatch(directory,/<small>\{item\.phone\}<\/small>/);
 for(const value of ['in_dialogue','SALE','SUPPORT','RECEPTION'])assert.match(directory,new RegExp(value));
 for(const key of ['ownerResponder','leyaResponder','takeOver','returnToLeya'])assert.match(directory,new RegExp(`t\\('${key}'`));
});
