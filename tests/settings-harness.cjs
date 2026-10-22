// Z9: renders «Настройки» (components/tenant/tenant-settings.tsx) with minimal React hooks — enough to drive the draft,
// the save bar and the loaders. The pure helpers (draft, labels, phone, time zone) are the real modules.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const read = file => fs.readFileSync(file, 'utf8');
const compile = (file, jsx = false) => ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, ...(jsx ? { jsx: ts.JsxEmit.ReactJSX } : {}) } }).outputText;
function loadModule(file, globals = {}) { const exports = {}; vm.runInNewContext(compile(file), { exports, require: () => ({}), Intl, Date, Number, String, Object, Array, Math, RegExp, Set, ...globals }); return exports; }
// The page's own hook-free layout components (a card, a setting row) are expanded, so their markup is visible.
const LAYOUT = new Set(['SettingsCard', 'Row']);
const expand = tree => tree && typeof tree === 'object' && typeof tree.type === 'function' && LAYOUT.has(tree.type.name) ? tree.type(tree.props) : null;
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : !tree || typeof tree !== 'object' ? [] : [tree, ...(expand(tree) ? nodes(expand(tree)) : nodes(tree.props?.children)), ...(typeof tree.props?.render === 'function' ? nodes(tree.props.render()) : [])];
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree && typeof tree === 'object' ? text(expand(tree) ?? tree.props?.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

const SETTINGS = { business_name: 'Ноготки', owner_name: 'Ира', assistant_name: 'Мира', owner_language: 'ru', business_sector: '', instruction_answers: true, supported_time_zones: ['Asia/Jerusalem', 'Europe/Moscow'],
  exceptions: [], time_zone: 'Asia/Jerusalem', polish_owner_answer: true, auto_resume_hours: 4, summary_frequency: 'weekly', summary_time: '09:00', summary_weekday: 0, quiet_hours_start: '', quiet_hours_end: '', plan: 'pilot', owner_phone: '972523695741', paired: true, pending_owner_phone: '' };

/**
 * `backend(url, options)` answers every fetch ({ ok, status, body }); defaults: the settings above and a confirmed owner number.
 * Returns render(), settle(), the tree helpers and the calls made.
 */
function mountSettings({ backend, props = { profile: { email: 'o@x.test' }, section: null }, settings = SETTINGS } = {}) {
  let index = 0; const slots = [], effects = [], calls = [], exports = {}, jsx = (type, p) => ({ type, props: p });
  const dirtyReports = [], refreshes = [];
  const translate = (k, v = {}) => Object.entries(v).reduce((s, [a, b]) => s.replaceAll(`{${a}}`, String(b)), k);
  const answer = backend ?? ((url, options = {}) => url.includes('owner-settings') ? { ok: true, body: { phone: settings.owner_phone, paired: settings.paired, pendingPhone: settings.pending_owner_phone } }
    : options.method === 'PATCH' ? { ok: true, body: { saved: true } } : { ok: true, body: { settings, usage: {} } });
  const fetch = async (url, options = {}) => { calls.push({ url: String(url), options }); const r = await answer(String(url), options); if (r instanceof Error) throw r; return { ok: r.ok, status: r.status ?? (r.ok ? 200 : 500), json: async () => r.body }; };
  const real = { '@/lib/tenant-settings/draft': loadModule('lib/tenant-settings/draft.ts'), '@/lib/tenant/labels': loadModule('lib/tenant/labels.ts'), '@/lib/tenant-settings/time-zone': loadModule('lib/tenant-settings/time-zone.ts') };
  const normalize = loadModule('lib/tenant-settings/normalize.ts');
  vm.runInNewContext(compile('components/tenant/tenant-settings.tsx', true), { exports, fetch, Promise, Error, Math, Date, JSON, Object, Array, Number, String, Set, Intl, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, document: undefined, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === 'react') return {
      useState(initial) { const key = index++; if (!(key in slots)) slots[key] = typeof initial === 'function' ? initial() : initial; return [slots[key], next => { slots[key] = typeof next === 'function' ? next(slots[key]) : next; }]; },
      useRef(initial) { const key = index++; if (!(key in slots)) slots[key] = { current: initial }; return slots[key]; },
      useEffect(fn, deps) { const key = index++, old = slots[key]; if (!old || !deps || deps.some((d, i) => d !== old.deps[i])) { slots[key] = { deps: deps ?? [] }; effects.push(fn); } },
      // Stable callbacks (as React keeps them for equal deps), so the loader effect runs once.
      useCallback(fn, deps) { const key = index++, old = slots[key]; if (old && deps.every((d, i) => d === old.deps[i])) return old.fn; slots[key] = { fn, deps }; return fn; },
      useMemo(fn, deps) { const key = index++, old = slots[key]; if (old && deps.every((d, i) => d === old.deps[i])) return old.value; const value = fn(); slots[key] = { value, deps }; return value; },
    };
    if (name === 'next/navigation') return { useRouter: () => ({ refresh() { refreshes.push(1); } }) };
    // One `t` for the page's lifetime, as the provider gives it (a new `t` would mean a new language → a reload).
    if (name === '@/lib/i18n') return { useI18n: () => ({ t: translate, locale: 'ru' }), useFormat: () => ({ month: String, date: String, number: String }) };
    if (name === '@/lib/i18n/api-error') return { translatedApiError: (_t, d, key) => d?.code ?? key };
    if (name === '@/lib/tenant-settings/normalize') return normalize;
    if (name === '@/lib/tenant/simulator-drawer') return { useSimulatorDrawer: () => ({ setDirty: (source, value) => dirtyReports.push([source, value]) }) };
    if (name === '@/lib/tenant-settings/leave-guard') return { useLeaveGuard: () => ({ asking: false, stay() {}, go() {} }), useKeyboardInset() {} };
    if (name === '@/components/ui/primitives') return { ErrorState: 'ErrorState', Button: 'Button', Check: 'Check', Select: 'Select', Switch: 'Switch', ConfirmDialog: 'ConfirmDialog' };
    if (real[name]) return real[name];
    return { __esModule: true, default: name.split('/').pop() };
  } });
  let tree;
  const render = () => { for (let i = 0; i < 20; i++) { index = 0; tree = exports.default(props); if (!effects.length) break; while (effects.length) effects.shift()(); } return tree; };
  const settle = async () => { for (let i = 0; i < 10; i++) { await tick(); render(); } return tree; };
  const all = () => nodes(render());
  const byId = id => all().find(n => n.props?.id === id);
  const bar = () => all().find(n => /(^| )save-bar( |$)/.test(n.props?.className ?? ''));
  const button = (root, label) => nodes(root).find(n => n.type === 'Button' && text(n) === label);
  const body = () => all().filter(n => n.type === 'p').map(text).join(' | ');
  return { render, settle, all, byId, bar, button, body, calls, dirtyReports, refreshes, text, nodes };
}
module.exports = { mountSettings, SETTINGS, nodes, text, read, compile, loadModule, tick };
