const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const roles={};vm.runInNewContext(compile('lib/onboarding/roles.ts'),{exports:roles});
function load(role='owner',user={id:'user'}){const calls=[],exports={};const db={auth:{getUser:async()=>({data:{user},error:null})},from(){return{select(){return this;},eq(k,v){assert.equal(k,'user_id');assert.equal(v,'user');return this;},limit:async()=>({data:[{tenant_id:'server-tenant',role}],error:null})};}};
vm.runInNewContext(compile('app/api/tenant-settings/route.ts'),{exports,require:n=>n==='server-only'?{}:n.includes('roles')?roles:{createClient:()=>db},URL,Response,AbortSignal,console:{error(){}},process:{env:{LEIA_API_URL:'https://backend.invalid',LEIA_ADMIN_API_KEY:'secret'}},fetch:async(url,options)=>{calls.push({url:String(url),options});return Response.json({saved:true});}});return{...exports,calls};}
const request=(body={},origin='https://admin.invalid')=>new Request('https://admin.invalid/api/tenant-settings',{method:'PATCH',headers:{host:'admin.invalid',origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('tenant settings mutations enforce role, origin and server-derived tenant',async()=>{
const h=load();assert.equal((await h.PATCH(request({translate_owner_answer:true,time_zone:'Asia/Jerusalem'}))).status,200);assert.equal(h.calls.length,1);assert.equal(new URL(h.calls[0].url).searchParams.get('tenantId'),'server-tenant');assert.equal(h.calls[0].options.headers.Authorization,'Bearer secret');
for(const[h,r]of [[load('viewer'),request()],[load('owner',null),request()],[load(),request({},'https://evil.invalid')],[load(),request({tenantId:'other'})]]){const result=await h.PATCH(r);assert.ok([400,401,403].includes(result.status));assert.equal(h.calls.length,0);}
});
test('tenant cannot change system tariff fields even with a crafted request',async()=>{
 for(const field of ['messages_per_month','voice_minutes_per_month','warning_percent','plan']){const h=load(),r=await h.PATCH(request({[field]:999999}));assert.equal(r.status,403);assert.equal(h.calls.length,0);}
});
test('tenant settings GET loads runtime settings and usage with the same tenant',async()=>{const h=load();const r=await h.GET(new Request('https://admin.invalid/api/tenant-settings'));assert.equal(r.status,200);assert.equal(h.calls.length,2);assert.ok(h.calls.every(c=>new URL(c.url).searchParams.get('tenantId')==='server-tenant'));assert.equal((await r.text()).includes('secret'),false);});
