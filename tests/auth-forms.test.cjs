const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise form event/state behavior with mocked Auth; no emails or password changes are sent.
function form(path, auth) {
  const states = [];
  const navigation = [];
  let index = 0;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports, window: { location: { origin: 'https://preview.example' } },
    require: (name) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react') return { useEffect() {}, useState(initial) {
        const slot = index++;
        if (!(slot in states)) states[slot] = initial;
        return [states[slot], (next) => { states[slot] = typeof next === 'function' ? next(states[slot]) : next; }];
      } };
      if (name === 'next/navigation') return { useRouter: () => ({ replace: (path) => navigation.push(path), refresh() {} }) };
      if (name === '@/lib/supabase/client') return { createClient: () => ({ auth }) };
      if (name === '@/lib/i18n') return { useI18n: () => ({ t: (key, vars = {}) => ({signupAction:'Создать аккаунт',confirmationSent:`Проверьте почту: мы отправили ссылку для подтверждения на ${vars.email ?? ''}`,resend:'Отправить ещё раз',resetSent:'Если такой аккаунт есть, письмо отправлено',passwordMismatch:'Пароли не совпадают.'}[key] || key) }) };
      if (name === '@/components/ui/public-shell') return { default: ({ children }) => jsx('main', { children }) };
      return {};
    },
  });
  const render = () => { index = 0; return exports.default(); };
  return { render, navigation };
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
const submit = (tree) => nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
function fill(tree, id, value) { nodes(tree).find(node => node.props.id === id).props.onChange({ target: { value } }); }

for (const session of [null, {}]) {
  test(`signup handles ${session ? 'immediate session' : 'email confirmation and resend'}`, async () => {
    const calls = [];
    const app = form('app/login/page.tsx', {
      signUp: async (args) => { calls.push(args); return { data: { session }, error: null }; },
      resend: async (args) => { calls.push(args); return { error: null }; },
    });
    nodes(app.render()).find(node => node.type === 'button' && text(node) === 'Создать аккаунт').props.onClick();
    let tree = app.render();
    fill(tree, 'email', 'test@example.com'); fill(tree, 'password', 'test-password');
    await submit(app.render());
    assert.equal(calls[0].options.emailRedirectTo, 'https://preview.example/auth/callback');
    if (session) assert.deepEqual(app.navigation, ['/onboarding/step-1']);
    else {
      assert.deepEqual(app.navigation, []);
      tree = app.render();
      assert.match(text(tree), /мы отправили ссылку для подтверждения на test@example.com/);
      nodes(tree).find(node => node.type === 'button' && text(node) === 'Отправить ещё раз').props.onClick();
      await Promise.resolve();
      assert.equal(calls[1].type, 'signup');
      assert.equal(calls[1].email, 'test@example.com');
      assert.equal(calls[1].options.emailRedirectTo, 'https://preview.example/auth/callback');
    }
  });
}

for (const outcome of ['success', 'error', 'throw']) {
  test(`forgot-password has the same response for ${outcome}`, async () => {
    let request;
    const app = form('app/forgot-password/page.tsx', { resetPasswordForEmail: async (email, options) => {
      request = { email, options };
      if (outcome === 'throw') throw new Error('network');
      return { error: outcome === 'error' ? { message: 'account does not exist' } : null };
    } });
    fill(app.render(), 'email', 'test@example.com');
    await submit(app.render());
    assert.equal(request.options.redirectTo, 'https://preview.example/auth/callback?next=/reset-password');
    assert.match(text(app.render()), /Если такой аккаунт есть, письмо отправлено/);
    assert.doesNotMatch(text(app.render()), /account does not exist/);
  });
}

test('reset rejects mismatched passwords before update and redirects after successful update', async () => {
  const updates = [];
  const app = form('app/reset-password/reset-password-form.tsx', {
    getUser: async () => ({ data: { user: {} }, error: null }),
    updateUser: async (args) => { updates.push(args); return { error: null }; },
  });
  let tree = app.render();
  fill(tree, 'password', 'new-test-password'); fill(tree, 'repeat-password', 'different');
  await submit(app.render());
  assert.equal(updates.length, 0);
  assert.match(text(app.render()), /Пароли не совпадают/);
  fill(app.render(), 'repeat-password', 'new-test-password');
  await submit(app.render());
  assert.equal(updates[0].password, 'new-test-password');
  assert.deepEqual(app.navigation, ['/onboarding/step-1']);
});
