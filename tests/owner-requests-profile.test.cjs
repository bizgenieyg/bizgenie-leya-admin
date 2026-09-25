const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

test('client card shows what Leya knows, read-only, next to the owner notes', () => {
  const card = readFileSync('components/tenant/client-directory.tsx', 'utf8');
  assert.match(card, /t\('ownerNote'\)[\s\S]*t\('leyaProfileTitle'\)/);
  const block = card.slice(card.indexOf("t('leyaProfileTitle')"), card.indexOf("t('leyaProfileEmpty')"));
  assert.doesNotMatch(block, /textarea|onBlur|save\(/, 'profile is never editable from the cabinet');
});

test('dashboard summary lists unanswered requests separately', () => {
  const summary = readFileSync('components/tenant/owner-summary.tsx', 'utf8');
  assert.match(summary, /open_requests\?:Array<\{name:string;summary:string\}>/);
  assert.match(summary, /t\('openRequests'\)/);
});

test('discovery questions are an owner setting edited on the assistant page (≤10 × 200 chars)', () => {
  assert.match(readFileSync('lib/tenant-settings/fields.ts', 'utf8'), /export const editable = \[[^\]]*'client_discovery_questions'/);
  const editor = readFileSync('components/tenant/discovery-questions.tsx', 'utf8');
  assert.match(editor, /MAX_QUESTIONS = 10, MAX_CHARS = 200/);
  assert.match(editor, /client_discovery_questions: questions/);
  assert.match(readFileSync('app/admin/assistant/page.tsx', 'utf8'), /<DiscoveryQuestions\/>/);
  const dictionary = readFileSync('lib/i18n/index.tsx', 'utf8');
  for (const locale of ['Ru', 'En', 'He']) assert.match(dictionary, new RegExp(`\\.\\.\\.taskI${locale}`));
  const ru = dictionary.slice(dictionary.indexOf('const taskIRu='), dictionary.indexOf('const taskIEn'));
  assert.doesNotMatch(ru, /агент|тенант|эскалац|порог/i);
});
