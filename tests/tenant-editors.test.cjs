const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function editor(name, { onboarding = false, writable = true, confirm = true } = {}) {
  let index = 0, dirty = true, tree;
  const slots = [], effects = [], writes = [], navigation = [], requests = [];
  let items = [];
  const supabase = { from(table) {
    let operation = 'read', values, id;
    const query = {
      select() { return this; }, eq(column, value) { if (column === 'id') id = value; return this; }, order() { return this; },
      update(data) { operation = 'update'; values = data; return this; },
      insert(data) { operation = 'insert'; values = data; return this; },
      delete() { operation = 'delete'; return this; },
      async single() {
        if (operation !== 'read') writes.push({ table, operation, values });
        if (table === 'assistant_profiles') return { data: { assistant_name: 'Лея', allowed_languages: ['he'], tone: 'friendly', style_profile_md: '', tenant_id: 'tenant-a' }, error: null };
        if (operation === 'insert') { const item = { id: 'faq-a', ...values }; items.push(item); return { data: item }; }
        if (operation === 'update') { items = items.map(item => item.id === id ? { ...item, ...values } : item); return { data: items.find(item => item.id === id) }; }
        if (operation === 'delete') { items = items.filter(item => item.id !== id); return { data: { id } }; }
      },
      then(resolve) { return Promise.resolve({ data: [...items], error: null }).then(resolve); },
    };
    return query;
  } };
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(readFileSync(`components/tenant/${name}.tsx`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, Error, AbortController, window: { confirm: () => confirm }, require(path) {
    if (path === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (path === 'react') return {
      useState(initial) { const key = index++; if (!(key in slots)) slots[key] = initial; return [slots[key], next => { slots[key] = typeof next === 'function' ? next(slots[key]) : next; dirty = true; }]; },
      useRef(initial) { const key = index++; if (!(key in slots)) slots[key] = { current: initial }; return slots[key]; },
      useEffect(fn) { const key = index++; if (!(key in slots)) { slots[key] = true; effects.push(fn); } },
    };
    if (path === 'next/navigation') return { useRouter: () => ({ push: path => navigation.push(path) }) };
    if (path === '@/lib/waha/connection') return { isConnected: status => status === 'WORKING', backendUnavailable: 'Недоступен', requestStatus: async (path, _signal, method = 'GET') => { requests.push({ path, method }); return method === 'POST' ? 'DISCONNECTED' : 'WORKING'; } };
    if (path === '@/lib/onboarding/tenant') return { getOnboardingTenant: async () => ({ supabase, tenantId: 'tenant-a', requireRole() { if (!writable) throw new Error('Недостаточно прав'); } }) };
    return {};
  } });
  const render = () => { if (dirty) { dirty = false; index = 0; tree = exports.default({ onboarding }); while (effects.length) effects.shift()(); } return tree; };
  const settle = async () => { for (let i = 0; i < 12; i++) { await Promise.resolve(); render(); } };
  render();
  return { render, settle, writes, navigation, requests };
}
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree || typeof tree !== 'object') return []; return [tree, ...nodes(tree.props?.children)]; }
function text(tree) { if (Array.isArray(tree)) return tree.map(text).join(''); if (tree && typeof tree === 'object') return text(tree.props?.children); return typeof tree === 'string' ? tree : ''; }
const submit = app => nodes(app.render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
function fill(app, id, value) { nodes(app.render()).find(node => node.props.id === id).props.onChange({ target: { value } }); }

for (const onboarding of [false, true]) {
  test(`shared assistant form saves in ${onboarding ? 'onboarding' : 'admin'}`, async () => {
    const app = editor('assistant-settings', { onboarding }); await app.settle();
    fill(app, 'assistant-name', 'New name'); await submit(app); await app.settle();
    assert.equal(app.writes[0].values.assistant_name, 'New name');
    assert.deepEqual(app.navigation, onboarding ? ['/onboarding/step-3'] : []);
    if (!onboarding) assert.match(text(app.render()), /Настройки сохранены/);
  });
}
test('shared FAQ editor has empty state and supports add/edit/delete', async () => {
  const app = editor('knowledge-editor'); await app.settle();
  assert.match(text(app.render()), /Пока нет ни одного вопроса/);
  assert.ok(nodes(app.render()).some(node => node.type === 'button' && text(node) === 'Добавить вопрос'));
  fill(app, 'question', 'Question'); fill(app, 'answer', 'Answer'); await submit(app); await app.settle();
  assert.match(text(app.render()), /Question/);
  nodes(app.render()).find(node => node.type === 'button' && text(node) === 'Редактировать').props.onClick(); await app.settle();
  fill(app, 'answer', 'Updated'); await submit(app); await app.settle();
  assert.match(text(app.render()), /Updated/);
  nodes(app.render()).find(node => node.type === 'button' && text(node) === 'Удалить').props.onClick(); await app.settle();
  assert.match(text(app.render()), /Пока нет ни одного вопроса/);
  assert.deepEqual(app.writes.map(write => write.operation), ['insert', 'update', 'delete']);
  assert.deepEqual(app.navigation, []);
});
for (const component of ['assistant-settings', 'knowledge-editor']) {
  test(`viewer cannot mutate ${component} even if submit handler is invoked`, async () => {
    const app = editor(component, { writable: false }); await app.settle();
    if (component === 'knowledge-editor') { fill(app, 'question', 'Question'); fill(app, 'answer', 'Answer'); }
    await submit(app); await app.settle();
    assert.equal(app.writes.length, 0);
    assert.match(text(app.render()), /Недостаточно прав/);
  });
}

for (const confirm of [false, true]) {
  test(`WhatsApp disconnect ${confirm ? 'confirmed' : 'cancelled'}`, async () => {
    const app = editor('whatsapp-status', { confirm }); await app.settle();
    assert.match(text(app.render()), /Подключено/);
    nodes(app.render()).find(node => node.type === 'button' && text(node) === 'Отключить').props.onClick();
    await app.settle();
    assert.equal(app.requests.filter(request => request.method === 'POST').length, confirm ? 1 : 0);
    assert.match(text(app.render()), confirm ? /Не подключено/ : /Подключено/);
  });
}
