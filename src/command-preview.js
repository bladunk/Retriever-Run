import { traceContact } from './collision.js'

const before = { distance:99, elapsed:6, x:0, lane:0, lateralSpeed:0, jump:0, slide:0, power:0, speed:17 }
const after = { ...before, distance:99.14, elapsed:6 + 1/120 }
const hazard = { type:'puddle', lane:0, distance:99.5, hazard:true }
const expected = {}
traceContact(before, after, hazard, expected)

export const diagnostics = () => ({
  graphics:'low', timing:{ samples:90, averageMs:17, worstMs:29, over20:2, over33:0, over50:0 },
  incident:{ seed:7, ruleset:'migration-30-mastery-1', territory:'boreal', stage:13, tick:720,
    before, after, expected, hazards:[hazard], inputs:[{ tick:700, move:'left' }] },
})
export const worldwide = { status:'ok', open:false, season:'great-migration-1', course:'migration-30-phase-05', rows:[] }

export function previewTransport() {
  const records = ['unfair','suggestion','bug','note'].map((kind,i) => ({
    id: 'a0c0000' + i + '-0000-4000-8000-000000000000',
    kind, subject:['Late obstacle at the Foothills approach','Show the next Lodge milestone','Missing sound on replay','The crane migration was a highlight'][i],
    message:'Synthetic report for interface review.',
    created_at:'2026-11-28', version:'1.0.0-rc.11', build:'studio', state:i ? 'new' : 'reproduce',
    severity:i ? 'unclassified' : 'high', territory:i ? null : 'boreal', has_diagnostics:!i,
    timing_average_ms:i ? null : 17, diagnostics:i ? null : diagnostics(), developer_note:'', issue:'',
  }))
  return {
    async inbox(filters) {
      const reports = records.filter(row => ['kind','state','severity','version'].every(key => !filters[key] || row[key] === filters[key]) &&
        (!filters.query || row.subject.toLowerCase().includes(filters.query.toLowerCase())))
      return { status:'ok', reports }
    },
    async detail(id) {
      const report = records.find(item => item.id === id)
      return report ? { status:'ok', report } : { status:'unknown' }
    },
    async triage(id, data) { Object.assign(records.find(item => item.id === id), data); return { status:'ok' } },
    async remove(id) { const index = records.findIndex(item => item.id === id); records.splice(index,1); return { status:'deleted' } },
  }
}
