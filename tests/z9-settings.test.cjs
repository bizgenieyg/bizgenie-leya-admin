const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { mountSettings, SETTINGS, nodes, text, read, compile, loadModule, tick } = require('./settings-harness.cjs');

const input = (page, id) => page.byId(id);
const type = (page, id, value) => { input(page, id).props.onChange({ target: { value } }); page.render(); };
const sw = (page, label) => page.all().find(n => n.type === 'Switch' && n.props.label === label);

test('Z9: the save bar appears on the first change, one PATCH with only what changed, gone only after the server confirms', async () => {
  let release; const pending = new Promise(resolve => { release = resolve; });
  const page = mountSettings({ backend: async (url, options = {}) => {
    if (url.includes('owner-settings')) return { ok: true, body: { phone: '972523695741', paired: true, pendingPhone: '' } };
    if (options.method === 'PATCH') { await pending; return { ok: true, body: { saved: true } }; }
    return { ok: true, body: { settings: SETTINGS, usage: {} } };
  } });
  await page.settle();
  assert.equal(page.bar(), undefined, 'no bar before a change');
  assert.equal(page.all().filter(n => n.type === 'Button' && n.props.tone === undefined).length, 0, 'no filled button in the sections');
  type(page, 'settings-business-name', 'Ноготки и брови');
  const bar = page.bar();
  assert.match(text(bar), /unsavedChanges/);
  assert.ok(nodes(page.byId('settings-business-title')).some(n => n.props?.className === 'unsaved-dot'), 'a dot at the changed section');
  assert.ok(!nodes(page.byId('settings-assistant-title')).some(n => n.props?.className === 'unsaved-dot'));
  assert.deepEqual(page.dirtyReports.at(-1), ['settings', true]);
  const save = page.button(bar, 'save');
  assert.equal(save.props.tone, undefined, '«Сохранить» is the one filled button');
  save.props.onClick(); await tick(); page.render();
  const patch = page.calls.filter(c => c.options.method === 'PATCH');
  assert.equal(patch.length, 1); assert.deepEqual(JSON.parse(patch[0].options.body), { business_name: 'Ноготки и брови' });
  assert.ok(page.bar(), 'the bar stays while the server has not answered'); assert.match(text(page.bar()), /saving/);
  release(); await page.settle();
  assert.match(text(page.bar()), /✓ savedShort/, '«✓ Сохранено» after the confirmation');
  await new Promise(resolve => setTimeout(resolve, 3100)); page.render();
  assert.equal(page.bar(), undefined, 'gone 3 s later');
});

test('Z9: «Отменить» brings every field back; a failed save keeps the bar and the values — «Не сохранено · Повторить»', async () => {
  let fail = true;
  const page = mountSettings({ backend: (url, options = {}) => url.includes('owner-settings') ? { ok: true, body: { phone: '', paired: false } }
    : options.method === 'PATCH' ? (fail ? new Error('offline') : { ok: true, body: {} }) : { ok: true, body: { settings: SETTINGS, usage: {} } } });
  await page.settle();
  type(page, 'settings-assistant-name', 'Лея'); type(page, 'settings-owner-name', 'Ирина');
  page.button(page.bar(), 'z9Cancel').props.onClick(); page.render();
  assert.equal(input(page, 'settings-assistant-name').props.value, 'Мира'); assert.equal(input(page, 'settings-owner-name').props.value, 'Ира');
  assert.equal(page.bar(), undefined);
  type(page, 'settings-assistant-name', 'Лея');
  page.button(page.bar(), 'save').props.onClick(); await page.settle();
  assert.match(text(page.bar()), /saveNotSavedShort/);
  assert.equal(input(page, 'settings-assistant-name').props.value, 'Лея', 'the typed value stays');
  const retry = page.button(page.bar(), 'z9Retry'); assert.ok(retry, '«Повторить»');
  fail = false; retry.props.onClick(); await page.settle();
  assert.match(text(page.bar()), /savedShort/);
});

test('Z9: «Не беспокоить» — empty in the database → off; the same start and end cannot be saved; night interval «до утра»', async () => {
  const page = mountSettings(); await page.settle();
  const dnd = sw(page, 'dndSwitch'); assert.equal(dnd.props.checked, false, 'null quiet hours → the switch is off');
  assert.ok(!page.all().some(n => n.props?.['aria-label'] === 'dndStart'), 'no times shown while off');
  dnd.props.onChange(true); page.render();
  const field = label => page.all().find(n => n.props?.['aria-label'] === label);
  assert.equal(field('dndStart').props.value, '', 'no invented time');
  assert.equal(page.button(page.bar(), 'save').props.disabled, true, 'start and end are required');
  field('dndStart').props.onChange({ target: { value: '10:00' } }); page.render(); field('dndEnd').props.onChange({ target: { value: '10:00' } }); page.render();
  assert.match(page.body(), /quietHoursEqual/);
  assert.equal(page.button(page.bar(), 'save').props.disabled, true);
  field('dndStart').props.onChange({ target: { value: '22:00' } }); field('dndEnd').props.onChange({ target: { value: '08:00' } }); page.render();
  assert.match(page.body(), /22:00 – 08:00 untilMorning/);
  page.button(page.bar(), 'save').props.onClick(); await page.settle();
  assert.deepEqual(JSON.parse(page.calls.find(c => c.options.method === 'PATCH').options.body), { quiet_hours_start: '22:00', quiet_hours_end: '08:00' });
  const draft = loadModule('lib/tenant-settings/draft.ts');
  const on = draft.draftFrom({ ...SETTINGS, quiet_hours_start: '22:00', quiet_hours_end: '08:00' });
  assert.equal(JSON.stringify(draft.draftPatch(on, { ...on, dnd: false })), JSON.stringify({ quiet_hours_start: null, quiet_hours_end: null }), 'off = both empty');
  // One quiet-hours setting: the owner number block no longer has its own.
  assert.doesNotMatch(read('components/tenant/owner-phone-settings.tsx'), /quietStart|quietEnd|type="time"/);
});

test('Z9: the owner number in one form — «052…», «52…», «972…», «+972…» → E.164, shown as +972 52-369-5741', () => {
  const phone = loadModule('lib/tenant/phone.ts');
  for (const raw of ['052-369-5741', '52 369 5741', '972523695741', '+972 52-369-5741', '00972523695741']) assert.equal(phone.normalizePhone(raw, '972'), '972523695741', raw);
  assert.equal(phone.normalizePhone('12', '972'), null);
  assert.equal(phone.normalizePhone('+1 555 123 4567', '972'), '15551234567');
  assert.equal(phone.formatPhone('972523695741'), '+972 52-369-5741');
  assert.equal(phone.formatPhone('15551234567'), '+15551234567');
});

function ownerPhone(initial, backend) {
  let index = 0; const slots = [], calls = [], exports = {}, jsx = (type, p) => ({ type, props: p });
  const phone = loadModule('lib/tenant/phone.ts');
  vm.runInNewContext(compile('components/tenant/owner-phone-settings.tsx', true), { exports, JSON, Error, Promise, fetch: async (url, options = {}) => { calls.push({ url, options }); const r = backend(url, options); return { ok: r.ok, json: async () => r.body }; }, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === 'react') return { useState(v) { const key = index++; if (!(key in slots)) slots[key] = typeof v === 'function' ? v() : v; return [slots[key], next => { slots[key] = typeof next === 'function' ? next(slots[key]) : next; }]; } };
    if (name === '@/lib/i18n') return { useI18n: () => ({ t: k => k }) };
    if (name === '@/lib/i18n/api-error') return { translatedApiError: (_t, _d, k) => k };
    if (name === '@/components/ui/primitives') return { Button: 'Button', Select: 'Select' };
    if (name === '@/lib/tenant/phone') return phone;
    return {};
  } });
  const render = () => { index = 0; return exports.default({ initial }); };
  return { render, calls, all: () => nodes(render()) };
}

test('Z9: «Изменить» → code and number; the new number waits for confirmation while the old one stays active', async () => {
  let state = { phone: '972523695741', paired: true, pendingPhone: '' };
  const view = ownerPhone(state, (url, options) => {
    if (options.method === 'POST') { state = { ...state, pendingPhone: JSON.parse(options.body).phone }; return { ok: true, body: { sent: true } }; }
    return { ok: true, body: state };
  });
  let body = text(view.render());
  assert.match(body, /\+972 52-369-5741 · ✓ z9Confirmed/); assert.doesNotMatch(body, /setPhoneCurrent|Сейчас/);
  view.all().find(n => n.type === 'Button' && text(n) === 'waChange').props.onClick();
  const field = view.all().find(n => n.props?.id === 'owner-phone');
  assert.equal(view.all().find(n => n.type === 'Select').props.value, '972', 'the country code, +972 by default');
  field.props.onChange({ target: { value: '054 111 2233' } });
  assert.match(text(view.render()), /\+972 54-111-2233/, 'shown at once in the common form');
  const form = view.all().find(n => n.type === 'form');
  await form.props.onSubmit({ preventDefault() {} });
  await tick();
  assert.deepEqual(JSON.parse(view.calls.find(c => c.options.method === 'POST').options.body), { phone: '972541112233' }, 'E.164 digits only; no quiet hours, no time zone');
  body = text(view.render());
  assert.match(body, /\+972 52-369-5741 · ✓ z9Confirmed/, 'the current number stays confirmed and active');
  assert.match(body, /\+972 54-111-2233 · phoneWaiting/); assert.match(body, /phonePendingHelp/);
});

test('Z9: sections in order, no accordion on phones; enabled_agents is not in the cabinet UI; account without role, date, cabinet language', async () => {
  const page = mountSettings(); await page.settle();
  const ids = page.all().filter(n => n.type?.name === 'SettingsCard').map(n => n.props.id);
  assert.deepEqual(ids, ['assistant', 'business', 'contact', 'quiet', 'whatsapp', 'account']);
  const source = read('components/tenant/tenant-settings.tsx');
  assert.doesNotMatch(source, /aria-expanded|enabled_agents|'SALE'|'SUPPORT'|cabinet_language|EmergencyStop|FuturePlans/);
  assert.doesNotMatch(read('app/globals.css'), /\.settings-section:not\(\.open\) \.settings-section-body\{display:none\}/);
  for (const file of ['app', 'components'].flatMap(d => fs.readdirSync(d, { recursive: true }).map(f => `${d}/${f}`)).filter(f => /\.tsx?$/.test(f)))
    assert.doesNotMatch(read(file), /enabled_agents/, file);
  const profile = read('components/tenant/profile-panel.tsx');
  assert.doesNotMatch(profile, /businessRole|registrationDate|role_/);
  assert.match(profile, /tone="danger-text" onClick=\{\(\)=>void logout\(\)\}>\{t\('logout'\)\}/);
  // He section titles as the task names them.
  const he = read('lib/i18n/index.tsx').split('\n').find(l => l.startsWith('const taskZ9He'));
  for (const v of ['"setContact":"קשר איתך"', '"setQuiet":"מתי לא להפריע"']) assert.ok(he.includes(v), v);
  const z8he = read('lib/i18n/index.tsx').split('\n').find(l => l.startsWith('const taskZ8He'));
  for (const v of ['setAssistant:"העוזר"', 'setBusiness:"העסק"', 'setAccount:"החשבון"']) assert.ok(z8he.includes(v), v);
});

test('Z9: the time zone reads «Иерусалим · сейчас 14:53» and follows a new zone at once', async () => {
  const tz = loadModule('lib/tenant-settings/time-zone.ts');
  const t = (k, v = {}) => k === 'tzCity_Asia_Jerusalem' ? 'Иерусалим' : k === 'timeZoneNow' ? `${v.city} · сейчас ${v.time}` : k;
  assert.equal(tz.timeZoneLabel('Asia/Jerusalem', 'ru-RU', t, new Date('2026-10-22T11:53:00Z')), 'Иерусалим · сейчас 14:53');
  assert.equal(tz.timeZoneLabel('UTC+3', 'ru-RU', t, new Date('2026-10-22T11:53:00Z')), 'UTC+3 · сейчас 14:53');
  const page = mountSettings(); await page.settle();
  const select = input(page, 'settings-time-zone');
  assert.equal(select.props.value, 'Asia/Jerusalem');
  select.props.onChange({ target: { value: 'Europe/Moscow' } }); page.render();
  assert.equal(input(page, 'settings-time-zone').props.value, 'Europe/Moscow', 'the row shows the new zone with its local time');
  assert.doesNotMatch(read('components/tenant/tenant-settings.tsx'), /timeZoneHelp/);
});

test('Z9: leaving with unsaved changes asks first (menu link, back, closing the tab)', () => {
  const listeners = {}, docListeners = {}, pushed = [], routed = []; let effects = [];
  const exports = {}, slots = []; let index = 0;
  const window = { location: { href: 'https://a.test/admin/settings', origin: 'https://a.test', pathname: '/admin/settings', search: '' }, history: { state: { __NA: true }, pushState: s => pushed.push(s), back() {}, go() {} },
    addEventListener: (k, f) => { listeners[k] = f; }, removeEventListener: k => { delete listeners[k]; }, innerHeight: 800 };
  const document = { addEventListener: (k, f) => { docListeners[k] = f; }, removeEventListener: k => { delete docListeners[k]; }, documentElement: { style: { setProperty() {}, removeProperty() {} } } };
  vm.runInNewContext(compile('lib/tenant-settings/leave-guard.ts'), { exports, window, document, URL, require(name) {
    if (name === 'react') return { useState(v) { const key = index++; if (!(key in slots)) slots[key] = v; return [slots[key], n => { slots[key] = n; }]; }, useRef(v) { const key = index++; if (!(key in slots)) slots[key] = { current: v }; return slots[key]; }, useEffect(fn) { effects.push(fn); }, useCallback: fn => fn };
    if (name === 'next/navigation') return { useRouter: () => ({ push: href => routed.push(href) }) };
    return {};
  } });
  const run = dirty => { index = 0; effects = []; const g = exports.useLeaveGuard(dirty); effects.forEach(fn => fn()); return g; };
  run(true);
  assert.ok(listeners.beforeunload, 'closing the tab asks (the browser dialog)');
  assert.equal(pushed.length, 1, 'one extra entry for «назад»'); assert.equal(pushed[0].__NA, true, 'keeps the router state');
  const event = { button: 0, defaultPrevented: false, target: { closest: () => ({ href: 'https://a.test/admin/clients', target: '', hasAttribute: () => false }) }, preventDefault() { this.prevented = true; }, stopPropagation() {} };
  listeners.popstate(); let g = run(true); assert.equal(g.asking, true, '«назад» asks'); assert.equal(pushed.length, 2, 'and stays on the page');
  g.stay(); g = run(true); assert.equal(g.asking, false, '«Остаться»');
  docListeners.click(event);
  assert.equal(event.prevented, true, 'a menu link does not navigate at once');
  g = run(true); assert.equal(g.asking, true);
  g.go(); assert.deepEqual(routed, ['/admin/clients'], '«Уйти» goes to the link');
});

test('Z9 «Главная»: one column, the business number once; the owner number only when it needs an action', () => {
  let index = 0; const slots = [], jsx = (type, p) => ({ type, props: p });
  const phone = loadModule('lib/tenant/phone.ts');
  const view = props => { const exports = {}; vm.runInNewContext(compile('components/tenant/whatsapp-home-card.tsx', true), { exports, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === 'react') return { useState(v) { const key = index++; if (!(key in slots)) slots[key] = v; return [slots[key], () => {}]; } };
    if (name === '@/lib/i18n') return { useI18n: () => ({ t: k => k }) };
    if (name === 'next/link') return { __esModule: true, default: 'Link' };
    if (name === '@/components/ui/primitives') return { Button: 'Button', ConfirmDialog: 'ConfirmDialog' };
    if (name === '@/lib/tenant/phone') return phone;
    return {};
  } }); index = 0; const tree = exports.default(props); return { tree, all: nodes(tree), body: text(tree) }; };
  const ok = view({ state: 'connected', businessPhone: '+972522164724', owner: 'ok', paused: false });
  assert.match(ok.body, /waConnectedTitle · \+972 52-216-4724/);
  assert.equal(ok.body.split('52-216-4724').length - 1, 1, 'the business number once');
  assert.ok(!ok.all.some(n => n.type === 'dl' || n.props?.className === 'wa-card-owner'), 'no number columns, no owner row when all is fine');
  for (const [owner, key] of [['missing', 'ownerPhoneMissingWarning'], ['unconfirmed', 'ownerPhoneUnconfirmedWarning']]) {
    const v = view({ state: 'connected', businessPhone: '+972522164724', owner, paused: false });
    const row = v.all.find(n => n.props?.className === 'wa-card-owner');
    assert.match(text(row), new RegExp(key));
    assert.ok(nodes(row).some(n => n.type === 'Link' && n.props.href === '/admin/settings?section=contact' && text(n) === 'setOwnerPhoneAction'));
  }
  const home = read('app/admin/page.tsx');
  assert.match(home, /owner:!s\?'ok':!s\.owner_phone\?'missing':s\.paired\?'ok':'unconfirmed'/);
  assert.doesNotMatch(read('components/tenant/whatsapp-home-card.tsx'), /waOwnerLine|waBusinessNumber|section=phone/);
});
