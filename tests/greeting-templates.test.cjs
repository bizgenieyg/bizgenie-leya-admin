const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

test('greeting templates are an owner field on the assistant page with defaults and a reset button', () => {
  assert.match(readFileSync('lib/tenant-settings/fields.ts', 'utf8'), /export const editable = \[[^\]]*'greeting_templates'/);
  assert.match(readFileSync('app/api/tenant-settings/route.ts', 'utf8'), /'greeting_template_defaults'/);
  const ui = readFileSync('components/tenant/greeting-templates.tsx', 'utf8');
  assert.match(ui, /KEYS = \['client\.greeting', 'client\.greeting_known'\]/);
  assert.match(ui, /LANGS = \['ru', 'he', 'en'\]/);
  assert.match(ui, /t\('greetingReset'\)/);
  assert.match(ui, /setDirty\('greetings'/);
  assert.match(readFileSync('app/admin/assistant/page.tsx', 'utf8'), /<GreetingTemplates\/>/);
  const dictionary = readFileSync('lib/i18n/index.tsx', 'utf8');
  for (const locale of ['Ru', 'En', 'He']) assert.match(dictionary, new RegExp(`\\.\\.\\.taskN${locale}[,}]`));
  assert.match(dictionary, /greetingReset:'Вернуть по умолчанию'/);
});
