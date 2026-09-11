const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const roleModule = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/onboarding/roles.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: roleModule, require: () => ({}) });

const compiled = ts.transpileModule(readFileSync('lib/waha/proxy.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function fixture({ user = { id: 'user-a' }, memberships = [{ tenant_id: 'tenant-a', role: 'owner' }], upstream = Response.json({ status: 'STARTING' }) } = {}) {
  const calls = [];
  const filters = [];
  const query = {
    select() { return this; },
    eq(...args) { filters.push(args); return this; },
    async limit() { return { data: memberships, error: null }; },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Response, URL, AbortSignal,
    console: { error() {} },
    process: { env: { LEIA_API_URL: 'https://backend.example', LEIA_ADMIN_API_KEY: 'test-secret' } },
    require: (name) => name === 'server-only' ? {} : name.includes('leya-env') ? {readLeyaBackendEnv:()=>({apiUrl:'https://backend.example',adminApiKey:'test-secret'})} : name === '@/lib/onboarding/roles' ? roleModule : { createClient: () => ({
      auth: { getUser: async () => ({ data: { user } }) },
      from: () => query,
    }) },
    fetch: async (url, options) => { calls.push({ url: url.toString(), options }); return upstream; },
  });
  return { proxy: exports.proxyWaha, calls, filters };
}
const post = () => new Request('https://admin.example/api/waha/create', {
  method: 'POST', headers: { origin: 'https://admin.example' }, body: JSON.stringify({ tenantId: 'foreign-tenant' }),
});

test('create derives tenant from authenticated membership, never client body', async () => {
  const { proxy, calls, filters } = fixture();
  const response = await proxy(post(), 'create');
  assert.equal(response.status, 200);
  assert.deepEqual(filters, [['user_id', 'user-a']]);
  assert.equal(calls[0].url, 'https://backend.example/api/admin/waha/create');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-secret');
  assert.deepEqual(JSON.parse(calls[0].options.body), { tenantId: 'tenant-a' });
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.redirect, 'error');
  assert.deepEqual(await response.json(), { status: 'STARTING', qrAvailable: false });
});

test('status uses query tenant and normalizes nested backend contract', async () => {
  const { proxy, calls } = fixture({ upstream: Response.json({ session: 'private-session', status: { status: 'WORKING', connected: true } }) });
  const response = await proxy(new Request('https://admin.example/api/waha/status?tenantId=foreign'), 'status');
  assert.equal(calls[0].url, 'https://backend.example/api/admin/waha/status?tenantId=tenant-a');
  assert.deepEqual(await response.json(), { status: 'WORKING', qrAvailable: false });
});

test('QR preserves binary image and prevents caching', async () => {
  const { proxy, calls } = fixture({ upstream: new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } }) });
  const response = await proxy(new Request('https://admin.example/api/waha/qr'), 'qr');
  assert.equal(calls[0].url, 'https://backend.example/api/admin/waha/qr?tenantId=tenant-a');
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [137, 80, 78, 71]);
});

for (const [label, options, expected] of [
  ['anonymous', { user: null }, 401],
  ['no membership', { memberships: [] }, 403],
  ['ambiguous membership', { memberships: [{ tenant_id: 'a' }, { tenant_id: 'b' }] }, 409],
  ['viewer', { memberships: [{ tenant_id: 'a', role: 'viewer' }] }, 403],
]) {
  test(`rejects ${label} before backend request`, async () => {
    const { proxy, calls } = fixture(options);
    assert.equal((await proxy(post(), 'create')).status, expected);
    assert.equal(calls.length, 0);
  });
}

test('rejects cross-origin create', async () => {
  const { proxy, calls } = fixture();
  const response = await proxy(new Request('https://admin.example/api/waha/create', { method: 'POST', headers: { origin: 'https://foreign.example' } }), 'create');
  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
});

test('does not expose raw upstream errors', async () => {
  const { proxy } = fixture({ upstream: new Response('sensitive upstream details', { status: 500 }) });
  const response = await proxy(post(), 'create');
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /sensitive/);
});

test('missing session returns a local status without inventing a backend endpoint', async () => {
  const { proxy } = fixture({ upstream: new Response('', { status: 404 }) });
  const response = await proxy(new Request('https://admin.example/api/waha/status'), 'status');
  assert.deepEqual(await response.json(), { status: 'NOT_CREATED' });
});

test('accepts browser origin matching incoming Host when Next uses an internal hostname', async () => {
  const { proxy } = fixture({ user: null });
  const response = await proxy(new Request('http://localhost:3014/api/waha/create', {
    method: 'POST', headers: { host: '127.0.0.1:3014', origin: 'http://127.0.0.1:3014' },
  }), 'create');
  assert.equal(response.status, 401);
});

test('reconnect posts tenantId in query without forwarding client body', async () => {
  const { proxy, calls } = fixture();
  const response = await proxy(post(), 'reconnect');
  assert.equal(response.status, 200);
  assert.equal(calls[0].url, 'https://backend.example/api/admin/waha/reconnect?tenantId=tenant-a');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.body, undefined);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-secret');
});

test('create preserves backend 201', async () => {
  const { proxy } = fixture({ upstream: Response.json({ status: 'STARTING' }, { status: 201 }) });
  assert.equal((await proxy(post(), 'create')).status, 201);
});

for (const upstream of [new Response('Cannot GET /bad/path', { status: 404, headers: { 'content-type': 'text/html' } }), Response.json({ error: 'Route not found' }, { status: 404 })]) {
  test('route 404 is not treated as an absent session', async () => {
    const { proxy } = fixture({ upstream });
    const response = await proxy(new Request('https://admin.example/api/waha/status'), 'status');
    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /NOT_CREATED/);
  });
}

for (const upstream of [Response.json({ error: 'WhatsApp session not found' }, { status: 404 }), new Response(null, { status: 204 }), Response.json(null), Response.json({})]) {
  test('recognizes explicit missing-session or empty status responses', async () => {
    const { proxy } = fixture({ upstream });
    const response = await proxy(new Request('https://admin.example/api/waha/status'), 'status');
    assert.deepEqual(await response.json(), { status: 'NOT_CREATED' });
  });
}

test('disconnect uses query tenant and normalizes confirmed backend response', async () => {
  const { proxy, calls } = fixture({ upstream: Response.json({ session: 'private-session', disconnected: true }) });
  const response = await proxy(post(), 'disconnect');
  assert.equal(calls[0].url, 'https://backend.example/api/admin/waha/disconnect?tenantId=tenant-a');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.body, undefined);
  assert.deepEqual(await response.json(), { status: 'DISCONNECTED' });
});

test('viewer may read status but cannot disconnect', async () => {
  const read = fixture({ memberships: [{ tenant_id: 'tenant-a', role: 'viewer' }], upstream: Response.json({ status: { status: 'WORKING' } }) });
  assert.equal((await read.proxy(new Request('https://admin.example/api/waha/status'), 'status')).status, 200);
  const write = fixture({ memberships: [{ tenant_id: 'tenant-a', role: 'viewer' }] });
  assert.equal((await write.proxy(post(), 'disconnect')).status, 403);
  assert.equal(write.calls.length, 0);
});

for (const status of ['STOPPED', 'STARTING', 'SCAN_QR_CODE', 'WORKING', 'FAILED', 'FUTURE']) {
  test(`proxy preserves normalized ${status} without treating it as unavailable`, async () => {
    const { proxy } = fixture({ upstream: Response.json({ status, qrAvailable: status === 'SCAN_QR_CODE' }) });
    const response = await proxy(new Request('https://admin.example/api/waha/status'), 'status');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status, qrAvailable: status === 'SCAN_QR_CODE' });
  });
}
test('QR conflict preserves status and does not become 502', async () => {
  const { proxy } = fixture({ upstream: Response.json({ status: 'FAILED', qrAvailable: false, error: 'private' }, { status: 409 }) });
  const response = await proxy(new Request('https://admin.example/api/waha/qr'), 'qr');
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { status: 'FAILED', qrAvailable: false });
});

test('FAILED forwards the backend safe reason without arbitrary fields', async () => {
  const { proxy } = fixture({ upstream: Response.json({ status: 'FAILED', qrAvailable: false, reason: 'WAHA не удалось получить состояние подключения.', internal: 'secret' }) });
  const response = await proxy(new Request('https://admin.example/api/waha/status'), 'status');
  const data = await response.json();
  assert.equal(data.reason, 'WAHA не удалось получить состояние подключения.');
  assert.equal(data.internal, undefined);
});
