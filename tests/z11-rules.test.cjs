const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { read, compile, nodes, text, tick } = require('./settings-harness.cjs');

/** Renders RuleFlow from components/tenant/owner-rules.tsx with minimal hooks; `answers` are the API responses in order. */
function flow(props, answers) {
  let index = 0; const slots = [], calls = [], exports = {}, jsx = (type, p) => ({ type, props: p });
  vm.runInNewContext(compile('components/tenant/owner-rules.tsx', true), { exports, JSON, Error, Promise, URLSearchParams, FormData: class {}, Blob: class {},
    fetch: async (url, options = {}) => { calls.push({ url, body: options.body ? JSON.parse(options.body) : null }); const a = answers.shift() ?? { ok: true, body: {} }; return { ok: a.ok !== false, json: async () => a.body }; }, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === 'react') return { useState(v) { const key = index++; if (!(key in slots)) slots[key] = typeof v === 'function' ? v() : v; return [slots[key], n => { slots[key] = typeof n === 'function' ? n(slots[key]) : n; }]; }, useRef(v) { const key = index++; if (!(key in slots)) slots[key] = { current: v }; return slots[key]; }, useEffect() {}, useCallback: fn => fn };
    if (name === '@/lib/i18n') return { useI18n: () => ({ t: k => k }) };
    if (name === '@/components/ui/primitives') return { Button: 'Button', ConfirmDialog: 'ConfirmDialog', ErrorState: 'ErrorState' };
    return {};
  } });
  const render = () => { index = 0; return exports.RuleFlow(props); };
  const button = label => nodes(render()).find(n => n.type === 'Button' && text(n) === label);
  return { render, calls, button, type: value => nodes(render()).find(n => n.type === 'textarea').props.onChange({ target: { value } }) };
}

test('Z11 cabinet: a rule is understood first («Поняла так …»), saved only by «Сохранить»; «Нет» saves nothing', async () => {
  let saved = null;
  const f = flow({ placeholder: 'p', onSaved: reply => { saved = reply; } }, [
    { body: { reply: 'Поняла так: «Город не спрашивай.». Сохранить? Да / Нет', proposal: { id: 'p1', status: 'pending', action: 'add' } } },
    { body: { reply: 'Хорошо, не сохраняю. Как сказать по-другому?' } },
    { body: { reply: 'Поняла так: «Город не спрашивай.». Сохранить? Да / Нет', proposal: { id: 'p2', status: 'pending', action: 'add' } } },
    { body: { reply: 'Сохранила. Правило 1: «Город не спрашивай.».' } },
  ]);
  f.type('город не спрашивай');
  await f.button('ruleCheck').props.onClick(); await tick();
  assert.deepEqual(f.calls[0], { url: '/api/knowledge-profile/rules', body: { text: 'город не спрашивай' } });
  assert.match(text(f.render()), /Поняла так/);
  await f.button('ruleNo').props.onClick(); await tick();
  assert.equal(f.calls[1].url, '/api/knowledge-profile/rules/proposals/p1/decline'); assert.equal(saved, null);
  f.type('город не спрашивай');
  await f.button('ruleCheck').props.onClick(); await tick();
  await f.button('save').props.onClick(); await tick();
  assert.equal(f.calls[3].url, '/api/knowledge-profile/rules/proposals/p2/confirm');
  assert.match(saved, /^Сохранила/);
});

test('Z11 cabinet: a rule that needs data asks first; the answer goes to details; «Исправить» in the simulator sends the turn as context', async () => {
  const f = flow({ placeholder: 'p', context: 'Клиент написал: сколько?', onSaved() {} }, [
    { body: { reply: 'Какие условия у абонемента?', proposal: { id: 'p1', status: 'details', action: 'fact_rule' } } },
    { body: { reply: 'Поняла так: факт «…» и правило «Предлагай абонемент.». Сохранить? Да / Нет', proposal: { id: 'p1', status: 'pending', action: 'fact_rule' } } },
  ]);
  f.type('предлагай абонемент');
  await f.button('ruleCheck').props.onClick(); await tick();
  assert.deepEqual(f.calls[0].body, { text: 'предлагай абонемент', context: 'Клиент написал: сколько?' });
  f.type('5 за 500');
  await f.button('ruleCheck').props.onClick(); await tick();
  assert.deepEqual(f.calls[1], { url: '/api/knowledge-profile/rules/proposals/p1/details', body: { text: '5 за 500' } });
  assert.ok(f.button('save'), 'now «Сохранить»');
  const simulator = read('components/tenant/conversation-simulator.tsx');
  assert.match(simulator, /<RuleFlow placeholder=\{t\('simulatorCorrectPlaceholder'\)\} context=\{`Клиент написал: \$\{asked\}/);
  assert.match(simulator, /void sendText\(asked\); \}\}>\{t\('simulatorAskAgain'\)\}/);
  assert.match(read('components/tenant/knowledge-profile.tsx'), /\{onboarding\?null:<OwnerRules\/>\}/);
  const d = read('lib/i18n/index.tsx');
  for (const l of ['Ru', 'En', 'He']) assert.ok(d.includes(`...taskZ11${l}`), l);
});
