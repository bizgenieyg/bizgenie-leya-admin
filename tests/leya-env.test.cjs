const assert=require('node:assert/strict');
const{readFileSync}=require('node:fs');
const test=require('node:test');
const vm=require('node:vm');
const ts=require('typescript');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/backend/leya-env.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsObject,require:()=>({}),process:{env:{}},console});
test('proxy environment accepts current names, legacy fallback and current priority',()=>{
 const warnings=[];
 assert.deepEqual({...exportsObject.readLeyaBackendEnv({LEYA_API_URL:'https://new.example',LEYA_ADMIN_API_KEY:'new-key'},message=>warnings.push(message))},{apiUrl:'https://new.example',adminApiKey:'new-key'});
 assert.deepEqual({...exportsObject.readLeyaBackendEnv({LEIA_API_URL:'https://old.example',LEIA_ADMIN_API_KEY:'old-key'},message=>warnings.push(message))},{apiUrl:'https://old.example',adminApiKey:'old-key'});
 assert.deepEqual({...exportsObject.readLeyaBackendEnv({LEYA_API_URL:'https://new.example',LEIA_API_URL:'https://old.example',LEYA_ADMIN_API_KEY:'new-key',LEIA_ADMIN_API_KEY:'old-key'},message=>warnings.push(message))},{apiUrl:'https://new.example',adminApiKey:'new-key'});
 assert.equal(warnings.length,2);
});
