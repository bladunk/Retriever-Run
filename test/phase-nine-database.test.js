import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { isolatedCamp, reviewPlayers } from '../scripts/camp-isolated-db.mjs'
import { huntHandler } from '../supabase/functions/verify-hunt/handler.js'

const { one, two, three } = reviewPlayers
const course = 'migration-30-phase-05'
const season = 'great-migration-1'

test('Phase 09 migrations impose PostgreSQL role, ownership and namespace restrictions', async t => {
  const env = await isolatedCamp()
  const { as, result, name, social, board, permit, claim, commit } = env
  t.after(() => env.db.close())

  for (const [id, nickname] of [[one, 'Marsh Runner'], [two, 'Cedar Scout'], [three, 'Delta Guide']]) {
    assert.equal((await name(id, nickname)).status, 'ok')
  }

  await t.test('starts closed, hides direct writes, and preserves the legacy API', async () => {
    assert.equal((await permit(one)).status, 'closed')
    assert.deepEqual((await board(null)).rows, [])
    assert.equal((await result('anon',null,'select public.rr_camp_board($1,0,25) as result',['score'])).status,'ok')
    await assert.rejects(as('anon',null,"select public.rr_camp_social('profile')"), /permission denied/)
    await assert.rejects(as('authenticated',one,'select * from retriever_camp.friend_codes'), /permission denied/)
    await assert.rejects(as('authenticated',one,'select public.rr_ranked_commit($1,$2,$3,$4)', [one,randomUUID(),randomUUID(),'{}']), /permission denied/)
    await assert.rejects(as('authenticated',one,'select public.rr_ranked_claim($1,$2,420)', [one,randomUUID()]), /permission denied/)
    await assert.rejects(as('authenticated',one,"update retriever_camp.ranked_control set active=true"), /permission denied/)
    assert.equal((await result('authenticated',one,"select public.rr_camp_social('camps') as result",[],false)).status,'auth_required')
    const tables = await as(null,null,`select count(*)::int as count from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='retriever_camp' and c.relkind='r' and not c.relrowsecurity`)
    assert.equal(tables.rows[0].count,0)
    await as(null,null,'update retriever_camp.ranked_control set active=true')
    assert.equal((await permit(one,'incompatible')).status,'wrong_course')
  })

  await t.test('derives the real run at the Edge boundary and consumes one ticket once', async () => {
    const ticket = await permit(one)
    assert.equal(ticket.season,season)
    assert.ok(ticket.seed >= 0)
    await as(null,null,"update retriever_camp.ranked_tickets set seed=0,issued_at=now()-interval '30 seconds' where id=$1",[ticket.id])
    let actor = two
    const handler = huntHandler({ origin:'https://isolated.example',publishable:'fixture-anon',service:'fixture-service', async fetcher(url, init) {
      if (url.endsWith('/user')) return Response.json({ is_anonymous: true, id: actor })
      assert.equal(init.headers.apikey,'fixture-service')
      const data = JSON.parse(init.body)
      if (url.endsWith('/rr_ranked_claim')) return Response.json(await claim(data.p_player,data.p_ticket,data.p_ticks))
      return Response.json(await commit(data.p_player,data.p_ticket,data.p_lease,data.p_metrics))
    } })
    const submit = async body => (await handler(new Request('https://isolated.example/verify-hunt', { method:'POST',
      headers: { Authorization:'Bearer isolate-token-for-hosted-review' },body:JSON.stringify(body) }))).json()
    const tape = { ticket:ticket.id,season,course,ticks:380,actions:[],score:999999,owner:one }
    assert.equal((await submit(tape)).status,'invalid_ticket')
    actor = one
    assert.equal((await submit({...tape,course:'wrong'})).status,'invalid_run')
    const answer = await submit(tape)
    assert.equal(answer.status,'ok')
    assert.deepEqual(answer.honors,['camp-first-hunt'])
    assert.equal((await board(one)).mine.value,95)
    assert.equal((await board(null,'duration')).rows[0].value,3161)
    assert.equal((await board(null,'combo')).rows[0].value,5)
    assert.equal((await submit(tape)).status,'duplicate')
    assert.equal((await submit({...tape,actions:[0,99999]})).status,'invalid_run')
    assert.equal((await submit({...tape,extra:'x'.repeat(22_000)})).status,'invalid_run')

    const bad = await permit(two)
    await as(null,null,"update retriever_camp.ranked_tickets set seed=0,issued_at=now()-interval '30 seconds' where id=$1",[bad.id])
    actor = two
    assert.equal((await submit({...tape,ticket:bad.id,ticks:390})).status,'invalid_run')
    assert.equal((await submit({...tape,ticket:bad.id})).status,'invalid_run')
    assert.equal((await board(two)).mine,null)
  })

  await t.test('resolves concurrent or repeated claims, ties, metric bests and awards independently', async () => {
    async function award(user, metrics) {
      const ticket = await permit(user)
      await as(null,null,"update retriever_camp.ranked_tickets set issued_at=now()-interval '2 minutes' where id=$1",[ticket.id])
      const lease = await claim(user,ticket.id,380)
      assert.equal((await claim(user,ticket.id,380)).status,'pending')
      assert.equal((await commit(user,ticket.id,randomUUID(),metrics)).status,'pending')
      return commit(user,ticket.id,lease.lease,metrics)
    }
    const first = await award(two,{score:95,duration:3161,distance:35,retrieves:1,combo:5})
    assert.ok(first.honors.includes('camp-all-boards'))
    assert.ok(first.honors.includes('camp-retrieves-1'))
    assert.deepEqual((await board(null)).rows.map(row => row.nickname),['Marsh Runner','Cedar Scout'])
    assert.equal((await board(two)).rivals[0].rank,1)
    assert.equal((await board(null)).mine,null)
    assert.equal((await board(null)).rivals.length,0)
    const second = await award(two,{score:2500,duration:2800,distance:30,retrieves:1,combo:4})
    assert.deepEqual(second.improved,['score'])
    assert.deepEqual(second.honors,['camp-score-1'])
    assert.deepEqual((await board(null)).rows.map(row => row.nickname),['Cedar Scout','Marsh Runner'])
    assert.equal((await board(null,'distance')).rows[1].value,35)
    assert.equal((await board(null,'unknown')).status,'invalid_metric')
    assert.equal((await board(null,'score',999)).rows.length,0)
    const profile = await result('anon',null,'select public.rr_ranked_profile($1) as result',['Cedar Scout'])
    assert.equal(profile.records.score,2500)
    assert.deepEqual(Object.keys(profile).sort(),['nickname','records','status'])
  })

  await t.test('friends require mutual acceptance and Camps enforce membership and owner changes', async () => {
    const code = (await social(two,'friends')).code
    assert.equal((await social(two,'friend_request',null,code)).status,'invalid_code')
    assert.equal((await social(one,'friend_request',null,code)).status,'ok')
    assert.equal((await social(one,'friend_request',null,code)).status,'already_exists')
    const connection = (await social(two,'friends')).rows[0]
    assert.equal(connection.state,'incoming')
    assert.equal((await social(three,'friend_accept',null,null,connection.key)).status,'not_found')
    assert.equal((await social(one,'friend_accept',null,null,connection.key)).status,'not_found')
    assert.equal((await board(one,'score',0,'friends')).rows.length,1)
    assert.equal((await social(two,'friend_accept',null,null,connection.key)).status,'ok')
    assert.equal((await board(one,'score',0,'friends')).rows.length,2)
    assert.equal((await social(one,'friend_remove',null,null,connection.key)).status,'ok')
    assert.equal((await board(one,'score',0,'friends')).rows.length,1)

    assert.equal((await social(one,'camp_create',null,'<a x>')).status,'invalid_name')
    const camp = (await social(one,'camp_create',null,'Cattail Club')).id
    assert.ok(camp)
    const invite = (await social(one,'camp_detail',camp)).invite
    assert.ok(invite)
    assert.equal((await social(three,'camp_detail',camp)).status,'not_found')
    assert.equal((await board(three,'score',0,'camp',camp)).status,'not_found')
    assert.equal((await board(null,'score',0,'camp',camp)).status,'auth_required')
    const rotated = (await social(one,'camp_rotate',camp)).invite
    assert.notEqual(rotated,invite)
    assert.equal((await social(two,'camp_join',null,invite)).status,'invalid_code')
    for (let retry=0; retry<2; retry++) assert.equal((await social(two,'camp_join',null,rotated)).status,'ok')
    assert.deepEqual((await social(two,'profile')).honors.filter(id => id === 'camp-private-camp'),['camp-private-camp'])
    assert.equal((await social(two,'camp_rotate',camp)).status,'not_found')
    assert.equal((await social(two,'camp_detail',camp)).invite,null)
    assert.equal((await board(two,'score',0,'camp',camp)).rows.length,2)
    assert.equal((await social(one,'camp_leave',camp)).status,'owner_must_transfer')
    const memberKey = (await social(one,'camp_detail',camp)).rows.find(row => !row.self).key
    assert.equal((await social(one,'camp_transfer',camp,null,memberKey)).status,'ok')
    assert.equal((await social(one,'camp_leave',camp)).status,'ok')
    assert.equal((await social(two,'camp_delete',camp)).status,'ok')
    assert.equal((await social(two,'camp_detail',camp)).status,'not_found')
  })

  await t.test('expiry, rate limits and explicit profile deletion are enforced server-side', async () => {
    let ticket
    for (let i=0;i<4;i++) {
      ticket = await permit(three)
      assert.equal(ticket.status,'ok')
    }
    assert.equal((await permit(three)).status,'rate_limited')
    await as(null,null,"update retriever_camp.ranked_tickets set issued_at=now()-interval '3 days' where id=$1",[ticket.id])
    assert.equal((await claim(three,ticket.id,350)).status,'expired')
    const erase = (user, confirmation) => result('authenticated',user,'select public.rr_camp_erase($1) as result',[confirmation])
    assert.equal((await erase(two,'wrong')).status,'confirmation_required')
    assert.equal((await erase(two,'DELETE MY CAMP PROFILE')).status,'ok')
    assert.equal((await board(one)).mine.rank,1)
    assert.equal((await social(two,'profile')).status,'profile_required')
    assert.equal((await as(null,null,'select count(*)::int as n from auth.users')).rows[0].n,3)
  })
})
