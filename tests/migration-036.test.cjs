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

async function setup() {
  const db = new PGlite();
  await db.exec(readFileSync('tests/fixtures/onboarding-schema.sql', 'utf8'));
  await db.exec(readFileSync('tests/fixtures/022_tenant_users.sql', 'utf8'));
  await db.exec(`
    grant select, insert, update, delete on all tables in schema public to authenticated;
    alter table tenants enable row level security;
    create policy "Tenant members can SELECT tenants" on tenants for select to authenticated
      using (id in (select tenant_id from tenant_users where user_id = auth.uid()));
    create policy "Authenticated users can create tenants" on tenants for insert to authenticated with check (true);
    create policy "Users can create own tenant links" on tenant_users for insert to authenticated with check (user_id = auth.uid());
    insert into auth.users values ('${userA}'), ('${userB}');
  `);
  await db.exec(readFileSync('tests/fixtures/023_create_tenant_with_owner.sql', 'utf8'));
  await db.exec(readFileSync('tests/fixtures/034_tenant_provisioning_limits.sql', 'utf8'));
  await db.exec(readFileSync('tests/fixtures/036_tenant_creation_advisory_lock.sql', 'utf8'));
  await db.exec(readFileSync('tests/fixtures/036_tenant_creation_advisory_lock.sql', 'utf8')); // idempotent
  return db;
}

const rpc = 'select public.create_tenant_with_owner($1,$2,$3) as id';

test('036 create_tenant_with_owner takes a per-user advisory lock for the transaction', async (t) => {
  const db = await setup();
  t.after(() => db.close());
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userA]);
  await db.exec('set role authenticated');
  await db.exec('begin');
  await db.query(rpc, ['Anna', 'Studio', 'ru']);
  const locks = await db.query(
    "select count(*)::int as n from pg_locks where locktype = 'advisory' and pid = pg_backend_pid()");
  assert.ok(locks.rows[0].n >= 1, 'an advisory lock is held for the duration of the transaction');
  await db.exec('rollback');
  await db.exec('reset role');
  // Rolled back -> no tenant persisted.
  assert.equal((await db.query('select count(*)::int as n from tenants')).rows[0].n, 0);
});

test('036 two concurrent create calls by one user -> exactly one succeeds, the other gets 54000', async (t) => {
  // PGlite is single-connection, so it serialises these two calls the same way the advisory
  // lock serialises them across real connections. The asserted contract — exactly one
  // success, the loser gets errcode 54000 — is what the lock guarantees under true
  // parallelism; without the count/insert being inside the lock, both could read 0 and win.
  const db = await setup();
  t.after(() => db.close());
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userA]);
  await db.exec('set role authenticated');

  const results = await Promise.allSettled([
    db.query(rpc, ['Anna', 'First', 'ru']),
    db.query(rpc, ['Anna', 'Second', 'ru']),
  ]);
  await db.exec('reset role');

  const ok = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');
  assert.equal(ok.length, 1, 'exactly one call creates a business');
  assert.equal(failed.length, 1, 'the other call is rejected');
  assert.equal(failed[0].reason.code, '54000');
  assert.match(failed[0].reason.message, /limit reached/i);

  assert.equal(
    (await db.query('select count(*)::int as n from tenant_users where user_id=$1 and role=$2', [userA, 'owner'])).rows[0].n,
    1, 'only one owner membership exists for the account');
  assert.equal((await db.query('select count(*)::int as n from tenants')).rows[0].n, 1);

  // The lock key is per-user (hashtextextended over the uid), so another account is
  // unaffected and still succeeds.
  const other = await as(db, userB, rpc, ['B', 'B biz', 'en']);
  assert.ok(other.rows[0].id);
});
