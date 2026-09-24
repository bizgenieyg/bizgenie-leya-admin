const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

test('polish toggle is owner-editable with the agreed label in all cabinet languages', () => {
  const fields = readFileSync('lib/tenant-settings/fields.ts', 'utf8');
  const settings = readFileSync('components/tenant/tenant-settings.tsx', 'utf8');
  const dictionary = readFileSync('lib/i18n/index.tsx', 'utf8');
  assert.match(fields, /export const editable = \[[^\]]*'polish_owner_answer'/);
  assert.doesNotMatch(fields.split('export const operatorOnly')[1], /polish_owner_answer/);
  assert.match(settings, /polish_owner_answer:s\.polish_owner_answer/);
  assert.match(settings, /t\('polishOwnerAnswers'\)/);
  assert.match(dictionary, /polishOwnerAnswers:'Оформлять мои ответы клиентам'/);
  for (const locale of ['Ru', 'En', 'He']) assert.match(dictionary, new RegExp(`\\.\\.\\.ownerAnswer${locale}`));
  assert.match(readFileSync('lib/tenant-settings/normalize.ts', 'utf8'), /polish_owner_answer:raw\.polish_owner_answer!==false/);
});

test('escalated simulator reply offers an owner answer field that calls the shared backend route', () => {
  const component = readFileSync('components/tenant/conversation-simulator.tsx', 'utf8');
  const route = readFileSync('app/api/simulator/owner-answer/route.ts', 'utf8');
  assert.match(component, /awaitingOwner: result\.outcome === 'escalated'/);
  assert.match(component, /fetch\('\/api\/simulator\/owner-answer'/);
  assert.match(component, /t\('simulatorOwnerAnswerPlaceholder'\)/);
  assert.match(route, /\/api\/admin\/simulator\/owner-answer/);
  assert.match(route, /simulator_no_question'\?'simulatorNoQuestion'/);
  assert.doesNotMatch(route, /data\.message|data\.error\b/);
});
