const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const routes = [];
(function walk(dir) { for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (name === 'route.ts') routes.push(path); } })('app/api');

test('every mutating cabinet API route rejects cross-origin requests before touching the backend', () => {
  const proxy = readFileSync('lib/backend/tenant-proxy.ts', 'utf8');
  assert.match(proxy, /isMutation\(request\)&&!isSameOrigin\(request\)/);
  const waha = readFileSync('lib/waha/proxy.ts', 'utf8');
  assert.match(waha, /headers\.get\('origin'\) !== expectedOrigin\.origin/);
  const mutating = routes.filter(file => /export (async function|const) (POST|PATCH|PUT|DELETE)\b/.test(readFileSync(file, 'utf8')));
  assert.ok(mutating.length >= 16);
  for (const file of mutating) {
    const source = readFileSync(file, 'utf8');
    const guarded = /headers\.get\('origin'\)\s*!==/.test(source) || /isSameOrigin\(request\)/.test(source) || /tenantBackend\(request/.test(source) || /proxyWaha\(request/.test(source);
    assert.ok(guarded, `${file} has no same-origin guard`);
  }
  assert.match(readFileSync('app/api/simulator/owner-answer/route.ts', 'utf8'), /tenantBackend\(request\)/);
});

test('WhatsApp disconnect banner uses theme tokens, not literal colors', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  assert.doesNotMatch(css, /#b73535/i);
  assert.match(css, /\.whatsapp-alert \{ border: 0\.125rem solid var\(--danger\); background: var\(--danger-soft\)/);
});
