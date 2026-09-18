const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const compiled=ts.transpileModule(fs.readFileSync('app/api/reset-tenant-data/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const roles={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/onboarding/roles.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:roles});
function load(role='owner',user={id:'authenticated-user'},status=200){
  const calls=[];const exports={};
  const db={auth:{getUser:async()=>({data:{user},error:null})},from(){return{select(){return this;},eq(field,value){assert.equal(field,'user_id');assert.equal(value,'authenticated-user');return this;},limit:async()=>({data:[{tenant_id:'server-tenant',role}],error:null})};}};
  vm.runInNewContext(compiled,{exports,require:name=>name.includes('leya-env')?{readLeyaBackendEnv:()=>({apiUrl:'https://backend.invalid',adminApiKey:'server-secret'})}:name.includes('roles')?roles:{createClient:()=>db},URL,Response,AbortSignal,console:{error(){}},process:{env:{}},fetch:async(url,options)=>{calls.push({url:String(url),options});return status===200?Response.json({reset:true}):Response.json({error:'private'},{status});}});
  return{...exports,calls};
}
const request=(origin='https://admin.invalid')=>new Request('https://admin.invalid/api/reset-tenant-data',{method:'POST',headers:{host:'admin.invalid',origin}});
test('reset-tenant-data proxy derives tenant/credentials on the server and forwards no body',async()=>{
  const h=load();const r=await h.POST(request());assert.equal(r.status,200);assert.equal(h.calls.length,1);
  const call=h.calls[0];assert.equal(new URL(call.url).searchParams.get('tenantId'),'server-tenant');
  assert.equal(call.options.method,'POST');assert.equal(call.options.headers.Authorization,'Bearer server-secret');
  assert.equal(call.options.body,undefined);
  const text=await r.text();assert.equal(text.includes('server-secret'),false);
  assert.deepEqual(JSON.parse(text),{reset:true});
});
test('reset-tenant-data proxy denies viewer, missing session and cross-origin calls',async()=>{
  for(const [h,r] of [[load('viewer'),request()],[load('owner',null),request()],[load(),request('https://evil.invalid')]]){
    const result=await h.POST(r);assert.ok([401,403].includes(result.status));assert.equal(h.calls.length,0);
  }
});
test('reset-tenant-data proxy surfaces a backend failure as a translatable code, not raw text',async()=>{
  const h=load('owner',{id:'authenticated-user'},500);
  const r=await h.POST(request());assert.equal(r.status,500);
  const body=await r.json();assert.equal(body.code,'serviceUnavailable');assert.equal(JSON.stringify(body).includes('private'),false);
});
