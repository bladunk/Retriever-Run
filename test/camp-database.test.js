import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'

const migration = await readFile(new URL('../supabase/migrations/202611220001_worldwide_camp.sql', import.meta.url), 'utf8')
const rivalsMigration = await readFile(new URL('../supabase/migrations/202611220002_camp_rivals.sql', import.meta.url), 'utf8')
const one = '10000000-0000-4000-8000-000000000001'
const two = '10000000-0000-4000-8000-000000000002'
const three = '10000000-0000-4000-8000-000000000003'

test('the camp migration enforces anonymous ownership, validates results and exposes bounded rankings', async t => {
  const db = new PGlite()
  try {
    // Model Supabase's API database roles and auth claim helpers. The SQL below
    // this fixture is the production migration, run by an actual PostgreSQL engine.
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.jwt() returns jsonb language sql stable as
        'select coalesce(nullif(current_setting(''request.jwt.claims'', true),''''),''{}'')::jsonb';
      create function auth.uid() returns uuid language sql stable as
        'select (auth.jwt()->>''sub'')::uuid';
      insert into auth.users values ('${one}'), ('${two}'), ('${three}');
    `)
    await db.exec(migration)
    await db.exec(rivalsMigration)
    const as = async (role, user, anonymous = true) => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: user, is_anonymous: anonymous })])
      if (role) await db.exec('set role ' + role)
    }
    const value = async (query, args) => (await db.query(query, args)).rows[0].result
    const board = (metric = 'score', offset = 0, limit = 25) => value('select public.rr_camp_board($1, $2, $3) as result', [metric, offset, limit])
    const nickname = name => value('select public.rr_camp_nickname($1) as result', [name])
    const rival = (metric = 'score', name = null, at = null) =>
      value('select public.rr_camp_rival($1, $2, $3) as result', [metric, name, at])
    const post = (runId, score = 335, distance = 45, retrieves = 1, durationMs = 4000) =>
      value('select public.rr_camp_submit($1, $2, $3, $4, $5) as result', [runId, score, distance, retrieves, durationMs])
    const recorded = randomUUID()

    await t.test('rival lookup is gated to an anonymous member and handles empty standings', async () => {
      await as('anon')
      await assert.rejects(rival(), /permission denied/)
      await as('authenticated', one, false)
      assert.equal((await rival()).status, 'auth_required')
      await as('authenticated', one)
      assert.deepEqual(await rival(), { status: 'ok', mine: null, rival: null, passed: null })
      assert.equal((await rival('score;drop table')).status, 'invalid_metric')
    })

    await t.test('public readers see a genuinely empty board and cannot access tables or write functions', async () => {
      await as('anon')
      assert.deepEqual(await board(), { status: 'ok', rows: [], mine: null, has_more: false })
      await assert.rejects(post(randomUUID()), /permission denied/)
      await assert.rejects(nickname('Field Dog'), /permission denied/)
      await assert.rejects(db.exec('select * from retriever_camp.players'), /permission denied/)
      await as('authenticated', one, false)
      assert.equal((await nickname('Field Dog')).status, 'auth_required')
      assert.equal((await post(randomUUID())).status, 'auth_required')
      await as('authenticated', one)
      await assert.rejects(db.exec('update retriever_camp.players set score = 999999'), /permission denied/)
      await assert.rejects(db.exec('select * from retriever_camp.receipts'), /permission denied/)
      await as(null)
      const enabled = await db.query(`select relname, relrowsecurity from pg_class join pg_namespace n on n.oid = relnamespace
        where n.nspname = 'retriever_camp' and relkind = 'r' order by relname`)
      assert.deepEqual(enabled.rows, [{ relname: 'players', relrowsecurity: true }, { relname: 'receipts', relrowsecurity: true }])
    })

    await t.test('names are moderated, unique, claimable only by the caller, and rate limited for edits', async () => {
      await as('authenticated', one)
      assert.equal((await post(randomUUID())).status, 'profile_required')
      for (const name of [null, 'a', 'A'.repeat(21), 'Admin', 'Wild<script>', 'F-u-c-k', 'Français']) {
        assert.equal((await nickname(name)).status, 'invalid_name')
      }
      assert.deepEqual(await nickname('  Moss   Runner   '), { status: 'ok', nickname: 'Moss Runner' })
      assert.equal((await nickname('Moss Runner')).status, 'ok')
      assert.equal((await nickname('Cedar Dog')).status, 'rename_wait')
      await as('authenticated', two)
      assert.equal((await nickname('moss runner')).status, 'name_taken')
      assert.equal((await nickname('Pond Scout')).status, 'ok')
      assert.equal((await board()).rows.length, 0)
    })

    await t.test('rejects malformed runs and accepts only independent improvements under an idempotency key', async () => {
      await as('authenticated', one)
      for (const tuple of [
        [randomUUID(), null, 45, 1, 4000], [randomUUID(), 33, 45, 1, 4000],
        [randomUUID(), 10000, 45, 1, 4000], [randomUUID(), 335, 45, 1, 14400001],
        [randomUUID(), 335, 45, -1, 4000], [randomUUID(), 335, 90, 0, 4000],
        [randomUUID(), 335, 45, 50, 4000], [randomUUID(), 334, 45, 1, 4000],
        ['00000000-0000-0000-0000-000000000000', 335, 45, 1, 4000],
      ]) assert.equal((await post(...tuple)).status, 'invalid_run')
      assert.deepEqual(await post(recorded), { status: 'ok', score: 335, distance: 45, retrieves: 1 })
      assert.deepEqual(await post(recorded, 415), { status: 'duplicate', score: 335, distance: 45, retrieves: 1 })
      const first = await board()
      assert.equal(first.mine.rank, 1)
      assert.deepEqual(await post(randomUUID(), 299, 119, 2, 10000),
        { status: 'ok', score: 335, distance: 119, retrieves: 2 })
      assert.equal((await board()).mine.recorded_at, first.mine.recorded_at)
      await as('authenticated', two)
      assert.equal((await post(recorded, 415)).status, 'invalid_run')
      assert.equal((await board()).mine, null)
      assert.equal((await post(randomUUID(), 435, 45)).status, 'ok')
      await as('authenticated', one)
      assert.equal((await board()).mine.rank, 2)
      assert.equal((await board('distance')).mine.rank, 1)
      assert.equal((await board('retrieves')).mine.rank, 1)
    })

    await t.test('rate limits new receipts while acknowledging retries, with RLS enforced over any stray grants', async () => {
      await as('authenticated', one)
      for (let i = 0; i < 10; i++) assert.equal((await post(randomUUID())).status, 'ok')
      assert.equal((await post(randomUUID())).status, 'rate_limited')
      assert.equal((await post(recorded)).status, 'duplicate')
      await as(null)
      assert.equal((await db.query('select count(*)::integer n from retriever_camp.receipts')).rows[0].n, 13)
      await db.exec(`grant usage on schema retriever_camp to authenticated;
        grant select, update, insert on all tables in schema retriever_camp to authenticated`)
      await as('authenticated', two)
      assert.equal((await db.query('select * from retriever_camp.players')).rows.length, 0)
      assert.equal((await db.query('update retriever_camp.players set score = 1 returning score')).rows.length, 0)
      await assert.rejects(db.exec(`insert into retriever_camp.players (player_id,nickname,renamed_at)
        values ('${three}','Fraud',now())`), /row-level security/)
      await as(null)
      await db.exec('revoke usage on schema retriever_camp from authenticated; revoke all on all tables in schema retriever_camp from authenticated')
    })

    await t.test('all three rankings are deterministic, paginate to 100 and reveal no identities', async () => {
      await as(null)
      await db.exec(`
        insert into auth.users
        select ('20000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid from generate_series(1,104) n;
        insert into retriever_camp.players (player_id, nickname, renamed_at, score, distance, retrieves, score_at, distance_at, retrieves_at)
        select id, 'Field ' || right(id::text,3), now(), 1234, 345, 3,
          '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'
        from auth.users where id::text like '20000000%';
        update retriever_camp.players set score_at = '2025-12-31T00:00:00Z' where nickname = 'Field 004';
      `)
      await as('anon')
      assert.equal((await board('unknown')).status, 'invalid_metric')
      const first = await board('score', -10, 99999)
      assert.equal(first.rows.length, 25)
      assert.equal(first.rows[0].nickname, 'Field 004')
      assert.equal(first.rows[1].nickname, 'Field 001')
      assert.equal(first.rows[2].nickname, 'Field 002')
      assert.deepEqual(Object.keys(first.rows[0]).sort(), ['distance', 'nickname', 'rank', 'recorded_at', 'retrieves', 'score'])
      assert.equal(first.has_more, true)
      assert.equal((await board('distance', 25)).rows[0].rank, 26)
      for (const metric of ['score', 'distance', 'retrieves']) {
        const tail = await board(metric, 98)
        assert.deepEqual(tail.rows.map(row => row.rank), [99, 100])
        assert.equal(tail.has_more, false)
        assert.equal((await board(metric, 100)).rows.length, 0)
      }
      await as('authenticated', one)
      assert.ok((await board()).mine.rank > 100)
    })

    await t.test('rivals match the real predecessor across page limits and exact ties in each category', async () => {
      const id = n => '20000000-0000-4000-8000-' + String(n).padStart(12, '0')
      await as('authenticated', id(104))
      for (const metric of ['score', 'distance', 'retrieves']) {
        const lookup = await rival(metric)
        assert.deepEqual(lookup.mine, (await board(metric)).mine)
        assert.equal(lookup.mine.rank, 104)
        assert.equal(lookup.rival.rank, 103)
        assert.equal(lookup.rival.nickname, 'Field 103')
        assert.deepEqual(Object.keys(lookup.rival).sort(), ['distance', 'nickname', 'rank', 'recorded_at', 'retrieves', 'score'])
      }
      await as('authenticated', id(4))
      assert.deepEqual(await rival(), { status: 'ok', mine: (await board()).mine, rival: null, passed: null })
      await as('authenticated', id(2))
      assert.equal((await rival()).rival.nickname, 'Field 001')
      await as('authenticated', one)
      const before = await rival()
      assert.equal(before.mine.nickname, 'Moss Runner')
      assert.equal(before.rival.nickname, 'Pond Scout')
      assert.equal((await rival('score', before.rival.nickname, before.rival.recorded_at)).passed, false)
      await as(null)
      await db.exec(`update retriever_camp.players set score = 445, score_at = now() where player_id = '${one}'`)
      await as('authenticated', one)
      const after = await rival('score', before.rival.nickname, before.rival.recorded_at)
      assert.equal(after.passed, true)
      assert.ok(after.mine.rank < before.mine.rank)
      assert.equal(after.rival.nickname, 'Field 104')
      assert.equal((await rival('score', before.rival.nickname, '2025-01-01T00:00:00Z')).passed, null)
      await as(null)
      await db.exec("update retriever_camp.players set nickname = 'Renamed Scout' where nickname = 'Pond Scout'")
      await as('authenticated', one)
      assert.equal((await rival('score', before.rival.nickname, before.rival.recorded_at)).passed, null)
    })
  } finally { await db.close() }
})
