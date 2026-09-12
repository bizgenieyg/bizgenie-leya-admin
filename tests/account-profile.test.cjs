const assert=require('node:assert/strict');
const{readFileSync}=require('node:fs');
const{test}=require('node:test');

test('user menu exposes profile and server-backed logout on desktop and mobile',()=>{
 const shell=readFileSync('components/ui/app-shell.tsx','utf8'),logout=readFileSync('app/api/auth/logout/route.ts','utf8');
 assert.match(shell,/className="side-foot"[^>]*aria-haspopup="menu"/);
 assert.match(shell,/className="user-menu-wrap mobile-user-menu"/);
 assert.match(shell,/href="\/admin\/profile"/);
  assert.match(shell,/fetch\('\/api\/auth\/logout',\{method:'POST'\}\)/);
  assert.match(shell,/onAuthStateChange/);
 assert.match(logout,/createClient\(\)\.auth\.signOut\(\)/);
});

test('profile verifies current password before update and can close other sessions',()=>{
 const source=readFileSync('components/tenant/profile-panel.tsx','utf8');
 const verify=source.indexOf('signInWithPassword'),update=source.indexOf('updateUser');
 assert.ok(verify>=0&&update>verify);
 assert.match(source,/signOut\(\{scope:'others'\}\)/);
 assert.match(source,/result\.error\.code==='weak_password'/);
 assert.match(source,/password!==repeat/);
});

test('profile is protected and expired sessions return to login with a clear reason',()=>{
 const middleware=readFileSync('middleware.ts','utf8'),page=readFileSync('app/admin/profile/page.tsx','utf8'),login=readFileSync('app/login/page.tsx','utf8');
 assert.match(middleware,/matcher: \['\/admin\/:path\*'/);
 assert.match(middleware,/\?error=session_expired/);
 assert.match(page,/redirect\('\/login\?error=session_expired'\)/);
 assert.match(login,/reason === 'session_expired'/);
});
