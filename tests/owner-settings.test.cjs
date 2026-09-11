const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const compiled=ts.transpileModule(fs.readFileSync('app/api/owner-settings/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const roles={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/onboarding/roles.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:roles});
function load(role='owner',user={id:'authenticated-user'}){
  const calls=[];const exports={};
  const db={auth:{getUser:async()=>({data:{user},error:null})},from(){return{select(){return this;},eq(field,value){assert.equal(field,'user_id');assert.equal(value,'authenticated-user');return this;},limit:async()=>({data:[{tenant_id:'server-tenant',role}],error:null})};}};
  vm.runInNewContext(compiled,{exports,require:name=>name.includes('leya-env')?{readLeyaBackendEnv:()=>({apiUrl:'https://backend.invalid',adminApiKey:'server-secret'})}:name.includes('roles')?roles:{createClient:()=>db},URL,Response,AbortSignal,console:{error(){}},process:{env:{}},fetch:async(url,options)=>{calls.push({url:String(url),options});return Response.json({pairingCommand:'ПОДТВЕРДИТЬ test'});}});
  return{...exports,calls};
}
const request=(origin='https://admin.invalid')=>new Request('https://admin.invalid/api/owner-settings',{method:'POST',headers:{host:'admin.invalid',origin,'Content-Type':'application/json'},body:JSON.stringify({tenantId:'attacker-tenant',phone:'972500000001',timeZone:'Europe/Berlin',quietStart:'20:00',quietEnd:'09:00'})});
test('owner settings proxy derives tenant and credentials on server, forwards only settings',async()=>{
  const h=load();const r=await h.POST(request());assert.equal(r.status,200);assert.equal(h.calls.length,1);
  const call=h.calls[0];assert.equal(new URL(call.url).searchParams.get('tenantId'),'server-tenant');
  const body=JSON.parse(call.options.body);assert.equal(body.tenantId,undefined);assert.equal(body.timeZone,'Europe/Berlin');
  assert.equal(call.options.headers.Authorization,'Bearer server-secret');
  assert.equal((await r.text()).includes('server-secret'),false);
});
test('owner settings proxy denies viewer, missing session and cross-origin mutation',async()=>{
  for(const [h,r] of [[load('viewer'),request()],[load('owner',null),request()],[load(),request('https://evil.invalid')]]){
    const result=await h.POST(r);assert.ok([401,403].includes(result.status));assert.equal(h.calls.length,0);
  }
});
