const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = file => fs.readFileSync(file, 'utf8');

test('Z6 onboarding path: step 1 → owner → «Расскажите о бизнесе» → simulator → WhatsApp (QR) → cabinet', () => {
  assert.match(read('app/onboarding/step-1/page.tsx'), /router\.push\('\/onboarding\/owner'\)/);
  const owner = read('app/onboarding/owner/page.tsx');
  assert.match(owner, /href="\/onboarding\/step-1">\{t\('back'\)\}/);
  assert.match(owner, /href="\/onboarding\/knowledge">\{t\('next'\)\}/);
  assert.match(owner, /href="\/onboarding\/knowledge">\{t\('skip'\)\}/, 'pairing needs the WhatsApp session, connected later — the step can be skipped');
  const knowledge = read('app/onboarding/knowledge/page.tsx');
  assert.match(knowledge, /<KnowledgeProfile onboarding \/>/); assert.match(knowledge, /href="\/onboarding\/simulator"/);
  const simulator = read('app/onboarding/simulator/page.tsx');
  assert.match(simulator, /<ConversationSimulator suggestions=\{suggestions\} \/>/); assert.match(simulator, /href="\/onboarding\/step-3"/);
  const whatsapp = read('components/tenant/whatsapp-connection.tsx');
  assert.doesNotMatch(whatsapp, /onboarding\/step-4/);
  assert.match(whatsapp, /href="\/onboarding\/owner\?after=whatsapp">\{t\('next'\)\}/, 'after the QR — back to confirm the owner number');
  assert.match(read('app/onboarding/step-frame.tsx'), /\[1, 2, 3, 4, 5\]/);
  assert.match(read('app/onboarding/owner/page.tsx'), /step=\{afterWhatsapp\?5:2\}/);
  for (const [page, step] of [['knowledge', 3], ['simulator', 4], ['step-3', 5]]) assert.match(read(`app/onboarding/${page}/page.tsx`), new RegExp(`step=\\{${step}\\}`));
});

test('Z6: step-2 (tone, greetings) and step-4 (FAQ) are out of the path; direct URLs redirect to the next step', () => {
  assert.match(read('app/onboarding/step-2/page.tsx'), /redirect\('\/onboarding\/owner'\)/);
  assert.match(read('app/onboarding/step-4/page.tsx'), /redirect\('\/admin'\)/);
  assert.ok(fs.existsSync('components/tenant/greeting-templates.tsx') && fs.existsSync('components/tenant/knowledge-editor.tsx'), 'pages and data are kept');
});

test('Z6 assistant section: tone, style, greetings and discovery chips hidden on the instruction path; simulator stays', () => {
  // Z8: the section is «Настройки → Ассистент»; the instruction mode comes with the settings already loaded.
  const page = read('components/tenant/tenant-settings.tsx');
  assert.match(page, /const legacy=!s\.instruction_answers;/);
  assert.match(page, /\{legacy\?<><div className="settings-subsection"><h3>\{t\('discoveryTitle'\)\}/);
  assert.match(page, /<h3>\{t\('greetingTitle'\)\}<\/h3><p className="field-help">\{t\('greetingHelp'\)\}<\/p><GreetingTemplates\/>/);
  assert.match(page, /<AssistantSettings hideStyle=\{!legacy\} ownerLanguage=\{s\.owner_language\}\/>/);
  assert.match(read('components/ui/page-heading.tsx'), /<SimulatorOpenButton\/>/);
  assert.match(read('components/tenant/assistant-settings.tsx'), /\{hideStyle\?null:<><label htmlFor="tone"/);
  assert.match(read('app/api/tenant-settings/route.ts'), /'instruction_answers','simulator_suggestions'/);
  const simulator = read('components/tenant/conversation-simulator.tsx');
  assert.match(simulator, /suggestions\.map\(question => <button key=\{question\} type="button" className="preset-card"/);
  assert.match(simulator, /t\('simulatorOwnQuestion'\)/);
});

test('Z6 review: owner number before the QR is saved and confirmed after it (pending → after=whatsapp → code → cabinet)', () => {
  const owner = read('app/onboarding/owner/page.tsx');
  assert.match(owner, /afterWhatsapp=useSearchParams\(\)\.get\('after'\)==='whatsapp'/);
  assert.match(owner, /setPending\(data\.pending==='whatsapp'\)/);
  assert.match(owner, /t\('ownerPendingWhatsapp'\)/);
  assert.match(owner, /paired\|\|pending\?<Link className=\{buttonClass\} href="\/onboarding\/knowledge">/, 'a saved number lets the onboarding go on');
  assert.match(owner, /paired\?<Link className=\{buttonClass\} href="\/admin">\{t\('finishSetup'\)\}/, 'the cabinet only after the code is confirmed (or skipped)');
  assert.match(read('app/api/owner-settings/route.ts'), /result\.pending === 'whatsapp' \? \{ pending: 'whatsapp' \}/);
});
