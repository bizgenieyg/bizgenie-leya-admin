const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
test('legacy settings response renders from complete runtime defaults',()=>{
 const exports={};vm.runInNewContext(compile('lib/tenant-settings/normalize.ts'),{exports,Date,Number,Object,Array});
 const settings=exports.normalizeTenantSettings({time_zone:'Asia/Jerusalem'}),usage=exports.normalizeUsage({});
 assert.deepEqual([...settings.campaign_routes],[]);assert.deepEqual([...settings.source_routes],[]);assert.deepEqual([...settings.enabled_agents],['SALE','SUPPORT']);
 assert.equal(Object.keys(settings.weekly_schedule).length,7);assert.doesNotThrow(()=>settings.supported_time_zones.map(String));assert.doesNotThrow(()=>settings.exceptions.map(String));assert.equal(settings.intent_confidence_threshold,.75);assert.equal(settings.route_stickiness_hours,24);assert.equal(settings.reception_max_messages,0);assert.equal(settings.auto_resume_hours,0);assert.equal(settings.deferred_max_age_hours,12);assert.equal(settings.context_message_count,10);assert.equal(settings.context_retention_hours,48);assert.deepEqual(Object.keys(settings.templates),[]);assert.equal(usage.events.model_calls,0);
});
test('settings sections have independent error boundaries',()=>{const page=fs.readFileSync('components/tenant/tenant-settings.tsx','utf8'),boundary=fs.readFileSync('components/tenant/settings-section-boundary.tsx','utf8');assert.ok((page.match(/SettingsSectionBoundary render=/g)||[]).length>=4);assert.match(boundary,/getDerivedStateFromError/);assert.match(boundary,/Остальные разделы доступны/);});
