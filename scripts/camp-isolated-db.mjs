import { PGlite } from '@electric-sql/pglite'
import { readdir, readFile } from 'node:fs/promises'

const migrations = new URL('../supabase/migrations/', import.meta.url)
export const reviewPlayers = {
  one: '80000000-0000-4000-8000-000000000001',
  two: '80000000-0000-4000-8000-000000000002',
  three: '80000000-0000-4000-8000-000000000003',
}

export async function isolatedCamp() {
  const db = new PGlite()
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.jwt() returns jsonb language sql stable as
      'select coalesce(nullif(current_setting(''request.jwt.claims'', true),''''),''{}'')::jsonb';
    create function auth.uid() returns uuid language sql stable as
      'select (auth.jwt()->>''sub'')::uuid';
  `)
  for (const id of Object.values(reviewPlayers)) await db.query('insert into auth.users values ($1)', [id])
  for (const file of (await readdir(migrations)).sort()) await db.exec(await readFile(new URL(file, migrations), 'utf8'))
  let tail = Promise.resolve()
  function as(role, identity, query, params = [], anonymous = true) {
    const task = tail.then(async () => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: identity, is_anonymous: anonymous })])
      if (role) await db.exec('set role ' + role)
      return db.query(query, params)
    })
    tail = task.catch(() => {})
    return task
  }
  const result = async (...args) => (await as(...args)).rows[0]?.result
  const name = (id, nickname) => result('authenticated', id, 'select public.rr_camp_nickname($1) as result', [nickname])
  const social = (user, action, camp, value, target) => result('authenticated', user,
    'select public.rr_camp_social($1,$2,$3,$4) as result', [action,camp ?? null,value ?? null,target ?? null])
  const board = (user, metric = 'score', offset = 0, scope = 'worldwide', camp = null) => result(user ? 'authenticated' : 'anon', user,
    'select public.rr_ranked_board($1,$2,$3,$4) as result', [metric,offset,scope,camp])
  const permit = (user, course = 'migration-30-phase-05') => result('authenticated', user,
    'select public.rr_ranked_ticket($1) as result', [course])
  const claim = (user, ticket, ticks) => result('service_role', null, 'select public.rr_ranked_claim($1,$2,$3) as result', [user,ticket,ticks])
  const commit = (user, ticket, lease, score) => result('service_role', null,
    'select public.rr_ranked_commit($1,$2,$3,$4) as result', [user,ticket,lease,score ? JSON.stringify(score) : null])
  return { db, as, result, name, social, board, permit, claim, commit }
}
