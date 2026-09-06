const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(readFileSync('components/tenant/whatsapp-connection.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText;
const connection = {};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/waha/connection.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: connection });
function text(tree) { if (Array.isArray(tree)) return tree.map(text).join(''); if (tree && typeof tree === 'object') return text(tree.props?.children); return typeof tree === 'string' ? tree : ''; }
function harness({ initialStatus = 'SCAN_QR_CODE', cabinet = false, canEdit = true, confirm = true } = {}) {
  let time = 1000000, index = 0, serial = 0, dirty = true, tree, status = initialStatus;
  const slots = [], effects = [], timers = new Map(), calls = [];
  const exports = {};
  function timer(fn, ms, repeat) { const id = ++serial; timers.set(id, { fn, ms, repeat, due: time + ms }); return id; }
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(compiled, {
    exports, AbortController, Error, window: { confirm: () => confirm }, Date: { now: () => time },
    setInterval: (fn, ms) => timer(fn, ms, true), setTimeout: (fn, ms) => timer(fn, ms, false),
    clearInterval: (id) => timers.delete(id), clearTimeout: (id) => timers.delete(id),
    require(name) {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react') return {
        useState(initial) {
          const key = index++;
          if (!(key in slots)) slots[key] = initial;
          return [slots[key], value => { if (!Object.is(slots[key], value)) { slots[key] = value; dirty = true; } }];
        },
        useRef(initial) { const key = index++; if (!(key in slots)) slots[key] = { current: initial }; return slots[key]; },
        useEffect(fn, deps) {
          const key = index++, old = slots[key];
          if (!old || deps.some((dep, i) => dep !== old.deps[i])) effects.push(() => { old?.cleanup?.(); slots[key] = { deps, cleanup: fn() }; });
        },
      };
      if (name === '@/lib/waha/connection') return {
        ...connection,
        beginSession: async signal => { calls.push({ kind: 'start', signal }); return { status, qrAvailable: status === 'SCAN_QR_CODE' }; },
        requestSession: async (path, signal, method = 'GET') => {
          calls.push({ kind: method === 'POST' ? 'disconnect' : calls.length ? 'poll' : 'initial', signal });
          if (method === 'POST') status = 'DISCONNECTED';
          return { status, qrAvailable: status === 'SCAN_QR_CODE' };
        },
      };
      return {};
    },
  });
  function render() {
    while (dirty) { dirty = false; index = 0; tree = exports.default({ cabinet, canEdit }); while (effects.length) effects.shift()(); }
    return tree;
  }
  async function settle() { for (let i = 0; i < 10; i++) { await Promise.resolve(); render(); } }
  async function advance(ms) {
    const until = time + ms;
    while (true) {
      const next = [...timers].filter(([, task]) => task.due <= until).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      const [id, task] = next; time = task.due;
      if (task.repeat) task.due += task.ms; else timers.delete(id);
      task.fn(); await settle();
    }
    time = until; await settle();
  }
  render();
  return { render, calls, timers, advance, setStatus: next => { status = next; },
    start: settle, settle,
    unmount: () => { for (const slot of slots) slot?.cleanup?.(); },
  };
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
const image = app => nodes(app.render()).find(node => node.type === 'img');

test('QR refreshes every 20 seconds independently of 3-second status polling', async () => {
  const app = harness(); await app.start();
  const first = image(app).props.src;
  assert.match(first, /^\/api\/waha\/qr\?ts=\d+$/);
  await app.advance(19000);
  assert.equal(image(app).props.src, first);
  assert.equal(app.calls.filter(call => call.kind === 'poll').length, 6);
  await app.advance(1000);
  assert.notEqual(image(app).props.src, first);
  app.unmount();
});
test('WORKING hides QR and stops all polling/refresh timers', async () => {
  const app = harness(); await app.start(); app.setStatus('WORKING');
  await app.advance(3000);
  assert.equal(image(app), undefined);
  assert.equal(app.timers.size, 0);
  const count = app.calls.length; await app.advance(180000); assert.equal(app.calls.length, count);
});
test('timeout aborts after three minutes and removes QR', async () => {
  const app = harness(); await app.start(); await app.advance(180000);
  assert.equal(app.timers.size, 0);
  assert.equal(image(app), undefined);
  assert.ok(app.calls[0].signal.aborted);
  assert.match(text(app.render()), /Истекло время ожидания/);
});
test('unmount aborts active request and clears both timers', async () => {
  const app = harness(); await app.start(); app.unmount();
  assert.equal(app.timers.size, 0); assert.ok(app.calls[0].signal.aborted);
  const count = app.calls.length; await app.advance(180000); assert.equal(app.calls.length, count);
});

for (const cabinet of [false, true]) {
  for (const [status, label, action] of [
    ['NOT_CREATED', 'Не подключено', 'Подключить WhatsApp'],
    ['STOPPED', 'Отключено', 'Подключить'],
    ['STARTING', 'Подключаем...', null],
    ['SCAN_QR_CODE', 'Ожидаем сканирования', null],
    ['WORKING', 'Подключено', cabinet ? 'Отключить' : null],
    ['FAILED', 'Не удалось подключиться', 'Попробовать заново'],
    ['FUTURE_STATUS', 'FUTURE_STATUS', 'Попробовать заново'],
  ]) {
    test(`${cabinet ? 'cabinet' : 'onboarding'} displays ${status} with correct actions`, async () => {
      const app = harness({ initialStatus: status, cabinet }); await app.start();
      assert.ok(text(app.render()).includes(label));
      const buttons = nodes(app.render()).filter(node => node.type === 'button').map(text);
      if (action) assert.ok(buttons.includes(action));
      else assert.ok(!buttons.includes('Подключить WhatsApp') && !buttons.includes('Попробовать заново'));
      assert.equal(app.calls.filter(call => call.kind === 'start').length, 0);
      assert.equal(Boolean(image(app)), status === 'SCAN_QR_CODE');
      if (status === 'STARTING') assert.ok(nodes(app.render()).some(node => node.props.className?.includes('animate-spin')));
      app.unmount();
    });
  }
}
for (const confirm of [false, true]) {
  test(`shared cabinet disconnect ${confirm ? 'confirmed' : 'cancelled'}`, async () => {
    const app = harness({ initialStatus: 'WORKING', cabinet: true, confirm }); await app.start();
    nodes(app.render()).find(node => node.type === 'button' && text(node) === 'Отключить').props.onClick();
    await app.settle();
    assert.equal(app.calls.filter(call => call.kind === 'disconnect').length, confirm ? 1 : 0);
    assert.match(text(app.render()), confirm ? /Отключено/ : /Подключено/);
    app.unmount();
  });
}
test('viewer cannot see mutation controls or fetch QR', async () => {
  const app = harness({ initialStatus: 'SCAN_QR_CODE', cabinet: true, canEdit: false }); await app.start();
  assert.equal(image(app), undefined);
  assert.equal(nodes(app.render()).filter(node => node.type === 'button').length, 0);
  app.unmount();
});
