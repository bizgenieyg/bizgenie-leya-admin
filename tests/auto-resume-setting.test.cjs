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
  assert.match(settings, /auto_resume_hours:Math\.min\(48,Math\.max\(1,/);
  assert.match(readFileSync('lib/tenant-settings/normalize.ts', 'utf8'), /auto_resume_hours:number\(raw\.auto_resume_hours,4\)/);
  const dictionary = readFileSync('lib/i18n/index.tsx', 'utf8');
  assert.equal((dictionary.match(/autoResumeHours:'/g) ?? []).length, 3);
  assert.equal((dictionary.match(/autoResumeHoursHelp:'/g) ?? []).length, 3);
  assert.doesNotMatch(dictionary.match(/autoResumeHours:'[^']*'/g).join(' '), /агент|тенант|эскалац|порог/i);
});
