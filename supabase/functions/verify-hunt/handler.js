import { rankedCourse, rankedVersion, validRankedTrace, verifyRankedReplay } from '../../../src/ranked-replay.js'

const maxBodyBytes = 20 * 1024
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Cache-Control': 'no-store',
}
const reply = (status, data) => Response.json(data, { status, headers: cors })

async function boundedBody(request) {
  if (!request.body || Number(request.headers.get('content-length')) > maxBodyBytes) return null
  const reader = request.body.getReader()
  const encoder = new TextDecoder('utf-8', { fatal: true })
  let length = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return JSON.parse(text + encoder.decode())
      length += value.byteLength
      if (length > maxBodyBytes) {
        void reader.cancel()
        return null
      }
      text += encoder.decode(value, { stream: true })
    }
  } catch { return null }
  finally { reader.releaseLock() }
}

export function huntHandler({ origin = '', publishable = '', service = '', fetcher = fetch } = {}) {
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
    const input = await boundedBody(request)
    if (typeof input?.ticket !== 'string' || !idPattern.test(input.ticket) ||
        input.course !== rankedCourse || input.season !== rankedVersion || !validRankedTrace(input))
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
      const claim = await rpc('rr_ranked_claim', { ...ticket, p_ticks: input.ticks })
      if (claim.status !== 'ok') return reply(200, claim)
      const metrics = verifyRankedReplay(claim.seed, input)
      return reply(200, await rpc('rr_ranked_commit', { ...ticket, p_lease: claim.lease, p_metrics: metrics }))
    } catch {
      return reply(503, { status: 'unavailable' })
    }
  }
}
