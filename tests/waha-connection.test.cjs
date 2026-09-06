const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(readFileSync('lib/waha/connection.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function fixture(status, responseStatus = 200) {
  const calls = [];
  const exports = {};
  vm.runInNewContext(compiled, { exports, fetch: async (path, options) => {
    calls.push({ path, method: options.method });
    return Response.json({ status: calls.length === 1 ? status : 'STARTING', error: 'private upstream details' }, { status: responseStatus });
  } });
  return { calls, begin: exports.beginConnection };
}
for (const status of ['SCAN_QR_CODE', 'WORKING', 'CONNECTED', 'STARTING', 'FAILED', 'STOPPED', 'UNKNOWN']) {
  test(`connect reuses existing ${status} session`, async () => {
    const { begin, calls } = fixture(status);
    assert.equal(await begin(new AbortController().signal, false), status);
    assert.deepEqual(calls, [{ path: '/api/waha/status', method: 'GET' }]);
  });
}
test('only missing session triggers create', async () => {
  const { begin, calls } = fixture('NOT_CREATED');
  assert.equal(await begin(new AbortController().signal, false), 'STARTING');
  assert.deepEqual(calls, [{ path: '/api/waha/status', method: 'GET' }, { path: '/api/waha/create', method: 'POST' }]);
});
for (const status of ['FAILED', 'STOPPED', 'FUTURE_STATE']) {
  test(`retry reconnects ${status} without create/disconnect`, async () => {
    const { begin, calls } = fixture(status);
    await begin(new AbortController().signal, true);
    assert.deepEqual(calls, [{ path: '/api/waha/status', method: 'GET' }, { path: '/api/waha/reconnect', method: 'POST' }]);
  });
}
test('retry rechecks status and does not restart a recovered session', async () => {
  const { begin, calls } = fixture('WORKING');
  assert.equal(await begin(new AbortController().signal, true), 'WORKING');
  assert.equal(calls.length, 1);
});
test('backend failure never triggers create and is sanitized', async () => {
  const { begin, calls } = fixture(null, 502);
  await assert.rejects(begin(new AbortController().signal, false), /Бэкенд недоступен/);
  assert.equal(calls.length, 1);
});

for (const code of [400, 404, 409, 422]) {
  test(`HTTP ${code} is not labelled backend unavailable`, async () => {
    const { begin } = fixture(null, code);
    await assert.rejects(begin(new AbortController().signal, false), error => !error.message.includes('Бэкенд недоступен'));
  });
}
