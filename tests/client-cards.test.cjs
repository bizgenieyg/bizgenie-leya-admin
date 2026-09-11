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
test('client directory uses a logical drawer and server-paged search',()=>{
 const directory=fs.readFileSync('components/tenant/client-directory.tsx','utf8');
 const route=fs.readFileSync('app/api/clients/route.ts','utf8');
 const css=fs.readFileSync('app/globals.css','utf8');
 assert.match(directory,/client-drawer-backdrop/);
 assert.match(directory,/load\(false\)/);
 assert.match(route,/\.range\(from,from\+limit-1\)/);
 assert.match(route,/\.order\('last_seen_at'/);
 assert.match(route,/name\.ilike/);
 assert.doesNotMatch(route,/call\(`\/api\/admin\/clients\?search=/);
 assert.match(css,/margin-inline-start:auto/);
});
test('knowledge editor lives only on the dedicated knowledge page',()=>{
 const home=fs.readFileSync('app/admin/page.tsx','utf8');
 const knowledge=fs.readFileSync('app/admin/knowledge/page.tsx','utf8');
 assert.doesNotMatch(home,/KnowledgeEditor/);
 assert.match(knowledge,/KnowledgeEditor/);
});
