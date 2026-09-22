const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');

test('groups screen is tenant-proxied, read-only and present in five-item navigation',()=>{
  const route=fs.readFileSync('app/api/groups/route.ts','utf8');
  const page=fs.readFileSync('app/admin/groups/page.tsx','utf8');
  const directory=fs.readFileSync('components/tenant/group-directory.tsx','utf8');
  const shell=fs.readFileSync('components/ui/app-shell.tsx','utf8');
  const css=fs.readFileSync('app/globals.css','utf8');
  assert.match(route,/tenantBackend\(request\)/);
  assert.match(route,/\/api\/admin\/groups/);
  assert.match(page,/groupsInfo/);
  assert.match(directory,/participantsCount/);
  assert.doesNotMatch(directory,/(?:POST|PATCH|DELETE)/);
  assert.match(shell,/href: '\/admin\/groups'/);
  assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});

test('new dashboard copy is translated in all cabinet languages',()=>{
  const dictionary=fs.readFileSync('lib/i18n/index.tsx','utf8');
  for(const key of ['groupsNav','groupsTitle','groupsInfo','groupMembers','groupsLoadError','feedbackTitle','feedbackAction','ownerPhoneFormat','qrNumberRisk']){
    assert.equal((dictionary.match(new RegExp(`${key}:`,'g'))||[]).length,3,key);
  }
});

test('dashboard components no longer use recolored Tailwind palette classes',()=>{
  const paths=['app','components'];
  for(const root of paths){
    const files=[];
    const visit=path=>{for(const entry of fs.readdirSync(path,{withFileTypes:true})){const value=`${path}/${entry.name}`;entry.isDirectory()?visit(value):entry.name.endsWith('.tsx')&&files.push(value);}};
    visit(root);
    for(const file of files)assert.doesNotMatch(fs.readFileSync(file,'utf8'),/(?:bg|text|border|ring)-(?:blue|gray|green|red|yellow|amber|purple|white)-?\d*/,file);
  }
});
