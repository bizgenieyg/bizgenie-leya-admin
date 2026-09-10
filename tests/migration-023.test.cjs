const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { PGlite } = require('@electric-sql/pglite');

const migration = readFileSync('tests/fixtures/023_create_tenant_with_owner.sql', 'utf8');
const owner = '10000000-0000-4000-8000-000000000001';
const admin = '10000000-0000-4000-8000-000000000002';
const viewer = '10000000-0000-4000-8000-000000000003';
const outsider = '10000000-0000-4000-8000-000000000004';

// Real PostgreSQL execution in memory; never connects to the deployed database.
test('023 transaction and RLS integration', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(readFileSync('tests/fixtures/onboarding-schema.sql', 'utf8'));
  await db.exec(readFileSync('tests/fixtures/022_tenant_users.sql', 'utf8'));
  await db.exec(`
    grant select, insert, update, delete on all tables in schema public to authenticated;
    alter table tenants enable row level security;
    create policy "Tenant members can SELECT tenants" on tenants for select to authenticated
      using (id in (select tenant_id from tenant_users where user_id = auth.uid()));
    -- Model the known bootstrap policies from backend 004, including its unsafe link grant.
    create policy "Authenticated users can create tenants" on tenants for insert to authenticated with check (true);
    create policy "Users can create own tenant links" on tenant_users for insert to authenticated with check (user_id = auth.uid());
    insert into auth.users values ('${owner}'), ('${admin}'), ('${viewer}'), ('${outsider}');
  `);
  const selects = () => db.query("select tablename, policyname, qual from pg_policies where schemaname='public' and cmd='SELECT' order by tablename, policyname");
  const beforeSelects = (await selects()).rows;
  await db.exec(migration);
  await db.exec(migration);
  assert.deepEqual((await selects()).rows, beforeSelects, 'SELECT policies unchanged after two applications');

  async function as(user, sql, params = [], role = 'authenticated') {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? '']);
    await db.exec(`set role ${role}`);
    try { return await db.query(sql, params); }
    finally { await db.exec('reset role'); }
  }
  const rpc = 'select public.create_tenant_with_owner($1,$2,$3,$4,$5,$6) as id';
  const args = [' Owner ', 'trial', ' Business ', 'ru', 'trial', new Date(Date.now() + 14 * 86400000).toISOString()];
  let tenant;
  await t.test('authenticated RPC creates owner, default profile and original modules atomically', async () => {
    tenant = (await as(owner, rpc, args)).rows[0].id;
    const business = (await db.query('select * from tenants where id=$1', [tenant])).rows[0];
    assert.equal(business.name, 'Owner');
    assert.equal(business.business_name, 'Business');
    assert.equal(business.tier, 'trial');
    assert.equal(business.language, 'ru');
    assert.equal(business.status, 'trial');
    const member = (await db.query('select user_id,role from tenant_users where tenant_id=$1', [tenant])).rows[0];
    assert.deepEqual(member, { user_id: owner, role: 'owner' });
    const profile = (await db.query('select assistant_name,tone from assistant_profiles where tenant_id=$1', [tenant])).rows[0];
    assert.deepEqual(profile, { assistant_name: 'Лея', tone: 'friendly_professional' });
    const modules = (await db.query('select module_name,enabled,limits from module_settings where tenant_id=$1 order by module_name', [tenant])).rows;
    assert.deepEqual(modules, [
      { module_name: 'escalation', enabled: true, limits: {} },
      { module_name: 'knowledge', enabled: true, limits: {} },
      { module_name: 'reports', enabled: true, limits: { report_frequency: 'weekly' } },
    ]);
  });
  await t.test('anonymous RPC and missing auth.uid are rejected', async () => {
    await assert.rejects(as(null, rpc, args, 'anon'), /permission denied/);
    await assert.rejects(as(null, rpc, args), /Authentication required/);
  });
  await t.test('a late failure rolls back tenant, membership and profile', async () => {
    const counts = () => db.query('select (select count(*) from tenants) as tenants, (select count(*) from tenant_users) as members, (select count(*) from assistant_profiles) as profiles');
    const before = (await counts()).rows;
    await db.exec("alter table module_settings add constraint test_failure check (module_name <> 'reports') not valid");
    await assert.rejects(as(owner, rpc, args), /test_failure/);
    assert.deepEqual((await counts()).rows, before);
    await db.exec('alter table module_settings drop constraint test_failure');
  });
  await db.query('insert into tenant_users (tenant_id,user_id,role) values ($1,$2,$3),($1,$4,$5)', [tenant, admin, 'admin', viewer, 'viewer']);
  const foreignTenant = (await as(outsider, rpc, ['Other', 'starter', 'Other', 'he', 'active', null])).rows[0].id;
  await t.test('direct tenant creation and membership forgery stay forbidden', async () => {
    for (const user of [owner, admin, viewer, outsider]) {
      await assert.rejects(as(user, "insert into tenants (name) values ('forbidden')"), /row-level security/);
    }
    await assert.rejects(as(viewer, "insert into tenant_users (tenant_id,user_id,role) values ($1,$2,'owner')", [foreignTenant, viewer]), /permission denied/);
    await assert.rejects(as(viewer, "update tenant_users set role='owner' where user_id=$1", [viewer]), /permission denied/);
  });
  const tables = {
    assistant_profiles: {}, clients: { phone: 'test-phone' }, client_profiles: {}, conversations: {},
    messages: { from_me: false }, knowledge_items: { type: 'faq', answer: 'answer' },
    module_settings: { module_name: 'test' }, usage_events: { event_type: 'test' },
    agent_actions: { action_type: 'test' }, scheduled_jobs: { job_type: 'test', scheduled_at: new Date().toISOString() },
  };
  for (const [table, values] of Object.entries(tables)) {
    await t.test(`${table}: owner/admin writes, viewer reads only, outsider cannot write`, async () => {
      // Remove only this fixture tenant's rows so unique keys do not mask RLS outcomes.
      await db.query(`delete from ${table} where tenant_id=$1`, [tenant]);
      const columns = ['tenant_id', ...Object.keys(values)];
      const parameters = [tenant, ...Object.values(values)];
      const insert = `insert into ${table} (${columns.join(',')}) values (${columns.map((_, i) => '$' + (i + 1)).join(',')}) returning id`;
      await assert.rejects(as(viewer, insert, parameters), /row-level security/);
      await assert.rejects(as(outsider, insert, parameters), /row-level security/);
      const id = (await as(owner, insert, parameters)).rows[0].id;
      assert.equal((await as(viewer, `select id from ${table} where id=$1`, [id])).rows.length, 1);
      for (const user of [viewer, outsider]) {
        assert.equal((await as(user, `update ${table} set tenant_id=tenant_id where id=$1 returning id`, [id])).rows.length, 0);
        assert.equal((await as(user, `delete from ${table} where id=$1 returning id`, [id])).rows.length, 0);
      }
      for (const user of [owner, admin]) {
        assert.equal((await as(user, `update ${table} set tenant_id=tenant_id where id=$1 returning id`, [id])).rows.length, 1);
        await assert.rejects(as(user, `update ${table} set tenant_id=$1 where id=$2`, [foreignTenant, id]), /row-level security/);
      }
      assert.equal((await as(admin, `delete from ${table} where id=$1 returning id`, [id])).rows.length, 1);
      const newId = (await as(admin, insert, parameters)).rows[0].id;
      assert.equal((await as(owner, `delete from ${table} where id=$1 returning id`, [newId])).rows.length, 1);
    });
  }
  await t.test('tenants update/delete role checks and unchanged viewer SELECT', async () => {
    assert.equal((await as(viewer, 'select id from tenants where id=$1', [tenant])).rows.length, 1);
    for (const user of [viewer, outsider]) {
      assert.equal((await as(user, 'update tenants set name=name where id=$1 returning id', [tenant])).rows.length, 0);
      assert.equal((await as(user, 'delete from tenants where id=$1 returning id', [tenant])).rows.length, 0);
    }
    for (const user of [owner, admin]) assert.equal((await as(user, 'update tenants set name=name where id=$1 returning id', [tenant])).rows.length, 1);
    assert.equal((await as(admin, 'delete from tenants where id=$1 returning id', [tenant])).rows.length, 1);
  });
  await t.test('other permissive policies cannot reopen viewer writes or tenant INSERT', async () => {
    await db.exec('create policy legacy_insert on knowledge_items for insert to authenticated with check(true); create policy legacy_tenant_insert on tenants for insert to authenticated with check(true)');
    await assert.rejects(as(viewer, "insert into knowledge_items (tenant_id,type,answer) values ($1,'faq','forbidden')", [foreignTenant]), /row-level security/);
    await assert.rejects(as(owner, "insert into tenants (name) values ('forbidden')"), /row-level security/);
  });
});
