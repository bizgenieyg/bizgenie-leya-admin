const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const drawer = readFileSync('components/tenant/simulator-drawer.tsx', 'utf8');
const drawerContext = readFileSync('lib/tenant/simulator-drawer.tsx', 'utf8');
const css = readFileSync('app/globals.css', 'utf8');
const page = readFileSync('app/admin/assistant/page.tsx', 'utf8');
const layout = readFileSync('app/admin/assistant/layout.tsx', 'utf8');
const simulator = readFileSync('components/tenant/conversation-simulator.tsx', 'utf8');
const login = readFileSync('app/login/page.tsx', 'utf8');
const dictionary = readFileSync('lib/i18n/index.tsx', 'utf8');
const redirect = readFileSync('lib/auth/redirect.ts', 'utf8');

test('the assistant section opens the simulator in a drawer with an open button on every page', () => {
  assert.match(page, /SimulatorOpenButton/);
  assert.match(layout, /SimulatorDrawerProvider/);
  assert.match(layout, /<SimulatorDrawer\s*\/>/);
  assert.doesNotMatch(page, /assistant-simulator/);
});

test('drawer closes by the close button, Escape, and returns focus to the open button', () => {
  assert.match(drawer, /aria-label=\{t\('close'\)\}/);
  assert.match(drawer, /onClick=\{closeDrawer\}/);
  assert.match(drawer, /event\.key === 'Escape'/);
  assert.match(drawerContext, /returnFocus\(\)/);
  assert.match(drawerContext, /rememberFocus\(\)/);
  assert.match(drawerContext, /document\.activeElement/);
});

test('drawer open state is remembered in localStorage, wrapped in try/catch', () => {
  assert.match(drawerContext, /localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(drawerContext, /localStorage\.setItem\(STORAGE_KEY/);
  const tryBlocks = drawerContext.match(/try\s*{[^}]*localStorage[^}]*}\s*catch/gs) || [];
  assert.ok(tryBlocks.length >= 2, 'localStorage reads and writes must be wrapped in try/catch');
});

test('the simulator stays mounted so the conversation survives closing and reopening the drawer', () => {
  assert.match(drawer, /<ConversationSimulator/);
  assert.doesNotMatch(drawer, /\{open\s*&&\s*<ConversationSimulator/);
  assert.doesNotMatch(drawer, /\{open\s*\?\s*<ConversationSimulator/);
});

test('the drawer is 420px wide on desktop, full width below 768px, and pushes page content at 1200px+', () => {
  assert.match(css, /\.simulator-drawer\{[^}]*inline-size:26\.25rem/);
  assert.match(css, /@media\(max-width:47\.9375rem\)\{\.simulator-drawer\{inline-size:100%\}\}/);
  assert.match(css, /@media\(min-width:75rem\)\{body\.simulator-drawer-open \.page-wrap\{padding-inline-end:/);
  assert.doesNotMatch(css, /\.simulator-drawer\{[^}]*background-color:\s*rgba\(0,\s*0,\s*0/);
});

test('the drawer has no backdrop and sits at the inline-end edge for both LTR and RTL', () => {
  assert.match(css, /\.simulator-drawer\{[^}]*inset-inline-end:0/);
  assert.doesNotMatch(css, /\.simulator-drawer-backdrop/);
  assert.match(css, /\[dir="rtl"\] \.simulator-drawer\{transform:translateX\(-100%\)\}/);
});

test('drawer, simulator and assistant settings use only logical CSS directions', () => {
  for (const source of [drawer, drawerContext, simulator, page, layout]) {
    assert.doesNotMatch(source, /\b(?:ml|mr|pl|pr|left|right)-|text-(?:left|right)/);
  }
});

test('unsaved assistant settings changes show a warning above the simulator input', () => {
  assert.match(simulator, /dirtyWarning/);
  assert.match(simulator, /t\('simulatorDirtyWarning'\)/);
  assert.match(drawer, /dirtyWarning=\{dirty\}/);
  const assistantSettings = readFileSync('components/tenant/assistant-settings.tsx', 'utf8');
  assert.match(assistantSettings, /useSimulatorDrawer/);
  assert.match(assistantSettings, /setDirty\(/);
  for (const locale of ['Ru', 'En', 'He']) assert.match(dictionary, new RegExp(`taskK${locale}`));
  assert.match(dictionary, /simulatorDirtyWarning:'Сохраните изменения, чтобы ассистент отвечал с ними\.'/);
});

test('the callback route redirects confirmation failures to /login with a code, never raw provider text', () => {
  const callback = readFileSync('lib/auth/callback.ts', 'utf8');
  assert.match(callback, /\/login\?error=\$\{reason\}/);
  assert.match(callback, /params\.has\('error'\)\s*\|\|\s*params\.has\('error_description'\)/);
  assert.doesNotMatch(callback, /error_description[^)]*\)\}`/);
});

test('no tone example in ru, en or he contains forbidden filler phrases', () => {
  const forbidden = [
    'с радостью помогу', 'постараюсь помочь', 'чем могу быть полезен', 'чем могу помочь',
    'расскажите, пожалуйста, что вам нужно', 'благодарим за обращение',
    'happy to help', "i'll do my best", 'how can i help', 'thank you for contacting',
    'אשמח לעזור', 'אעשה כמיטב יכולתי', 'במה אוכל לעזור', 'תודה על פנייתך',
  ];
  const exampleKeys = ['toneFriendlyProfessionalExample', 'toneWarmConversationalExample', 'toneConciseDirectExample', 'toneFormalRespectfulExample'];
  for (const key of exampleKeys) {
    const matches = [...dictionary.matchAll(new RegExp(`${key}:'((?:[^'\\\\]|\\\\.)*)'`, 'g'))];
    assert.ok(matches.length >= 3, `expected ru/en/he values for ${key}`);
    for (const match of matches) {
      const value = match[1].toLowerCase();
      for (const phrase of forbidden) assert.ok(!value.includes(phrase.toLowerCase()), `${key} contains forbidden phrase "${phrase}": ${match[1]}`);
    }
  }
});

test('the new task K dictionary keys exist for every locale and are spread into all three dictionaries', () => {
  assert.match(dictionary, /const taskKRu=\{simulatorOpenButton:'Проверить ассистента'/);
  assert.match(dictionary, /const taskKEn:Record<keyof typeof taskKRu,string>=/);
  assert.match(dictionary, /const taskKHe:Record<keyof typeof taskKRu,string>=/);
  assert.match(dictionary, /\.\.\.taskKRu\}/);
  assert.match(dictionary, /\.\.\.taskKEn\}/);
  assert.match(dictionary, /\.\.\.taskKHe\}/);
});

test('Google sign-in is removed completely; email login and links remain', () => {
  const login = readFileSync('app/login/page.tsx', 'utf8');
  const oauthCall = ['signIn', 'With', 'OAuth'].join('');
  assert.ok(!login.includes(oauthCall) && !/google/i.test(login));
  assert.match(login, /signInWithPassword/);
  assert.equal(require('node:fs').existsSync(['app/auth/callback', 'goo' + 'gle'].join('/')), false);
  assert.doesNotMatch(readFileSync('lib/auth/callback.ts', 'utf8'), /oauth/i);
  assert.doesNotMatch(readFileSync('lib/i18n/index.tsx', 'utf8'), /googleContinue|oauthFailed/);
});

test('only the message list scrolls in the drawer; heading, warning and input stay visible (desktop and mobile)', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  assert.match(css, /\.simulator-drawer-body\{flex:1;min-block-size:0;overflow:hidden;display:flex;flex-direction:column;/);
  assert.match(css, /\.simulator-drawer-body \.simulator>\*\{flex:none\}/);
  assert.match(css, /\.simulator-drawer-body \.simulator>\.simulator-chat\{flex:1 1 auto;min-block-size:0;max-block-size:none;overflow-y:auto/);
  assert.match(css, /\.simulator-drawer\{position:fixed;inset-block-start:0;block-size:100dvh;max-block-size:100dvh;/);
  assert.match(readFileSync('app/layout.tsx', 'utf8'), /interactiveWidget: 'resizes-content'/);
  assert.match(css, /\.simulator-drawer-body \.simulator-compose\.field-action-row\{grid-template-columns:minmax\(0,1fr\) auto\}/);
  assert.match(css, /@media\(max-height:34rem\)\{\.simulator-drawer-body \.section-heading h2\+p\{display:none\}/);
});

test('cabinet texts about the assistant are neutral; the assistant name is only a standalone label', () => {
  const lines = dictionary.split('\n').filter(line => /Ле[яиюе]/.test(line));
  const pairs = lines.join('\n').match(/[A-Za-z0-9_]+:'[^']*Ле[яиюе][^']*'/g) ?? [];
  assert.deepEqual(pairs.map(p => p.split(':')[0]).sort(), ['feedbackSubject', 'feedbackTitle', 'loginSubtitle', 'signupSubtitle'], 'only product texts mention Leya');
  assert.doesNotMatch(dictionary, /WhatsApp отключён — Лея/);
  const simulator = readFileSync('components/tenant/conversation-simulator.tsx', 'utf8');
  assert.match(simulator, /useAssistantName\(\) \?\? t\('leyaResponder'\)/);
  assert.match(simulator, /t\('simulatorThinking', \{ name: assistantName \}\)/);
  assert.match(dictionary, /simulatorThinking:'\{name\} печатает…'/);
  assert.match(readFileSync('lib/tenant/assistant-name.ts', 'utf8'), /select\('assistant_name'\)/);
});
