const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

test('dashboard feedback is a real localized form and no longer opens an empty email',()=>{
  const page=fs.readFileSync('app/admin/page.tsx','utf8');
  const form=fs.readFileSync('components/tenant/feedback-card.tsx','utf8');
  assert.match(page,/FeedbackCard/);
  assert.doesNotMatch(page,/mailto:/);
  assert.match(form,/fetch\('\/api\/feedback'/);
  assert.match(form,/method:'POST'/);
  assert.match(form,/maxLength=\{2000\}/);
  assert.match(form,/role="status"/);
  assert.match(form,/role="alert"/);
});

test('feedback proxy is owner-only, same-origin and tenant-derived',()=>{
  const route=fs.readFileSync('app/api/feedback/route.ts','utf8');
  assert.match(route,/tenantBackend\(request,\['owner'\]\)/);
  assert.match(route,/request\.headers\.get\('origin'\)!==expected\.origin/);
  assert.match(route,/auth\.call\('\/api\/admin\/feedback'/);
  assert.doesNotMatch(route,/tenantId.*body/);
});

test('feedback states are translated in all cabinet languages',()=>{
  const dictionary=fs.readFileSync('lib/i18n/index.tsx','utf8');
  for(const key of ['feedbackPlaceholder','feedbackSending','feedbackSuccess','feedbackError','feedbackInvalid'])assert.equal((dictionary.match(new RegExp(`${key}:`,'g'))||[]).length,3,key);
});
