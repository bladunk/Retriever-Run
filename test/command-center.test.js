import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { isolatedCamp, reviewPlayers } from '../scripts/camp-isolated-db.mjs'
import { createFeedback, feedbackStore } from '../src/support-report.js'
import { createIncidentCapture, inspectIncident } from '../src/support-incident.js'
import { diagnostics } from '../src/command-preview.js'
import { contactShadow } from '../src/contact-shadow.js'
import { Vector3 } from 'three'

const { one, two, three } = reviewPlayers
const jpeg = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAwT/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCRAGlf/9k='
const report = (overrides = {}) => ({
  id: randomUUID(), secret: '1a'.repeat(32), kind: 'unfair', subject: '<script>text only</script>', topic: 'Game stuttered',
  message: 'The dog moved after the frame pause.', version: '1.0.0-rc.11', build: 'isolated',
  updates: true, ...overrides,
})

test('command center RPCs separate players and developers and scope report receipts', async t => {
  const env = await isolatedCamp()
  t.after(() => env.db.close())
  const { as, result } = env
  const call = (identity, name, args, anonymous = true) => result(identity ? 'authenticated' : 'anon', identity,
    'select public.rr_support_' + name + '(' + args.map((_,i) => '$' + (i+1)).join(',') + ') as result', args, anonymous)
  const first = report({ diagnostics: diagnostics(), screenshot: jpeg })
  await as(null,null,'insert into rr_support.developers values ($1)', [three])

  assert.equal((await call(null,'status',[])).status,'closed')
  assert.equal((await call(one,'submit',[first])).status,'closed')
  await as(null,null,'update rr_support.control set accepting=true where singleton')
  assert.equal((await call(null,'status',[])).status,'ok')
  await assert.rejects(call(null,'inbox',[{}]), /permission denied/)
  await assert.rejects(call(null,'submit',[first]), /permission denied/)
  await assert.rejects(as('authenticated',one,'select * from rr_support.reports'), /permission denied/)
  await assert.rejects(as('authenticated',three,'insert into rr_support.developers values ($1)', [one], false), /permission denied/)
  await assert.rejects(as('authenticated',one,"update rr_support.reports set message='changed'"), /permission denied/)
  assert.equal((await call(two,'inbox',[{}],false)).status,'denied')
  assert.equal((await call(three,'inbox',[{}])).status,'denied')
  assert.equal((await call(three,'inbox',[{}],false)).status,'ok')
  assert.equal((await call(one,'submit',[report({ screenshot: 'data:text/html;base64,abc' })])).status,'invalid')
  assert.equal((await call(one,'submit',[report({ screenshot: '/9j/'+'V'.repeat(270000) })])).status,'invalid')
  assert.equal((await call(one,'submit',[report({ diagnostics: { token:'excluded' } })])).status,'invalid')
  assert.equal((await call(one,'submit',[report({ id:'not-a-uuid' })])).status,'invalid')
  assert.equal((await call(one,'submit',[report({ message:'x'.repeat(2001) })])).status,'invalid')
  const simultaneous = await Promise.all([call(one,'submit',[first]), call(one,'submit',[first])])
  assert.deepEqual(simultaneous[0],simultaneous[1])
  assert.equal(simultaneous[0].status,'ok')
  assert.equal((await call(two,'detail',[first.id],false)).status,'denied')
  assert.equal((await call(two,'triage',[first.id, { state:'verified' }],false)).status,'denied')
  assert.equal((await call(null,'receipt',[first.id,'7'.repeat(64),'status'])).status,'unknown')
  assert.equal((await call(null,'receipt',[first.id,first.secret,'status'])).status,'received')
  const inbox = await call(three,'inbox',[{ query:'text only' }],false)
  assert.equal(inbox.reports.length,1)
  assert.equal(inbox.reports[0].timing_average_ms,17)
  assert.equal(inbox.reports[0].has_diagnostics,true)
  const { report: saved } = await call(three,'detail',[first.id],false)
  assert.equal(saved.subject,first.subject)
  assert.equal(saved.receipt_hash,undefined)
  assert.equal(saved.actor,undefined)
  assert.equal(saved.screenshot,jpeg)
  await as(null,null,"update rr_support.reports set created_at=now()-interval '31 days' where id=$1", [first.id])
  await as(null,null,'select rr_support.prune()')
  const expired = (await call(three,'detail',[first.id],false)).report
  assert.equal(expired.screenshot,null)
  assert.equal(expired.diagnostics,null)
  assert.equal((await call(three,'triage',[first.id, { state:'released', severity:'high', issue:'#51' }],false)).status,'ok')
  assert.equal((await call(null,'receipt',[first.id,first.secret,'status'])).status,'received')
  assert.equal((await call(three,'triage',[first.id, { state:'verified', severity:'high', issue:'#51' }],false)).status,'ok')
  assert.equal((await call(null,'receipt',[first.id,first.secret,'status'])).status,'verified')
  assert.deepEqual((await call(three,'detail',[first.id],false)).report.state_history.map(item => item.to),['released','verified'])
  assert.equal((await call(null,'receipt',[first.id,first.secret,'delete'])).status,'deleted')
  assert.equal((await call(null,'receipt',[first.id,first.secret,'status'])).status,'unknown')
  for (let i = 0; i < 2; i++) assert.equal((await call(one,'submit',[report()])).status,'ok')
  assert.equal((await call(one,'submit',[report()])).status,'rate_limited')
  await as(null,null,"update rr_support.reports set created_at=now()-interval '181 days'")
  await as(null,null,'select rr_support.prune()')
  assert.deepEqual((await call(three,'inbox',[{}],false)).reports,[])
})

test('offline feedback keeps the original payload and consent through retries and confirmation', () => {
  const backing = new Map()
  const storage = { getItem: key => backing.get(key), setItem: (key,value) => backing.set(key,value) }
  const make = feedbackStore(storage)
  const first = createFeedback({ kind:'bug', subject:' Dog paused ', message:'', build:{ version:'rc.11',id:'test' } })
  assert.equal(first.subject,'Dog paused')
  assert.equal(first.updates,false)
  assert.equal(first.diagnostics,undefined)
  assert.equal(first.screenshot,undefined)
  for (const item of [first,report(),report(),first]) assert.equal(make.queue(item),true)
  assert.equal(make.queue(report()),false)
  const restored = feedbackStore(storage)
  assert.deepEqual(restored.pending()[0],first)
  assert.equal(restored.delivered(first,'12345678'),true)
  assert.equal(make.pending().length,2)
  assert.equal(make.receipts()[0].secret,first.secret)
  assert.equal(make.cancel(make.pending()[0].id),true)
  assert.equal(make.pending().length,1)
})

test('incident bounds and build identity distinguish a reproduced step from insufficient evidence', () => {
  const incident = diagnostics().incident
  assert.equal(inspectIncident(incident,'same','same').status,'reproduced')
  assert.equal(inspectIncident(incident,'before','after').status,'matched_on_review_build')
  assert.equal(inspectIncident({ ...incident, hazards:[] },'same','same').status,'mismatch')
  assert.equal(inspectIncident({ ...incident, before:{} },'same','same').status,'insufficient')
  const capture = createIncidentCapture()
  for (let i = 0; i < 300; i++) { capture.frame(17); capture.input(i,'left') }
  capture.fatal({ ...incident, contact:incident.expected, entities:incident.hazards })
  assert.equal(capture.diagnostics('low',false).incident,undefined)
  assert.equal(capture.diagnostics('low',true).incident.inputs.length,32)
  assert.equal(capture.diagnostics('low',true).timing.samples,90)
  capture.reset()
  assert.deepEqual(capture.diagnostics('low',true), { graphics:'low' })
})

test('single contact stamps preserve footprint on the shared unit quad', () => {
  const dog = contactShadow()
  for (const [name,x,width,depth] of [['branch',.91,1.48,1.28],['snowmobile',0,1.65,3.05],
    ['tractor',0,2.42,2.8],['log',0,2.26,1.19]]) {
    const model = contactShadow(name)
    model.updateMatrix()
    assert.equal(model.geometry,dog.geometry)
    const corner = new Vector3(.5,.5,0).applyMatrix4(model.matrix)
    assert.ok(corner.distanceTo(new Vector3(x+width/2,.029,-depth/2)) < 1e-10)
  }
})
