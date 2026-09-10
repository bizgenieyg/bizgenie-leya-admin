const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

test('client cabinet exposes search, safe mutations, preserved-history deletion and summary periods',()=>{
 const directory=fs.readFileSync('components/tenant/client-directory.tsx','utf8');
 const summary=fs.readFileSync('components/tenant/owner-summary.tsx','utf8');
 const route=fs.readFileSync('app/api/clients/[id]/route.ts','utf8');
 for(const text of ['Пока никто не обращался','Поиск по имени или номеру','Больше не отвечать автоматически','История сообщений и связь с диалогами сохранятся','Скрыть карточку','Стереть полностью','Последние сообщения'])assert.match(directory,new RegExp(text));
 for(const method of ['GET','PATCH','DELETE'])assert.match(route,new RegExp(`export async function ${method}`));
 assert.match(route,/tenantBackend/);
 assert.match(route,/permanent=true/);
 for(const text of ['За день','За неделю','За месяц','Каких знаний не хватило'])assert.match(summary,new RegExp(text));
});
