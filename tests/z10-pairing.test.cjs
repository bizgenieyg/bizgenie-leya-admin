const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { read, compile, loadModule, nodes, text, tick } = require('./settings-harness.cjs');

function route({ role = 'owner', user = { id: 'u' }, upstream = { status: 200, body: { code: 'ABCD-EFGH' } } } = {}) {
  const calls = [], exports = {};
  const phone = loadModule('lib/tenant/phone.ts');
  const db = { auth: { getUser: async () => ({ data: { user }, error: null }) }, from() { const q = { select: () => q, eq: () => q, limit: async () => ({ data: [{ tenant_id: 'server-tenant', role }], error: null }) }; return q; } };
  vm.runInNewContext(compile('app/api/waha/pairing-code/route.ts'), { exports, URL, Response, AbortSignal, JSON, console: { error() {} }, require(name) {
    if (name === '@/lib/supabase/server') return { createClient: () => db };
    if (name === '@/lib/onboarding/roles') return { requireRole: (roles, r) => { if (!roles.includes(r)) throw new Error('role'); } };
    if (name === '@/lib/backend/leya-env') return { readLeyaBackendEnv: () => ({ apiUrl: 'https://api.test', adminApiKey: 'k' }) };
    if (name === '@/lib/tenant/phone') return phone;
    return {};
  }, fetch: async (url, options) => { calls.push({ url: String(url), options }); return new Response(JSON.stringify(upstream.body), { status: upstream.status }); } });
  const post = body => exports.POST(new Request('https://a.test/api/waha/pairing-code', { method: 'POST', headers: { host: 'a.test', origin: 'https://a.test', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  return { post, calls };
}

test('Z10: the pairing code route — the business number in E.164 to the backend, the code back; errors are codes, never WAHA text', async () => {
  const ok = route();
  const r = await ok.post({ phone: '052-216-4724', country: '972' });
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { code: 'ABCD-EFGH' });
  assert.equal(ok.calls[0].url, 'https://api.test/api/admin/waha/pairing-code?tenantId=server-tenant');
  assert.deepEqual(JSON.parse(ok.calls[0].options.body), { phone: '972522164724' });
  const bad = route(); assert.deepEqual(await (await bad.post({ phone: '12' })).json(), { code: 'pairingPhoneInvalid' }); assert.equal(bad.calls.length, 0);
  for (const [status, code] of [[409, 'pairingUnavailable'], [502, 'pairingFailed'], [500, 'pairingFailed']]) {
    const res = await route({ upstream: { status, body: { error: 'gRPC: rpc error code = Internal' } } }).post({ phone: '0522164724' });
    assert.deepEqual(await res.json(), { code }, String(status));
  }
  const viewer = route({ role: 'viewer' }); assert.equal((await viewer.post({ phone: '0522164724' })).status, 403); assert.equal(viewer.calls.length, 0);
  assert.doesNotMatch(read('app/api/waha/pairing-code/route.ts'), /deviceName|device_name/, 'no device name (the code often fails with one)');
});

test('Z10: «Подключаюсь с этого телефона» — number → «Получить код» → the code and three steps; «Получить новый код», «Вернуться к QR»', async () => {
  let index = 0; const slots = [], exports = {}, jsx = (type, p) => ({ type, props: p }), calls = [];
  let back = 0, answer = { ok: true, body: { code: 'WXYZ-1234' } };
  vm.runInNewContext(compile('components/tenant/pairing-code-panel.tsx', true), { exports, JSON, Error, Promise, fetch: async (url, options) => { calls.push(JSON.parse(options.body)); return { ok: answer.ok, json: async () => answer.body }; }, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === 'react') return { useState(v) { const key = index++; if (!(key in slots)) slots[key] = v; return [slots[key], n => { slots[key] = typeof n === 'function' ? n(slots[key]) : n; }]; } };
    if (name === '@/lib/i18n') return { useI18n: () => ({ t: k => k }) };
    if (name === '@/lib/i18n/api-error') return { translatedApiError: (_t, d, k) => d?.code ?? k };
    if (name === '@/components/ui/primitives') return { Button: 'Button', Select: 'Select' };
    if (name === '@/lib/tenant/phone') return loadModule('lib/tenant/phone.ts');
    return {};
  } });
  const render = () => { index = 0; return exports.default({ onBack: () => back++ }); };
  const all = () => nodes(render());
  all().find(n => n.props?.id === 'pairing-phone').props.onChange({ target: { value: '52 216 4724' } });
  assert.match(text(render()), /\+972 52-216-4724/);
  await all().find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); await tick();
  assert.deepEqual(calls[0], { phone: '52 216 4724', country: '972' });
  const body = text(render());
  assert.match(body, /WXYZ-1234/); assert.match(body, /pairingStep1.*pairingStep2.*pairingStep3/s);
  answer = { ok: false, body: { code: 'pairingFailed' } };
  await all().find(n => n.type === 'Button' && text(n) === 'pairingNewCode').props.onClick(); await tick();
  assert.match(text(render()), /pairingFailed/, 'a WAHA failure in simple words');
  all().find(n => text(n) === 'pairingBackToQr' && n.type === 'button').props.onClick(); assert.equal(back, 1);
  const connection = read('components/tenant/whatsapp-connection.tsx');
  assert.match(connection, /\{scanning && pairing \? <PairingCodePanel onBack=\{\(\) => setPairing\(false\)\}\/> : null\}/);
  assert.match(connection, /className="pair-phone-top"/); assert.match(connection, /className="text-link-inline pair-phone-link"/);
  const css = read('app/globals.css');
  assert.match(css, /@media\(max-width:37\.5rem\)\{\.qr-scan \.pair-phone-top\{display:inline-flex/);
  const d = read('lib/i18n/index.tsx');
  for (const l of ['Ru', 'En', 'He']) assert.ok(d.includes(`...taskZ10${l}`), l);
});
