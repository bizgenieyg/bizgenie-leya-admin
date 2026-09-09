const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function fixture({ error = null, user = {}, throws = false } = {}) {
  const state = [];
  const calls = [];
  const navigation = [];
  const stored = [];
  const logs = [];
  let index = 0;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(readFileSync('app/onboarding/step-1/page.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, process: { env: { NODE_ENV: 'production' } }, console: { error: (...args) => logs.push(args) },
    sessionStorage: { setItem: (...args) => stored.push(args) },
    require: (name) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react') return { useState(initial) {
        const slot = index++;
        if (!(slot in state)) state[slot] = initial;
        return [state[slot], (next) => { state[slot] = next; }];
      } };
      if (name === 'next/navigation') return { useRouter: () => ({ push: (path) => navigation.push(path), replace: (path) => navigation.push(path), refresh() {} }) };
      return { createClient: () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) }, rpc: async (name, args) => {
        calls.push({ name, args });
        if (throws) throw new Error('private backend error');
        return { data: error ? null : 'tenant-id', error };
      } }) };
    },
  });
  return { render: () => { index = 0; return exports.default(); }, calls, navigation, stored, logs };
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (tree && typeof tree === 'object') return text(tree.props?.children);
  return typeof tree === 'string' ? tree : '';
}
async function submit(app) {
  const tree = app.render();
  for (const [id, value] of [['owner-name', ' Owner '], ['business-name', ' Business ']]) {
    nodes(tree).find(node => node.props.id === id).props.onChange({ target: { value } });
  }
  await nodes(app.render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
}

test('step 1 creates a tenant with a single plan-less RPC and no tariff choice', async () => {
  const app = fixture();
  await submit(app);
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].name, 'create_tenant_with_owner');
  const args = app.calls[0].args;
  assert.equal(args.p_name, 'Owner');
  assert.equal(args.p_business_name, 'Business');
  assert.equal(args.p_language, 'he');
  assert.equal(Object.keys(args).length, 3);
  // Plan/status/trial are never sent from the client.
  for (const key of ['p_plan', 'p_status', 'p_trial_ends_at', 'p_tier']) {
    assert.equal(key in args, false, `${key} must not be sent`);
  }
  assert.deepEqual(app.stored, [['onboarding_tenant_id', 'tenant-id']]);
  assert.deepEqual(app.navigation, ['/onboarding/step-2']);
  // No tariff selector text on the page.
  const page = text(app.render());
  assert.doesNotMatch(page, /Тариф|Starter|Pro|триал|₪/i);
});

for (const options of [{ error: { message: 'private backend error', code: '42501' } }, { throws: true }]) {
  test(`step 1 sanitizes failure ${JSON.stringify(options)}`, async () => {
    const app = fixture(options);
    await submit(app);
    assert.match(text(app.render()), /Не удалось создать бизнес/);
    assert.doesNotMatch(text(app.render()), /private backend error/);
    assert.equal(app.navigation.length, 0);
    assert.equal(app.stored.length, 0);
    assert.equal(app.logs.length, 0);
  });
}

test('step 1 shows a clear message when the per-account business limit is reached', async () => {
  const app = fixture({ error: { message: 'Business limit reached for this account', code: '54000', hint: 'max_tenants_per_owner' } });
  await submit(app);
  const page = text(app.render());
  assert.match(page, /уже привязан бизнес/);
  assert.doesNotMatch(page, /Business limit reached/);
  assert.equal(app.navigation.length, 0);
  assert.equal(app.stored.length, 0);
});

test('step 1 does not call RPC without authentication', async () => {
  const app = fixture({ user: null });
  await submit(app);
  assert.equal(app.calls.length, 0);
  assert.deepEqual(app.navigation, ['/login']);
});
