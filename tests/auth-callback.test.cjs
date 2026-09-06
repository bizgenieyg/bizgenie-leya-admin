const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function compile(path, requireMock, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: requireMock, URL, ...globals });
  return exports;
}
const redirects = compile('lib/auth/redirect.ts', () => ({}));

function fixture({ failure = false, throws = false } = {}) {
  const calls = [];
  const cookies = [];
  // Exercise the existing SSR cookie adapter as well as the callback.
  const server = compile('lib/supabase/server.ts', (name) => name === 'next/headers'
    ? { cookies: () => ({ getAll: () => [], set: (...args) => cookies.push(args) }) }
    : { createServerClient: (_url, _key, options) => ({ auth: { exchangeCodeForSession: async (code) => {
      calls.push(code);
      if (throws) throw new Error('private-code');
      if (failure) return { data: { session: null }, error: { message: 'private-details' } };
      options.cookies.setAll([{ name: 'session-cookie', value: 'test-session', options: { path: '/' } }]);
      return { data: { session: {} }, error: null };
    } } }) }, { process: { env: {} } });
  const callback = compile('app/auth/callback/route.ts', (name) => {
    if (name === '@/lib/supabase/server') return server;
    if (name === '@/lib/auth/redirect') return redirects;
    return { NextResponse: { redirect: (url, options) => new Response(null, { status: 307, headers: { ...options.headers, location: url.toString() } }) } };
  });
  return { get: callback.GET, calls, cookies };
}

test('exchanges code and writes session cookies before default redirect', async () => {
  const { get, calls, cookies } = fixture();
  const response = await get(new Request('https://admin.example/auth/callback?code=test-code'));
  assert.deepEqual(calls, ['test-code']);
  assert.equal(cookies.length, 1);
  assert.equal(response.headers.get('location'), 'https://admin.example/onboarding/step-1');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('recovery exchanges the same PKCE code and honors reset destination', async () => {
  const { get, calls } = fixture();
  const response = await get(new Request('https://admin.example/auth/callback?code=test-code&type=recovery&next=/reset-password'));
  assert.equal(calls.length, 1);
  assert.equal(response.headers.get('location'), 'https://admin.example/reset-password');
});

for (const next of ['https://evil.example', '//evil.example', '/\\evil.example', '/\nevil.example']) {
  test(`rejects unsafe next ${JSON.stringify(next)}`, () => {
    assert.equal(redirects.callbackDestination(next, 'https://admin.example', false).href, 'https://admin.example/onboarding/step-1');
  });
}

test('allows local next query and recovery default', () => {
  assert.equal(redirects.callbackDestination('/admin?tab=profile', 'https://admin.example', false).href, 'https://admin.example/admin?tab=profile');
  assert.equal(redirects.callbackDestination(null, 'https://admin.example', true).pathname, '/reset-password');
});

for (const options of [{ failure: true }, { throws: true }]) {
  test(`exchange failure is sanitized ${JSON.stringify(options)}`, async () => {
    const response = await fixture(options).get(new Request('https://admin.example/auth/callback?code=test-code'));
    assert.equal(response.headers.get('location'), 'https://admin.example/login?error=confirm_failed');
  });
}

test('expired link does not attempt exchange or reflect upstream description', async () => {
  const { get, calls } = fixture();
  const response = await get(new Request('https://admin.example/auth/callback?error=access_denied&error_code=otp_expired&error_description=private-details&code=test-code'));
  assert.equal(response.headers.get('location'), 'https://admin.example/login?error=confirm_expired');
  assert.equal(calls.length, 0);
});

test('missing code fails safely', async () => {
  const { get, calls } = fixture();
  assert.equal((await get(new Request('https://admin.example/auth/callback'))).headers.get('location'), 'https://admin.example/login?error=confirm_failed');
  assert.equal(calls.length, 0);
});
