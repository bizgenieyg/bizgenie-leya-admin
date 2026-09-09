const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { PGlite } = require('@electric-sql/pglite');

const userA = '10000000-0000-4000-8000-000000000001';
const userB = '10000000-0000-4000-8000-000000000002';

async function as(db, user, sql, params = [], role = 'authenticated') {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? '']);
  await db.exec(`set role ${role}`);
  try { return await db.query(sql, params); }
  finally { await db.exec('reset role'); }
}

// Real PostgreSQL in memory; never touches the deployed database.
test('024 forces the system plan and caps businesses per account', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(readFileSync('tests/fixtures/onboarding-schema.sql', 'utf8'));
  await db.exec(readFileSync('022_tenant_users.sql', 'utf8'));
  await db.exec(`
    grant select, insert, update, delete on all tables in schema public to authenticated;
    alter table tenants enable row level security;
    create policy "Tenant members can SELECT tenants" on tenants for select to authenticated
      using (id in (select tenant_id from tenant_users where user_id = auth.uid()));
    create policy "Authenticated users can create tenants" on tenants for insert to authenticated with check (true);
    create policy "Users can create own tenant links" on tenant_users for insert to authenticated with check (user_id = auth.uid());
    insert into auth.users values ('${userA}'), ('${userB}');
  `);
  await db.exec(readFileSync('023_create_tenant_with_owner.sql', 'utf8'));
  await db.exec(readFileSync('024_tenant_provisioning_limits.sql', 'utf8'));
  await db.exec(readFileSync('024_tenant_provisioning_limits.sql', 'utf8')); // idempotent

  const rpc = 'select public.create_tenant_with_owner($1,$2,$3) as id';

  await t.test('the 6-arg plan-taking signature from 023 is gone', async () => {
    await assert.rejects(
      as(db, userA, "select public.create_tenant_with_owner('n','pro','b','ru','active',null)"),
      /does not exist/,
    );
  });

  await t.test('new tenant is always the system starter plan, active, no trial', async () => {
    const id = (await as(db, userA, rpc, [' Anna ', ' Studio ', 'ru'])).rows[0].id;
    const row = (await db.query('select name,business_name,language,tier,status,trial_ends_at from tenants where id=$1', [id])).rows[0];
    assert.deepEqual(row, { name: 'Anna', business_name: 'Studio', language: 'ru', tier: 'starter', status: 'active', trial_ends_at: null });
    assert.deepEqual((await db.query('select user_id,role from tenant_users where tenant_id=$1', [id])).rows[0], { user_id: userA, role: 'owner' });
  });

  await t.test('a non-starter default can only be set by an operator via system_config', async () => {
    await db.query("update public.system_config set value = '\"pro\"'::jsonb where key = 'signup_default_plan'");
    await db.query("update public.system_config set value = '5'::jsonb where key = 'max_tenants_per_owner'");
    const id = (await as(db, userB, rpc, ['B', 'B', 'en'])).rows[0].id;
    assert.equal((await db.query('select tier from tenants where id=$1', [id])).rows[0].tier, 'pro');
    await db.query("update public.system_config set value = '\"starter\"'::jsonb where key = 'signup_default_plan'");
    await db.query("update public.system_config set value = '1'::jsonb where key = 'max_tenants_per_owner'");
  });

  await t.test('a second business for the same account is rejected with a clear error', async () => {
    await assert.rejects(
      as(db, userA, rpc, ['Anna', 'Second studio', 'ru']),
      (err) => err.code === '54000' && /limit reached/i.test(err.message),
    );
    assert.equal((await db.query('select count(*)::int as n from tenant_users where user_id=$1 and role=$2', [userA, 'owner'])).rows[0].n, 1);
  });

  await t.test('system_config is not accessible to authenticated clients', async () => {
    await assert.rejects(as(db, userA, 'select key from public.system_config'), /permission denied/);
  });
});
