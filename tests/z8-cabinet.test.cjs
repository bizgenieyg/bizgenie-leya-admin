const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const read = file => fs.readFileSync(file, 'utf8');
const compile = (file, jsx = false) => ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, ...(jsx ? { jsx: ts.JsxEmit.ReactJSX } : {}) } }).outputText;
const labels = (() => { const exports = {}; vm.runInNewContext(compile('lib/tenant/labels.ts'), { exports }); return exports; })();
const dictionary = read('lib/i18n/index.tsx');
const block = name => { const line = dictionary.split('\n').find(l => l.startsWith(`const ${name}`)); assert.ok(line, name); return line; };
const value = (line, key) => { const m = new RegExp(`[{,]${key}:("(?:[^"\\\\]|\\\\.)*"|'[^']*')`).exec(line); assert.ok(m, key); return m[1].startsWith('"') ? JSON.parse(m[1]) : m[1].slice(1, -1); };

// A minimal renderer: the component function is called with hooks backed by slots (children are not rendered).
function mount(file, props, { words = {}, modules = {}, fetch } = {}) {
  let index = 0, dirty = true, tree; const slots = [], effects = [];
  const exports = {}, jsx = (type, p) => ({ type, props: p });
  vm.runInNewContext(compile(file, true), { exports, Error, JSON, Object, Array, Promise, fetch, window: undefined, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === 'react') return {
      useState(initial) { const key = index++; if (!(key in slots)) slots[key] = typeof initial === 'function' ? initial() : initial; return [slots[key], next => { slots[key] = typeof next === 'function' ? next(slots[key]) : next; dirty = true; }]; },
      useRef(initial) { const key = index++; if (!(key in slots)) slots[key] = { current: initial }; return slots[key]; },
      useEffect(fn) { const key = index++; if (!(key in slots)) { slots[key] = true; effects.push(fn); } },
    };
    if (name === '@/lib/i18n') return { useI18n: () => ({ locale: 'ru', t: (key, vars = {}) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), words[key] ?? key) }) };
    if (name === 'next/link') return { __esModule: true, default: 'Link' };
    return modules[name] ?? {};
  } });
  const render = () => { while (dirty) { dirty = false; index = 0; tree = exports.default(props); while (effects.length) effects.shift()(); } return tree; };
  const settle = async () => { for (let i = 0; i < 12; i++) { await Promise.resolve(); render(); } };
  render();
  return { render, settle };
}
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : !tree || typeof tree !== 'object' ? [] : [tree, ...nodes(tree.props?.children)];
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree && typeof tree === 'object' ? text(tree.props?.children) : typeof tree === 'string' ? tree : '';

test('Z8 menu: Главная · Клиенты · Группы · Что знает {имя} · Настройки — no «Ассистент», no «Профиль»', () => {
  const shell = read('components/ui/app-shell.tsx');
  const hrefs = [...shell.slice(shell.indexOf('const items'), shell.indexOf('] as const')).matchAll(/href: '([^']+)', key: '([^']+)'/g)].map(m => `${m[1]} ${m[2]}`);
  assert.deepEqual(hrefs, ['/admin homeNav', '/admin/clients clientsLink', '/admin/groups groupsNav', '/admin/knowledge kpTitleNamed', '/admin/settings settingsNav']);
  assert.doesNotMatch(shell, /\/admin\/assistant|\/admin\/profile|assistantNav/);
  assert.match(shell, /<span className="brand-mark">L<\/span><span className="collapsible-label">Leya<\/span>/, 'the logo stays «Leya»');
  assert.match(shell, /assistant\?t\(key,\{name:assistant\}\):<span className="label-placeholder"/, 'no default name flashing before the real one');
});

test('Z8 redirects: /admin/assistant and /admin/profile → the matching «Настройки» section', () => {
  assert.match(read('app/admin/assistant/page.tsx'), /redirect\('\/admin\/settings\?section=assistant'\)/);
  assert.match(read('app/admin/profile/page.tsx'), /redirect\('\/admin\/settings\?section=account'\)/);
  // Z9 sections; old Z8 links (phone, schedule) open the section that now holds those settings.
  assert.deepEqual([...labels.SETTINGS_SECTIONS], ['assistant', 'business', 'contact', 'quiet', 'whatsapp', 'account']);
  assert.equal(labels.settingsSection('phone'), 'contact'); assert.equal(labels.settingsSection('schedule'), 'quiet');
  assert.equal(labels.settingsSection('assistant'), 'assistant'); assert.equal(labels.settingsSection('evil'), null); assert.equal(labels.settingsSection(undefined), null);
  assert.match(read('app/admin/settings/page.tsx'), /section=\{settingsSection\(searchParams\.section\)\}/);
});

test('Z8: one «Проверить ответы» per page (heading, end edge; floating on phones); no other simulator buttons', () => {
  for (const page of ['app/admin/page.tsx', 'app/admin/clients/page.tsx', 'app/admin/groups/page.tsx', 'components/tenant/settings-heading.tsx', 'components/tenant/knowledge-profile.tsx'])
    assert.match(read(page), /<PageHeading /, page);
  const users = ['app', 'components', 'lib'].flatMap(dir => fs.readdirSync(dir, { recursive: true }).map(f => `${dir}/${f}`)).filter(f => /\.tsx?$/.test(f) && /<SimulatorOpenButton/.test(read(f)));
  assert.deepEqual(users, ['components/ui/page-heading.tsx']);
  const css = read('app/globals.css');
  assert.match(css, /@media\(max-width:37\.4375rem\)\{\n \.page-actions \.simulator-open-button\{position:fixed;[^}]*inset-inline-end:var\(--space-4\)/);
  for (const file of ['app/admin/page.tsx', 'app/admin/settings/page.tsx', 'components/tenant/knowledge-profile.tsx', 'components/tenant/profile-panel.tsx', 'app/admin/clients/page.tsx'])
    assert.doesNotMatch(read(file), /className="eyebrow"|backCabinet|todayLabel|kp-simulator/, file);
});

test('Z8: nothing data-dependent is rendered before the data — placeholders of the same shape instead', () => {
  const home = read('app/admin/page.tsx');
  assert.match(home, /state=\{home\?whatsappCardState\(home\.status\):'loading'\}/);
  assert.match(home, /paused=\{home\?\.paused\}/, 'Z8.1: replies on/off are part of the card, rendered with it');
  assert.match(home, /\{home&&\(home\.questions\|\|home\.improve\)\?/);
  const settings = read('components/tenant/tenant-settings.tsx');
  assert.match(settings, /if\(!s\|\|!draft\|\|!saved\|\|ownerPhone===undefined\)return <div className="settings-stack">[^;]*SETTINGS_SECTIONS\.map\(id=><div key=\{id\} className="surface-card settings-section skeleton-card"/);
  assert.match(read('app/onboarding/simulator/page.tsx'), /\{loaded \? <ConversationSimulator suggestions=\{suggestions\} \/> : <div className="skeleton-block"/);
  const mode = read('lib/tenant/instruction-mode.ts');
  assert.match(mode, /loaded: false/); assert.match(mode, /loaded: true \}\); \}\);/);
  // Z9: one column; one minimum height for every state.
  assert.match(read('app/globals.css'), /\.wa-card,\.wa-card\.wa-paused,\.wa-card\.wa-lost,\.wa-card\.wa-not_connected,\.wa-card\.wa-connected\{grid-template-columns:minmax\(0,1fr\);gap:var\(--space-4\);min-block-size:10rem;align-content:space-between\}/);
  assert.equal(labels.whatsappCardState(''), 'loading');
  const card = mount('components/tenant/whatsapp-home-card.tsx', { state: 'loading', businessPhone: null, owner: 'ok' });
  const tree = card.render();
  assert.equal(tree.props['aria-busy'], 'true'); assert.match(tree.props.className, /wa-card skeleton-card/); assert.equal(tree.props.children, undefined);
});

test('Z8 «Главная»: the WhatsApp card has three states; only «not connected» and «lost» have the filled action', () => {
  assert.equal(labels.whatsappCardState('WORKING'), 'connected');
  for (const s of ['NOT_CREATED', 'STOPPED', 'SCAN_QR_CODE']) assert.equal(labels.whatsappCardState(s), 'not_connected', s);
  for (const s of ['FAILED', 'DISCONNECTED', 'STARTING', 'SOMETHING']) assert.equal(labels.whatsappCardState(s), 'lost', s);
  const ru = block('taskZ8Ru='), words = Object.fromEntries(['waConnectedTitle', 'waNotConnectedTitle', 'waNotConnectedText', 'waConnectAction', 'waLostTitle', 'waLostText', 'waReconnectAction'].map(k => [k, value(ru, k)]));
  const phone = { normalizePhone: () => null, formatPhone: raw => raw };
  const view = (state, owner = 'ok') => { const tree = mount('components/tenant/whatsapp-home-card.tsx', { state, businessPhone: '+972502222222', owner }, { words, modules: { '@/lib/tenant/phone': phone } }).render(); return { tree, all: nodes(tree), body: text(tree) }; };
  const connected = view('connected');
  // Z9: «WhatsApp подключён · +972…» — the number once, no second column.
  assert.match(connected.body, /WhatsApp подключён · \+972502222222/);
  assert.ok(!connected.all.some(n => /button primary/.test(n.props?.className ?? '')), 'no filled button when connected');
  const off = view('not_connected');
  assert.match(off.body, /WhatsApp не подключён/); assert.match(off.body, /Пока номер не подключён, клиентам никто не отвечает/);
  assert.equal(off.all.find(n => /button primary/.test(n.props?.className ?? '')).props.children, 'Подключить WhatsApp');
  const lost = view('lost', 'missing');
  assert.match(lost.body, /Связь с WhatsApp потеряна/); assert.match(lost.body, /Клиенты сейчас не получают ответов/);
  assert.equal(lost.all.find(n => /button primary/.test(n.props?.className ?? '')).props.children, 'Переподключить');
  assert.equal(lost.tree.props.role, 'alert');
  assert.ok(lost.all.some(n => n.type === 'Link' && n.props.href === '/admin/settings?section=contact'), 'the owner number only when it needs an action');
  assert.ok(!connected.all.some(n => n.type === 'Link' && /section=contact/.test(n.props.href)));
  for (const v of [connected, off, lost]) assert.match(v.tree.props.className, /^wa-card wa-/);
  assert.equal(labels.displayPhone('972501234567'), '+972501234567'); assert.equal(labels.displayPhone(''), '');
});

test('Z8: «Отключить WhatsApp» only in «Настройки → WhatsApp» — red text button, confirmation text from the task', () => {
  const connection = read('components/tenant/whatsapp-connection.tsx');
  assert.match(connection, /cabinet && canEdit && isConnected\(state\.status\) \? <Button type="button" disabled=\{busy\} tone="danger-text"[^\n]*>\{t\('disconnectWhatsApp'\)\}<\/Button>/);
  assert.match(connection, /title=\{t\('disconnectTitle'\)\} confirmLabel=\{t\('disconnectWhatsApp'\)\}/);
  assert.doesNotMatch(read('app/admin/page.tsx'), /WhatsAppStatus|disconnect/i);
  assert.match(read('components/tenant/tenant-settings.tsx'), /card\('whatsapp',<WhatsAppStatus\/>\)/);
  assert.equal(value(block('formsRu='), 'disconnectConfirm'), 'Клиенты перестанут получать ответы. Чтобы подключить снова, понадобится новый QR-код.');
  assert.match(read('app/globals.css'), /\.button\.danger-text\{background:transparent;border-color:transparent;color:var\(--danger-text\)/);
});

test('Z8: the assistant name in nominative only — «Что знает {имя}» / «What {name} knows» / «הידע של {name}»; empty → default', () => {
  assert.equal(value(block('taskRRu='), 'kpTitleNamed'), 'Что знает {name}');
  assert.equal(value(block('taskREn'), 'kpTitleNamed'), 'What {name} knows');
  assert.equal(value(block('taskRHe'), 'kpTitleNamed'), 'הידע של {name}');
  assert.deepEqual(['taskZ8Ru=', 'taskZ8En', 'taskZ8He'].map(b => value(block(b), 'assistantDefaultName')), ['Лея', 'Leya', 'לאה']);
  assert.equal(labels.assistantLabel('  Мира ', 'Лея'), 'Мира'); assert.equal(labels.assistantLabel('  ', 'Лея'), 'Лея'); assert.equal(labels.assistantLabel(null, 'Leya'), 'Leya');
  assert.equal(value(block('formsRu='), 'assistantName'), 'Имя ассистента');
  assert.equal(value(block('taskZ8Ru='), 'assistantNameHelp'), 'Так он представится клиентам');
  // No «помощник» in the interface (ru); the ru dictionaries only.
  const ruBlocks = dictionary.split('\n').filter(l => /^const [a-zA-Z0-9]*Ru[=:]|^const ru=/.test(l)).join('\n');
  assert.doesNotMatch(ruBlocks, /[Пп]омощни/);
});

test('Z8: «На каком языке ассистент пишет вам» saves owner_language; «Языки ответов» is gone', async () => {
  const requests = [];
  const supabase = { from() { const q = { select() { return q; }, eq() { return q; }, update(v) { requests.push({ supabase: v }); return q; }, async single() { return { data: { assistant_name: 'Лея', tone: 'friendly_professional', style_profile_md: '', tenant_id: 't' }, error: null }; } }; return q; } };
  const app = mount('components/tenant/assistant-settings.tsx', { hideStyle: true, ownerLanguage: 'ru' }, {
    fetch: async (url, options) => { requests.push({ url, ...options }); return { ok: true, json: async () => ({}) }; },
    modules: {
      'next/navigation': { useRouter: () => ({ push() {} }) },
      '@/lib/onboarding/tenant': { getOnboardingTenant: async () => ({ supabase, tenantId: 't', requireRole() {} }) },
      '@/lib/tenant/simulator-drawer': { useSimulatorDrawer: () => ({ setDirty() {} }) },
      '@/lib/tenant/assistant-name': { ASSISTANT_NAME_EVENT: 'x' },
      '@/components/ui/primitives': { Button: 'Button', Select: 'Select' },
    } });
  await app.settle();
  const select = nodes(app.render()).find(n => n.props?.id === 'owner-language');
  assert.equal(select.props.value, 'ru');
  assert.deepEqual(Array.from(select.props.children, o => o.props.value), ['he', 'ru', 'en']);
  select.props.onChange({ target: { value: 'he' } }); app.render();
  nodes(app.render()).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  await app.settle();
  const patch = requests.find(r => r.url === '/api/tenant-settings');
  assert.equal(patch.method, 'PATCH'); assert.deepEqual(JSON.parse(patch.body), { owner_language: 'he' });
  assert.deepEqual({ ...requests.find(r => r.supabase).supabase }, { assistant_name: 'Лея' }, 'tone/style untouched on the instruction path; allowed_languages never written');
  const source = read('components/tenant/assistant-settings.tsx');
  assert.doesNotMatch(source, /responseLanguages|allowedLanguages|allowed_languages:/);
  assert.match(read('lib/tenant-settings/fields.ts'), /export const editable = \[[^\]]*'owner_language'/);
  assert.match(read('app/onboarding/step-1/page.tsx'), /owner_language:locale/);
});

test('Z8: «Что знает» — counter equals the cards; empty topic says «Пусто — добавьте»; questions first', () => {
  const topics = [{ topic: 'a', required: true, facts: [1] }, { topic: 'b', required: true, facts: [] }, { topic: 'c', required: false, facts: [1, 2] }, { topic: 'd', required: false, facts: [] }];
  const counter = labels.topicCounter(topics);
  assert.deepEqual([counter.shown.map(t => t.topic), counter.filled, counter.total], [['a', 'b', 'c'], 2, 3]);
  const ui = read('components/tenant/knowledge-profile.tsx');
  assert.match(ui, /const\{shown,filled,total\}=topicCounter\(profile\.topics\)/);
  assert.match(ui, /t\('kpFilled',\{filled,total\}\)/);
  assert.ok(ui.indexOf('{questions}') < ui.indexOf('<div className="kp-topics">'), 'owner questions before the topics');
  assert.match(ui, /help=\{t\('kpSubtitle'\)\} actions=\{add\}/);
  assert.equal(value(block('taskZ8Ru='), 'kpEmptyAdd'), 'Пусто — добавьте');
  assert.equal(value(block('taskZ8Ru='), 'kpSubtitle'), 'Отсюда ассистент берёт ответы клиентам');
});

test('Z8 sectors: the grouped suggestions match the backend list (43 in ru/he/en) and stay free input', () => {
  const groups = locale => [...labels.SECTOR_GROUPS].map(g => value(block(`taskZ8${locale}`), `sectorItems_${g}`).split('|'));
  for (const locale of ['Ru=', 'En', 'He']) assert.equal(groups(locale).flat().length, 43, locale);
  const backend = '../bizgenie-leya/src/config/instruction-templates.ts';
  if (fs.existsSync(backend)) {
    const src = read(backend);
    for (const [locale, field] of [['Ru=', 'ru'], ['En', 'en'], ['He', 'he']])
      assert.deepEqual(groups(locale).flat(), [...src.matchAll(new RegExp(`${field}: '([^']*)'`, 'g'))].map(m => m[1]), locale);
  }
  assert.doesNotMatch(dictionary, /businessSectorSuggestions/);
  const t = key => key.startsWith('sectorGroup_') ? `G:${key}` : value(block('taskZ8Ru='), key);
  const list = labels.sectorSuggestions(t);
  assert.equal(list[0].label, 'G:sectorGroup_beauty_health'); assert.ok(list.find(g => g.key === 'projects').items.includes('сантехник'));
});

test('Z8: the business number reaches the card only as «+digits» and only while connected', () => {
  assert.match(read('lib/waha/proxy.ts'), /status === 'WORKING' && typeof data\?\.phone === 'string' && \/\^\\\+\\d\{8,15\}\$\/\.test\(data\.phone\)/);
  assert.match(read('lib/waha/connection.ts'), /typeof data\.phone === 'string' && \/\^\\\+\\d\{8,15\}\$\/\.test\(data\.phone\) \? \{ phone: data\.phone \}/);
});

test('Z9: «?section=» scrolls to that section; all sections are open (no accordion), old Z8 names still work', () => {
  const source = read('components/tenant/tenant-settings.tsx');
  assert.match(source, /useEffect\(\(\)=>\{if\(section&&s&&typeof document!=='undefined'\)document\.getElementById\(`settings-\$\{section\}`\)\?\.scrollIntoView\?\.\(\{block:'start'\}\);\},\[section,s\]\);/);
  assert.doesNotMatch(source, /setOpen|aria-expanded/);
  assert.equal(labels.settingsSection('phone'), 'contact'); assert.equal(labels.settingsSection('whatsapp'), 'whatsapp');
});
