import { masteryReplayVersion, rankedCourse, rankedVersion, validMasteryTrace, validRankedTrace,
  verifyMasteryReplay, verifyRankedReplay } from '../../../src/ranked-replay.js'
import { masteryCourseRuleset } from '../../../src/ruleset.js'

const maxBodyBytes = 20 * 1024
const maxMasteryBodyBytes = 80 * 1024
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Cache-Control': 'no-store',
}
const reply = (status, data) => Response.json(data, { status, headers: cors })

async function boundedBody(request, limit) {
  if (!request.body || Number(request.headers.get('content-length')) > limit) return null
  const reader = request.body.getReader()
  const encoder = new TextDecoder('utf-8', { fatal: true })
  let length = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return { value: JSON.parse(text + encoder.decode()), bytes: length }
      length += value.byteLength
      if (length > limit) {
        void reader.cancel()
        return null
      }
      text += encoder.decode(value, { stream: true })
    }
  } catch { return null }
  finally { reader.releaseLock() }
}

export function huntHandler({ origin = '', publishable = '', service = '', authorizeMastery = false, fetcher = fetch } = {}) {
  async function rpc(name, body) {
    const response = await fetcher(origin + '/rest/v1/rpc/' + name, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: service, Authorization: 'Bearer ' + service },
      body: JSON.stringify(body), signal: AbortSignal.timeout(4500),
    })
    if (!response.ok) throw new Error('verification_unavailable')
    return response.json()
  }
  return async request => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return reply(405, { status: 'invalid_method' })
    const bearer = request.headers.get('Authorization')
    if (!bearer || !/^Bearer [\w.-]{20,4000}$/i.test(bearer)) return reply(200, { status: 'auth_required' })
    if (!origin || !publishable || !service) return reply(503, { status: 'unavailable' })
    const packet = await boundedBody(request, authorizeMastery ? maxMasteryBodyBytes : maxBodyBytes)
    const input = packet?.value
    const mastery = authorizeMastery && input?.course === masteryCourseRuleset && input?.season === masteryReplayVersion
    const legacy = packet?.bytes <= maxBodyBytes && input?.course === rankedCourse && input?.season === rankedVersion
    if (typeof input?.ticket !== 'string' || !idPattern.test(input.ticket) ||
        !(mastery ? validMasteryTrace(input) : legacy && validRankedTrace(input)))
      return reply(200, { status: 'invalid_run' })
    try {
      const auth = await fetcher(origin + '/auth/v1/user', {
        headers: { apikey: publishable, Authorization: bearer }, signal: AbortSignal.timeout(4500),
      })
      if (auth.status === 401 || auth.status === 403) return reply(200, { status: 'auth_required' })
      if (!auth.ok) return reply(503, { status: 'unavailable' })
      const user = await auth.json()
      if (user.is_anonymous !== true || !idPattern.test(user.id)) return reply(200, { status: 'auth_required' })
      const ticket = { p_player: user.id, p_ticket: input.ticket }
      const claim = await rpc(mastery ? 'rr_mastery_claim' : 'rr_ranked_claim', { ...ticket, p_ticks: input.ticks })
      if (claim.status !== 'ok') return reply(200, claim)
      if (mastery && (claim.course !== masteryCourseRuleset || claim.season !== masteryReplayVersion))
        return reply(200, { status: 'invalid_run' })
      const metrics = mastery ? verifyMasteryReplay(claim.seed, input) : verifyRankedReplay(claim.seed, input)
      return reply(200, await rpc(mastery ? 'rr_mastery_commit' : 'rr_ranked_commit',
        { ...ticket, p_lease: claim.lease, p_metrics: metrics }))
    } catch {
      return reply(503, { status: 'unavailable' })
    }
  }
}
