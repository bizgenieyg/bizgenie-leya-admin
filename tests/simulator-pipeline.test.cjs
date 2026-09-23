const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

test('simulator renders the client reply and localized outcome notices without internal routing', () => {
  const component = readFileSync('components/tenant/conversation-simulator.tsx', 'utf8');
  const dictionary = readFileSync('lib/i18n/index.tsx', 'utf8');
  assert.match(component, /text: result\.reply \?\? ''/);
  for (const key of ['simulatorEscalatedNote', 'simulatorQuietHoursNote', 'simulatorPausedNote', 'simulatorTariffLimitNote']) {
    assert.match(component, new RegExp(`t\\('${key}'`));
    for (const locale of ['Ru', 'En', 'He']) assert.match(dictionary, new RegExp(`simulatorPipeline${locale}`));
  }
  assert.doesNotMatch(component, /json\.agent|json\.source|result\.agent|result\.source/);
  assert.match(dictionary, /Здесь Лея передала бы вопрос вам/);
});
