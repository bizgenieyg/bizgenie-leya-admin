const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const read = file => fs.readFileSync(file, 'utf8');
const compile = (file, jsx = false) => ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, ...(jsx ? { jsx: ts.JsxEmit.ReactJSX } : {}) } }).outputText;
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : !tree || typeof tree !== 'object' ? [] : [tree, ...nodes(tree.props?.children)];
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree && typeof tree === 'object' ? text(tree.props?.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';

function account({ user = { id: 'u', email: 'o@x.test', created_at: '2026-09-01' }, members = [{ tenant_id: 't1', role: 'owner' }], backend = { ok: true, body: { business_name: 'Ноготки' } } } = {}) {
  const calls = [], exports = {};
  vm.runInNewContext(compile('lib/auth/profile.ts'), { exports, URL, AbortSignal, String, console: { error() {} }, fetch: async url => { calls.push(String(url)); if (backend === 'throw') throw new Error('down'); return { ok: backend.ok, json: async () => backend.body }; }, require(name) {
    if (name === '@/lib/supabase/server') return { createClient: () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) }, from(table) {
      assert.notEqual(table, 'tenants', 'tenants is never read with the user key');
      const q = { select: () => q, eq: () => q, limit: async () => ({ data: members, error: null }) }; return q; } }) };
    if (name === '@/lib/backend/leya-env') return { readLeyaBackendEnv: () => ({ apiUrl: 'https://api.test', adminApiKey: 'k' }) };
    return {};
  } });
  return { state: () => exports.getAccountState(), calls };
}

test('Z8.1: the account profile comes from the backend for the one tenant of the user, never from tenants with the user key', async () => {
  const a = account();
  const state = await a.state();
  assert.equal(state.signedIn, true); assert.equal(state.profile.businessName, 'Ноготки'); assert.equal(state.profile.role, 'owner'); assert.equal(state.profile.email, 'o@x.test');
  assert.deepEqual(a.calls, ['https://api.test/api/admin/tenant-settings?tenantId=t1']);
  for (const file of ['app', 'components', 'lib'].flatMap(d => fs.readdirSync(d, { recursive: true }).map(f => `${d}/${f}`)).filter(f => /\.tsx?$/.test(f)))
    assert.doesNotMatch(read(file), /from\('tenants'\)/, file);
});

test('Z8.1: profile unavailable ≠ expired session — «Настройки» open with an error in «Аккаунт»; no user → sign in', async () => {
  for (const backend of [{ ok: false, body: {} }, 'throw']) { const s = await account({ backend }).state(); assert.equal(s.signedIn, true); assert.equal(s.profile, null); }
  assert.deepEqual({ ...await account({ members: [] }).state() }, { signedIn: true, profile: null });
  assert.deepEqual({ ...await account({ user: null }).state() }, { signedIn: false });
  const page = read('app/admin/settings/page.tsx');
  assert.match(page, /if\(!account\.signedIn\)redirect\('\/login\?error=session_expired'\);/);
  assert.doesNotMatch(page, /if\(!profile\)redirect/);
  assert.match(read('components/tenant/tenant-settings.tsx'), /const account=profile\?<ProfilePanel profile=\{profile\}\/>:<ErrorState message=\{t\('accountLoadError'\)\} onRetry=\{\(\)=>router\.refresh\(\)\}\/>;/);
  const route = read('app/api/profile/route.ts');
  assert.match(route, /if\(!state\.signedIn\)return Response\.json\(\{code:'connectionSessionExpired'\},\{status:401\}\)/);
  assert.match(route, /\{status:503\}/);
});

test('Z8.1: «Клиенты» → «Чаты» / «Chats» / «שיחות» (menu and page title; URL unchanged)', () => {
  const d = read('lib/i18n/index.tsx');
  for (const v of ['clientsLink:"Чаты"', 'clientsLink:"Chats"', 'clientsLink:"שיחות"']) assert.ok(d.includes(v), v);
  assert.match(read('components/ui/app-shell.tsx'), /href: '\/admin\/clients', key: 'clientsLink'/);
  assert.match(read('app/admin/clients/page.tsx'), /<PageHeading title=\{t\('clientsLink'\)\}/);
});

test('Z8.1: grids follow the content area (container queries), topic cards grow with their text', () => {
  const css = read('app/globals.css'), block = css.slice(css.indexOf('Z8.1: columns by the width'));
  assert.match(block, /\.page-wrap>\.content-stack\{container:page \/ inline-size\}/);
  assert.match(block, /@container page \(min-width:34rem\)\{\.kp-topics,\.kp-compare\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}\}/);
  assert.match(block, /@container page \(min-width:52rem\)\{\.kp-topics\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}\}/);
  assert.match(block, /@media\(min-width:56\.25rem\)\{\.kp-topics\{grid-template-columns:minmax\(0,1fr\)\}\}/, 'the old window rule is neutralised');
  assert.match(block, /\.kp-topic\{block-size:auto;inline-size:100%;overflow:hidden\}/);
  assert.match(block, /\.kp-topic small\{display:block/);
  assert.doesNotMatch(block, /\b(?:margin|padding)-(?:left|right)|\bleft:|\bright:/);
});

function card(props) {
  let index = 0, dirty = true, tree; const slots = [], exports = {}, jsx = (type, p) => ({ type, props: p });
  vm.runInNewContext(compile('components/tenant/whatsapp-home-card.tsx', true), { exports, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === 'react') return { useState(initial) { const key = index++; if (!(key in slots)) slots[key] = initial; return [slots[key], next => { slots[key] = next; dirty = true; }]; } };
    if (name === '@/lib/i18n') return { useI18n: () => ({ t: (k, v = {}) => Object.entries(v).reduce((s, [a, b]) => s.replaceAll(`{${a}}`, b), k) }) };
    if (name === 'next/link') return { __esModule: true, default: 'Link' };
    if (name === '@/components/ui/primitives') return { Button: 'Button', ConfirmDialog: 'ConfirmDialog' };
    return {};
  } });
  const render = () => { while (dirty) { dirty = false; index = 0; tree = exports.default(props); } return tree; };
  return { render, all: () => nodes(render()) };
}

test('Z8.1: «Ответы клиентам» are part of the WhatsApp card — on: strip + outlined «Остановить», confirmed; off: amber card + filled «Включить»', () => {
  let stopped = 0, resumed = 0;
  const on = card({ state: 'connected', businessPhone: '+972501', ownerPhone: '', paused: false, onStop: () => stopped++, onResume: () => resumed++ });
  const strip = on.all().find(n => n.props?.className === 'wa-card-replies');
  assert.ok(strip); assert.match(text(strip), /repliesOnStatus/);
  const stop = nodes(strip).find(n => n.type === 'Button');
  assert.equal(stop.props.tone, 'warning'); assert.equal(text(stop), 'stopAllRepliesAction');
  stop.props.onClick();
  const dialog = on.all().find(n => n.type === 'ConfirmDialog');
  assert.equal(dialog.props.open, true); assert.equal(stopped, 0, 'nothing stops before the confirmation');
  dialog.props.onConfirm(); assert.equal(stopped, 1);
  const off = card({ state: 'connected', businessPhone: '+972501', ownerPhone: '', paused: true, onStop: () => stopped++, onResume: () => resumed++ });
  const root = off.render();
  assert.match(root.props.className, /wa-paused/); assert.equal(root.props.role, 'alert');
  assert.match(text(root), /repliesStoppedTitle/); assert.match(text(root), /repliesStoppedText/);
  assert.ok(!off.all().some(n => n.props?.className === 'wa-card-replies'));
  const enable = off.all().find(n => n.type === 'Button' && text(n) === 'enableRepliesAction');
  assert.equal(enable.props.tone, undefined, 'the filled (primary) button'); enable.props.onClick(); assert.equal(resumed, 1);
  const home = read('app/admin/page.tsx');
  assert.doesNotMatch(home, /EmergencyStop/, 'no separate link row under the card');
  for (const [b, v] of [['taskZ81Ru=', 'Остановить все ответы'], ['taskZ81En', 'Stop all replies'], ['taskZ81He', 'עצירת כל התשובות']]) assert.ok(read('lib/i18n/index.tsx').split('\n').find(l => l.startsWith(`const ${b}`)).includes(v));
  assert.match(read('app/globals.css'), /\.wa-paused\{[^}]*border-inline-start:0\.1875rem solid var\(--warning\)/);
});

test('Z8.1 review: backend down → «Настройки» show an error with «Повторить» and the «Аккаунт» state, not endless placeholders', async () => {
  let index = 0; const slots = [], effects = [], exports = {}, jsx = (type, p) => ({ type, props: p });
  let refreshed = 0;
  vm.runInNewContext(compile('components/tenant/tenant-settings.tsx', true), { exports, Promise, Error, Math, Date, JSON, Object, Array, Number, String, document: undefined,
    fetch: async () => ({ ok: false, status: 502, json: async () => ({ code: 'serviceUnavailable' }) }), require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === 'react') return {
      useState(initial) { const key = index++; if (!(key in slots)) slots[key] = typeof initial === 'function' ? initial() : initial; return [slots[key], next => { slots[key] = typeof next === 'function' ? next(slots[key]) : next; }]; },
      useEffect(fn, deps) { const key = index++, old = slots[key]; if (!old || deps.some((d, i) => d !== old.deps[i])) { slots[key] = { deps }; effects.push(fn); } },
      useCallback: fn => fn, useMemo: fn => fn(),
    };
    if (name === 'next/navigation') return { useRouter: () => ({ refresh() { refreshed++; } }) };
    if (name === '@/lib/i18n') return { useI18n: () => ({ t: k => k, locale: 'ru', setLocale() {} }), useFormat: () => ({}) };
    if (name === '@/lib/tenant/labels') return { SETTINGS_SECTIONS: ['whatsapp', 'phone', 'business', 'assistant', 'schedule', 'account'] };
    if (name === '@/lib/i18n/api-error') return { translatedApiError: (_t, _d, key) => key };
    if (name === '@/components/ui/primitives') return { ErrorState: 'ErrorState', Button: 'Button', Check: 'Check', Select: 'Select', Switch: 'Switch' };
    return new Proxy({}, { get: () => 'C' });
  } });
  // useCallback returns a new function each render here: run the first effect only, as React would with stable deps.
  const render = () => { index = 0; const tree = exports.default({ profile: null, section: null }); while (effects.length) effects.shift()(); return tree; };
  let tree = render();
  for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, 0)); index = 0; tree = exports.default({ profile: null, section: null }); effects.length = 0; }
  const all = nodes(tree);
  const errors = all.filter(n => n.type === 'ErrorState');
  assert.ok(!all.some(n => /skeleton-card/.test(n.props?.className ?? '')), 'no placeholders after the failure');
  assert.equal(errors[0].props.message, 'settingsLoadError');
  errors[0].props.onRetry(); assert.equal(refreshed, 1);
  const accountCard = all.find(n => n.props?.id === 'account');
  assert.ok(accountCard, 'the «Аккаунт» section is shown');
  assert.equal(nodes(accountCard.props.children).find(n => n.type === 'ErrorState').props.message, 'accountLoadError');
});

test('Z8.1 review: the schedule row switches to 3 columns by the content width, not the window', () => {
  const css = read('app/globals.css'), block = css.slice(css.indexOf('Z8.1 review: the schedule row'));
  assert.match(block, /@media\(min-width:40rem\)\{\.schedule-row\{grid-template-columns:minmax\(5\.5rem,\.8fr\) minmax\(0,1\.4fr\)\}\}/);
  assert.match(block, /@container page \(min-width:38rem\)\{\.schedule-row\{grid-template-columns:minmax\(7rem,\.75fr\) minmax\(10rem,1\.2fr\) minmax\(13rem,1\.4fr\)\}\}/);
});
