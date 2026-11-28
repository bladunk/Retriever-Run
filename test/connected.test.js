import assert from 'node:assert/strict'
import test from 'node:test'
import { isolatedCamp, reviewPlayers } from '../scripts/camp-isolated-db.mjs'
import { simulateMastery } from '../scripts/mastery-survey.mjs'
import { huntHandler } from '../supabase/functions/verify-hunt/handler.js'
import { masteryReplayVersion, maxMasteryTicks, recordRankedActions } from '../src/ranked-replay.js'
import { masteryCourseRuleset } from '../src/ruleset.js'
import { equipmentOrder } from '../src/kennel-ui.js'
import { huntShareModel } from '../src/share-model.js'

const { one, two, three } = reviewPlayers

test('Mastery admission, replay and commit preserve the isolated season and actual long hunts', async t => {
  const env = await isolatedCamp()
  t.after(() => env.db.close())
  const { as, result, name } = env
  const call = (id, fn, args, role = id ? 'authenticated' : 'anon', anonymous = true) =>
    result(role,id,'select public.rr_' + fn + '('+args.map((_,i)=>'$'+(i+1)).join(',')+') as result',args,anonymous)
  await name(one,'Cedar Scout')
  await name(two,'Delta Guide')
  await name(three,'River Scout')
  assert.equal((await call(one,'mastery_ticket',[masteryCourseRuleset])).status,'closed')
  assert.equal((await call(null,'connected_standings',[])).open,false)
  await assert.rejects(as('authenticated',one,'select * from retriever_camp.mastery_tickets'), /permission denied/)
  await assert.rejects(call(one,'mastery_commit',[one,two,three,{}]), /permission denied/)
  await assert.rejects(call(one,'mastery_claim',[one,two,240]), /permission denied/)
  await as(null,null,'update retriever_camp.ranked_control set active=true where season=$1',[masteryReplayVersion])
  assert.equal((await call(one,'ranked_ticket',['migration-30-phase-05'])).status,'closed')
  assert.equal((await call(one,'mastery_ticket',['migration-30-phase-05'])).status,'wrong_course')
  assert.equal((await call(one,'mastery_ticket',[masteryCourseRuleset],'authenticated',false)).status,'auth_required')
  let actor = one
  const handler = huntHandler({ origin:'https://isolated.invalid', publishable:'unit-public', service:'unit-private',
    authorizeMastery:true, async fetcher(url,init) {
      if (url.endsWith('/user')) return Response.json({ is_anonymous:true,id:actor })
      assert.equal(init.headers.apikey,'unit-private')
      const body = JSON.parse(init.body)
      const name = url.split('/rr_').at(-1)
      const args = name.endsWith('_claim') ? [body.p_player,body.p_ticket,body.p_ticks] :
        [body.p_player,body.p_ticket,body.p_lease,body.p_metrics]
      return Response.json(await call(null,name,args,'service_role'))
    } })
  const send = async (payload, headers = {}) => (await handler(new Request('https://edge.invalid', {
    method:'POST', headers:{ Authorization:'Bearer synthetic-token-for-local-verify',...headers }, body:JSON.stringify(payload),
  }))).json()
  for (const [index, target] of [450,600,900,1200,1800,3600].entries()) {
    const hunt = simulateMastery(7,target+30,{coastAt:target-(target === 3600 ? 15 : 0)})
    assert.ok(hunt.contact && Math.abs(hunt.elapsed-target)<25,target)
    const ticket = await call(one,'mastery_ticket',[masteryCourseRuleset])
    assert.equal(ticket.status,'ok')
    await as(null,null,"update retriever_camp.mastery_tickets set seed=7, issued_at=now()-interval '2 hours' where id=$1",[ticket.id])
    const payload = { ...hunt.trace,ticket:ticket.id }
    if (index===0) {
      actor=two
      assert.equal((await send(payload)).status,'invalid_ticket')
      actor=one
      assert.equal((await send({...payload,course:'wrong'})).status,'invalid_run')
      assert.equal((await send({...payload,ticks:maxMasteryTicks+1})).status,'invalid_run')
      assert.equal((await send({...payload,actions:Array(8500).fill(1)})).status,'invalid_run')
      assert.equal((await send(payload,{'Content-Encoding':'gzip'})).status,'invalid_run')
    }
    const accepted = await send(payload)
    assert.equal(accepted.status,'ok',JSON.stringify({ target,accepted }))
    assert.equal((await send(payload)).status,'duplicate')
    const board = await call(one,'connected_standings',[])
    assert.equal(board.mine.value,hunt.metrics.score)
    assert.equal(board.rows[0].bests.duration,hunt.metrics.duration)
    assert.equal(board.percentile,null)
  }
  await as(null,null,`insert into retriever_camp.ranked_bests(season,metric,player_id,value,recorded_at)
    select season,metric,$1,value,recorded_at+interval '1 second' from retriever_camp.ranked_bests
    where season=$2 and player_id=$3`,[two,masteryReplayVersion,one])
  const tied=await call(two,'connected_standings',[])
  assert.equal(tied.mine.rank,2)
  assert.equal(tied.percentile,0)
  assert.equal((await call(one,'connected_standings',[])).percentile,0)
  assert.equal((await call(null,'connected_standings',['worldwide',null,0,'great-migration-1'])).rows.length,0)
  const social = (id,action,value = null,target = null) => call(id,'camp_social',[action,null,value,target])
  const friend = (await social(two,'friends')).code
  assert.equal((await call(one,'connected_standings',['friends'])).rows.length,1)
  assert.equal((await social(one,'friend_request',friend)).status,'ok')
  assert.equal((await call(one,'connected_standings',['friends'])).rows.length,1)
  const request=(await social(two,'friends')).rows[0]
  await social(two,'friend_accept',null,request.key)
  assert.equal((await call(one,'connected_standings',['friends'])).rows.length,2)
  await call(two,'friend_rotate',[])
  assert.equal((await social(three,'friend_request',friend)).status,'invalid_code')
  const camp = await social(one,'camp_create','Wetland Friends')
  assert.equal((await call(two,'connected_standings',['camp',camp.id])).status,'not_found')
  assert.equal((await call(null,'connected_standings',['camp',camp.id])).status,'auth_required')
  assert.equal((await call(null,'connected_profile',['River Scout'])).status,'not_found')
  assert.equal((await call(three,'connected_visibility',[true,16,true])).status,'feature_closed')
  await as(null,null,'update retriever_camp.ranked_control set public_career_enabled=true where season=$1',[masteryReplayVersion])
  assert.equal((await call(three,'connected_visibility',[true,16,true])).status,'ok')
  assert.deepEqual((await call(null,'connected_profile',['River Scout'])).career,{level:16,migration_complete:true})
  await call(three,'connected_visibility',[false])
  assert.equal((await call(null,'connected_profile',['River Scout'])).status,'not_found')
  await as(null,null,`with people as (
    insert into auth.users(id)
      select ('a0000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid from generate_series(1,101) g
      returning id
  ), joined as (
    insert into retriever_camp.players(player_id,nickname,renamed_at)
      select id,'Review ' || right(id::text,3),now() from people returning player_id
  ) insert into retriever_camp.ranked_bests(season,metric,player_id,value,recorded_at)
    select 'one-more-hunt-1','score',player_id,314159,now() from joined`)
  const front = await call(one,'connected_standings',[])
  assert.equal(front.mine.rank,102)
  assert.equal(front.total_ranked,103)
  assert.equal(front.percentile,0)
  const end = await call(one,'connected_standings',['worldwide',null,75])
  assert.equal(end.rows.at(-1).rank,100)
  assert.equal(end.has_more,false)
})

test('long trace recorder and personal sharing preserve labels and catalog order', () => {
  const ranked = recordRankedActions(masteryCourseRuleset)
  ranked.add(109000,'jump')
  assert.deepEqual(ranked.finish(120000),{ticks:120000,actions:[436002]})
  const legacy = recordRankedActions()
  legacy.add(109000,'jump')
  assert.equal(legacy.finish(120000),null)
  const equipment = ['lockedA','ownedA','lockedB','equipped','ownedB'].map(id => ({id}))
  assert.deepEqual(equipmentOrder(equipment,'equipped',item=>item.id.startsWith('owned')).map(item=>item.id),
    ['equipped','ownedA','ownedB','lockedA','lockedB'])
  assert.equal(equipment[0].id,'lockedA')
  const card = huntShareModel({ course:masteryCourseRuleset,score:1200,duration:230,distance:3000,
    retrieves:12,territory:8 }, 'Cedar Scout',true)
  assert.equal(card.title,'Personal best')
  assert.equal(card.footer,'LOCAL RECORD · MASTERY')
  assert.deepEqual(card.metrics.at(-1),['Territory','Nebraska Sandhills'])
})
