import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { createRankedCamp, verifiedHonorIds, verifiedHonorRequirements } from '../src/ranked-camp.js'
import { recordRankedActions, verifyRankedReplay, lastRankedTick } from '../src/ranked-replay.js'
import { honors, localHonors } from '../src/field-honors.js'

const course = 'migration-30-phase-05'
const season = 'great-migration-1'

test('ranked replay terminates at the genuine fixed-step collision, derives score and checks recorded action order', () => {
  const recorder = recordRankedActions()
  const witness = { score: 95, distance: 35, duration: 3161, retrieves: 0, combo: 5 }
  assert.deepEqual(verifyRankedReplay(0, recorder.finish(380)), witness)
  assert.equal(verifyRankedReplay(0, recorder.finish(379)), null)
  assert.equal(verifyRankedReplay(0, recorder.finish(381)), null)
  assert.equal(verifyRankedReplay(0, { ticks: 380, actions: [5, 1] }), null)
  assert.equal(verifyRankedReplay(0, { ticks: 380, actions: [0, 0] }), null)
  recorder.add(lastRankedTick, 'jump')
  assert.equal(recorder.finish(lastRankedTick), null)
})

test('ranked results earned during an outage persist, wait for a safe screen and use the original owner and ticket', async () => {
  const memory = new Map()
  const storage = { get length() { return memory.size }, key: index => [...memory.keys()][index], getItem: key => memory.get(key),
    setItem: (key,value) => memory.set(key,value), removeItem: key => memory.delete(key) }
  let owner = 'fixture identity'
  const legacy = { member: id => id === 1 ? { identity:owner } : null }
  let connected = true, safe = true
  let ms = 1000
  const id = randomUUID()
  const submissions = []
  const options = { store: () => storage, online: () => connected, now: () => ms, safe: () => safe }
  const transport = { namespace:'isolated', rankedTicket: async () => ({ status:'ok',id,seed:0,season,course,expires:new Date(ms+200000).toISOString() }),
    rankedVerify: async (profile,identity,body) => {
      submissions.push({profile,identity,body})
      return submissions.length === 1 ? { status:'unavailable' } : { status:'duplicate',honors:['camp-first-hunt','fake'] }
    } }
  let camp = createRankedCamp(transport,legacy,options)
  const ticket = await camp.ticket(1)
  assert.equal(ticket.status,'ok')
  connected = false
  assert.equal((await camp.finish(ticket,{ticks:380,actions:[]}).done).status,'pending')
  assert.equal(camp.pending(1),1)
  camp = createRankedCamp(transport, legacy, options)
  connected = true
  safe = false
  await camp.flush()
  assert.equal(submissions.length,0)
  safe = true
  assert.equal((await camp.flush()).status,'unavailable')
  assert.equal((await camp.flush()).status,'pending')
  assert.equal(submissions.length,1)
  ms += 61_000
  assert.equal((await camp.flush()).status,'duplicate')
  assert.deepEqual(submissions[0],submissions[1])
  assert.equal(submissions[1].body.ticket,id)
  assert.deepEqual(camp.honors(1),['camp-first-hunt'])
  assert.equal(camp.pending(1),0)
  owner = 'a replacement profile'
  assert.deepEqual(camp.honors(1),[])
  assert.equal((await camp.finish(ticket,{ticks:380,actions:[]}).status),'expired')
})

test('the 25 stable Camp Honor IDs remain outside all local award and Master Hunter counts', () => {
  const camp = honors.filter(honor => honor.category === 'Worldwide Camp')
  assert.equal(camp.length,25)
  assert.equal(localHonors.length,621)
  assert.equal(verifiedHonorIds.size,15)
  assert.equal(Object.keys(verifiedHonorRequirements).length,15)
  assert.ok([...verifiedHonorIds].every(id => camp.some(honor => honor.id === id && !honor.qualifies)))
})
