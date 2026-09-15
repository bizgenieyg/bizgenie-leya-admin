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
test('client list shows only name and last inquiry while the card keeps owner controls',()=>{
 const directory=fs.readFileSync('components/tenant/client-directory.tsx','utf8');
 for(const hidden of ['item.phone','item.status','item.inquiry_count','card.phone','card.language','card.first_seen_at','card.current_agent'])assert.doesNotMatch(directory,new RegExp(hidden.replace('.', '\\.')));
 for(const key of ['lastInquiry','takeOver','returnToLeya','ownerNote','recentMessages','hideCard','eraseCard'])assert.ok(directory.includes(`t('${key}')`));
});
test('client directory expands below the selected row and uses server-paged search and filters',()=>{
 const directory=fs.readFileSync('components/tenant/client-directory.tsx','utf8');
 const route=fs.readFileSync('app/api/clients/route.ts','utf8');
 const css=fs.readFileSync('app/globals.css','utf8');
 assert.match(directory,/inline-client-card/);
 assert.match(directory,/selected\?\.id===item\.id\?card:null/);
 assert.match(directory,/load\(false\)/);
 for(const key of ['page','limit','search','status'])assert.match(route,new RegExp(`'${key}'`));
 assert.match(route,/\/api\/admin\/clients\?\$\{query\}/);
 assert.doesNotMatch(route,/\/api\/admin\/clients\/\$\{encodeURIComponent/);
 assert.match(route,/enrichParticipation/);
 assert.match(css,/@container/);
});
test('knowledge editor lives in the combined assistant workspace',()=>{
 const home=fs.readFileSync('app/admin/page.tsx','utf8');
 const assistant=fs.readFileSync('app/admin/assistant/page.tsx','utf8');
 const legacy=fs.readFileSync('app/admin/knowledge/page.tsx','utf8');
 assert.doesNotMatch(home,/KnowledgeEditor/);
 assert.match(assistant,/KnowledgeEditor/);
 assert.match(assistant,/ConversationSimulator/);
 assert.match(legacy,/redirect\('\/admin\/assistant#knowledge'\)/);
});
