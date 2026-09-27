const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

test('"Что знает ассистент": tenant-derived proxies, translated error codes, no raw backend text',()=>{
 const proxy=read('lib/knowledge/proxy.ts');
 assert.match(proxy,/tenantBackend\(request\)/);
 assert.match(proxy,/knowledgeCode\(data\.code/);
 for(const route of ['app/api/knowledge-profile/route.ts','app/api/knowledge-profile/sources/route.ts','app/api/knowledge-profile/sources/[id]/route.ts','app/api/knowledge-profile/sources/[id]/confirm/route.ts','app/api/knowledge-profile/facts/[id]/route.ts','app/api/knowledge-profile/audit/[id]/route.ts']){
  const source=read(route);assert.match(source,/knowledgeCall/,route);assert.doesNotMatch(source,/tenantId=/,route);
 }
 assert.match(read('app/api/knowledge-profile/sources/route.ts'),/text\/plain; charset=utf-8/,'long pasted text bypasses the JSON size limit');
 assert.match(read('app/api/knowledge-profile/sources/[id]/route.ts'),/error:data\.error\?knowledgeCode/,'failure reason goes out as a key');
});

test('screen follows the mockup and the cabinet rules: tabs, understood list, cards, dashed empty topics, logical CSS',()=>{
 const ui=read('components/tenant/knowledge-profile.tsx'),css=read('app/globals.css');
 for(const key of ['kpAdd','kpFilled','kpTell','kpImprove','kpUnderstood','kpCorrect','kpBefore','kpSuggested','kpAccept','kpSkip','kpWaiting'])assert.match(ui,new RegExp(`'${key}'`));
 for(const tab of ['text','file','link','photo'])assert.match(ui,new RegExp(`'${tab}'`));
 assert.doesNotMatch(ui,/voice/i,'voice is only in onboarding');
 assert.match(ui,/useI18n/);
 const block=css.slice(css.indexOf('Task R'));
 assert.match(block,/\.kp-topic\.empty\{border:0\.0625rem dashed var\(--warning\)/);
 assert.doesNotMatch(block,/\b(?:margin|padding)-(?:left|right)|\bleft:|\bright:|text-align:(?:left|right)/);
 assert.match(block,/min-height:var\(--touch\)/);
});

test('every topic, check and error key exists in ru, en and he',()=>{
 const i18n=read('lib/i18n/index.tsx');
 const ru=i18n.slice(i18n.indexOf('const taskRRu='),i18n.indexOf('const taskREn'));
 for(const topic of ['services_prices','location_hours','booking','faq','payment_cancel','why_us','about','other'])assert.match(ru,new RegExp(`kpTopic_${topic}`));
 for(const check of ['jargon','no_benefit','scary','no_price','objection','next_step','contradiction','conflict'])assert.match(ru,new RegExp(`kpCheck_${check}`));
 for(const code of read('lib/knowledge/proxy.ts').match(/'kp[A-Za-z]+'/g))assert.match(ru,new RegExp(code.slice(1,-1)));
 assert.match(i18n,/taskREn:Record<keyof typeof taskRRu,string>/);assert.match(i18n,/taskRHe:Record<keyof typeof taskRRu,string>/);
});
