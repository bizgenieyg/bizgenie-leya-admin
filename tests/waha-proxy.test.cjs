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
    require: (name) => name === 'server-only' ? {} : name === '@/lib/onboarding/roles' ? roleModule : { createClient: () => ({
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
  assert.deepEqual(await response.json(), { status: 'STARTING' });
});

test('status uses query tenant and normalizes nested backend contract', async () => {
  const { proxy, calls } = fixture({ upstream: Response.json({ session: 'private-session', status: { status: 'WORKING', connected: true } }) });
  const response = await proxy(new Request('https://admin.example/api/waha/status?tenantId=foreign'), 'status');
  assert.equal(calls[0].url, 'https://backend.example/api/admin/waha/status?tenantId=tenant-a');
  assert.deepEqual(await response.json(), { status: 'WORKING' });
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
