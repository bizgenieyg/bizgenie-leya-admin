const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(
  readFileSync(new URL('../lib/onboarding/tenant.ts', `file://${__filename}`), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;

function scenario({ selected = null, user = { id: 'user-a' }, memberships = [], queryError = null } = {}) {
  const calls = [];
  const query = {
    select(columns) { calls.push(['select', columns]); return this; },
    eq(column, value) { calls.push(['eq', column, value]); return this; },
    async limit(count) { calls.push(['limit', count]); return { data: memberships, error: queryError }; },
  };
  const supabase = {
    auth: { async getUser() { return { data: { user }, error: null }; } },
    from(table) { calls.push(['from', table]); return query; },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: () => ({ createClient: () => supabase }),
    sessionStorage: { getItem: () => selected },
  });
  return { resolve: exports.getOnboardingTenant, calls };
}

test('verifies stored tenant against authenticated user membership', async () => {
  const { resolve, calls } = scenario({ selected: 'tenant-a', memberships: [{ tenant_id: 'tenant-a' }] });
  assert.equal((await resolve()).tenantId, 'tenant-a');
  assert.deepEqual(calls, [['from', 'tenant_users'], ['select', 'tenant_id'], ['eq', 'user_id', 'user-a'], ['eq', 'tenant_id', 'tenant-a'], ['limit', 2]]);
});

test('rejects a foreign stored tenant with no matching membership', async () => {
  const { resolve } = scenario({ selected: 'tenant-b' });
  await assert.rejects(resolve(), /недоступен/);
});

test('uses the sole membership when no tenant is stored', async () => {
  const { resolve } = scenario({ memberships: [{ tenant_id: 'tenant-a' }] });
  assert.equal((await resolve()).tenantId, 'tenant-a');
});

test('rejects ambiguous memberships instead of selecting an arbitrary tenant', async () => {
  const { resolve } = scenario({ memberships: [{ tenant_id: 'tenant-a' }, { tenant_id: 'tenant-b' }] });
  await assert.rejects(resolve(), /однозначно/);
});

test('rejects missing authentication before querying memberships', async () => {
  const { resolve, calls } = scenario({ user: null });
  await assert.rejects(resolve(), /Сессия истекла/);
  assert.deepEqual(calls, []);
});

test('fails closed on membership query errors', async () => {
  const { resolve } = scenario({ queryError: { message: 'denied' } });
  await assert.rejects(resolve(), /проверить доступ/);
});
