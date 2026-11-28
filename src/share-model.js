import { expeditionRegions } from './expedition.js'
import { masteryCourseRuleset } from './ruleset.js'
import { duration, meters, number } from './lodge-elements.js'

export function huntShareModel(report, name, best = false) {
  const territory = expeditionRegions.find(region => region.key === report.territoryKey) ??
    (report.course !== 'legacy-10' ? expeditionRegions[report.territory - 1] : undefined)
  return {
    kind:'hunt', title:best ? 'Personal best' : 'Hunt result',
    name, image:'./lodge/map.webp',
    metrics:[['Score',number(report.score)],['Distance',meters(report.distance)],
      ['Survival',duration(report.duration)],['Retrieves',number(report.retrieves)],
      ['Territory',territory?.name ?? 'Not recorded']],
    footer:report.course === masteryCourseRuleset ? 'LOCAL RECORD · MASTERY' : 'LOCAL RECORD · EARLIER COURSE',
  }
}
