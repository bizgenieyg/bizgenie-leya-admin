const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

test('auto_resume_hours is an owner setting (1–48, default 4) with labels in all cabinet languages', () => {
  const fields = readFileSync('lib/tenant-settings/fields.ts', 'utf8');
  assert.match(fields, /export const editable = \[[^\]]*'auto_resume_hours'/);
  assert.doesNotMatch(fields.split('export const operatorOnly')[1].split('export const system')[0], /'auto_resume_hours'/);
  for (const key of ['lid_lookup_timeout_seconds', 'lid_backfill_pause_ms', 'knowledge_full_context_chars', 'knowledge_unit_max_chars', 'knowledge_similarity_floor'])
    assert.match(fields.split('export const operatorOnly')[1], new RegExp(`'${key}'`));
  const settings = readFileSync('components/tenant/tenant-settings.tsx', 'utf8');
  assert.match(settings, /min=\{1\} max=\{48\}/);
  // Z9: saved with the other settings; 1–48 checked before the save, a whole number is sent.
  const draft = readFileSync('lib/tenant-settings/draft.ts', 'utf8');
  assert.match(draft, /draft\.auto_resume_hours<1\|\|draft\.auto_resume_hours>48/);
  assert.match(draft, /patch\.auto_resume_hours=Math\.round\(Number\(draft\.auto_resume_hours\)\)/);
  assert.match(readFileSync('lib/tenant-settings/normalize.ts', 'utf8'), /auto_resume_hours:number\(raw\.auto_resume_hours,4\)/);
  const dictionary = readFileSync('lib/i18n/index.tsx', 'utf8');
  // Z9: «Ассистент снова отвечает через [N] ч после вашего ответа» in all three languages.
  for (const key of ['z9ResumeBefore', 'z9ResumeAfter', 'z9ResumeLabel']) assert.equal((dictionary.match(new RegExp(`"${key}":"`, 'g')) ?? []).length, 3);
  assert.doesNotMatch(dictionary.match(/"z9Resume[A-Za-z]+":"[^"]*"/g).join(' '), /агент|тенант|эскалац|порог/i);
});
