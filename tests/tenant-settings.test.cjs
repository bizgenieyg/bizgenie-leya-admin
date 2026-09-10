const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const roles={},normalizer={},fields={};vm.runInNewContext(compile('lib/onboarding/roles.ts'),{exports:roles});vm.runInNewContext(compile('lib/tenant-settings/normalize.ts'),{exports:normalizer,Date,Number,Object,Array});vm.runInNewContext(compile('lib/tenant-settings/fields.ts'),{exports:fields});
function load(role='owner',user={id:'user'}){const calls=[],exports={};const db={auth:{getUser:async()=>({data:{user},error:null})},from(){return{select(){return this;},eq(k,v){assert.equal(k,'user_id');assert.equal(v,'user');return this;},limit:async()=>({data:[{tenant_id:'server-tenant',role}],error:null})};}};
vm.runInNewContext(compile('app/api/tenant-settings/route.ts'),{exports,require:n=>n==='server-only'?{}:n.includes('roles')?roles:n.includes('normalize')?normalizer:n.includes('fields')?fields:{createClient:()=>db},URL,Response,AbortSignal,console:{error(){}},process:{env:{LEIA_API_URL:'https://backend.invalid',LEIA_ADMIN_API_KEY:'secret'}},fetch:async(url,options)=>{calls.push({url:String(url),options});return Response.json({saved:true});}});return{...exports,calls};}
const request=(body={},origin='https://admin.invalid')=>new Request('https://admin.invalid/api/tenant-settings',{method:'PATCH',headers:{host:'admin.invalid',origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('tenant settings mutations enforce role, origin and server-derived tenant',async()=>{
const h=load(),settings={time_zone:'UTC+3',auto_replies_paused:true,enabled_agents:['SALE'],summary_frequency:'weekly',summary_time:'10:30',summary_weekday:2};assert.equal((await h.PATCH(request(settings))).status,200);assert.equal(h.calls.length,1);assert.equal(new URL(h.calls[0].url).searchParams.get('tenantId'),'server-tenant');assert.equal(h.calls[0].options.headers.Authorization,'Bearer secret');assert.deepEqual(JSON.parse(h.calls[0].options.body),settings);
for(const[h,r]of [[load('viewer'),request()],[load('owner',null),request()],[load(),request({},'https://evil.invalid')],[load(),request({tenantId:'other'})]]){const result=await h.PATCH(r);assert.ok([400,401,403].includes(result.status));assert.equal(h.calls.length,0);}
});
// These tests iterate the exact field lists the route imports (lib/tenant-settings/fields),
// so a new operator/system field is covered automatically and drift is caught.
const fieldLists=fields;
test('operator and system field lists are well-formed and cover message_retention_days',()=>{
 assert.ok(fieldLists.operatorOnly.includes('message_retention_days'),'retention is operator-only');
 const editable=new Set(fieldLists.editable);
 for(const f of [...fieldLists.operatorOnly,...fieldLists.system])assert.equal(editable.has(f),false,`${f} must not also be owner-editable`);
 for(const f of fieldLists.system)assert.equal(fieldLists.operatorOnly.includes(f),false,`${f} is system, not operatorOnly`);
});
test('tenant cannot change system tariff fields even with a crafted request',async()=>{
 for(const field of fieldLists.system){const h=load(),r=await h.PATCH(request({[field]:999999}));assert.equal(r.status,403,field);assert.equal(h.calls.length,0);}
});
test('tenant cannot change operator settings even with a crafted request',async()=>{
 for(const field of fieldLists.operatorOnly){const h=load(),r=await h.PATCH(request({[field]:field.endsWith('_routes')?[]:1}));assert.equal(r.status,403,field);assert.equal(h.calls.length,0);}
});
test('tenant settings GET returns owner fields and hides operator fields',async()=>{const h=load();const r=await h.GET(new Request('https://admin.invalid/api/tenant-settings'));assert.equal(r.status,200);assert.equal(h.calls.length,2);assert.ok(h.calls.every(c=>new URL(c.url).searchParams.get('tenantId')==='server-tenant'));const body=JSON.parse(await r.text());assert.equal(JSON.stringify(body).includes('secret'),false);for(const key of ['enabled_agents','weekly_schedule','supported_time_zones'])assert.ok(key in body.settings);for(const key of ['campaign_routes','source_routes','templates','translate_owner_answer','intent_confidence_threshold'])assert.equal(key in body.settings,false,key);});
