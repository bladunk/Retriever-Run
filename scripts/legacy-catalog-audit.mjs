// This is a content audit, independent of any player's private save.
import { localHonors, honorById, checkLabel } from '../src/field-honors.js'
import { patches, hallOfShame } from '../src/honors.js'
import { lodgeUpgrades, lodgeRequirements, honorDisplay, lodgeTiers } from '../src/lodge-progress.js'
import { dogRanks, xpAt } from '../src/career.js'
import { environmentalDiscoveries } from '../src/environment-discoveries.js'
import { verifiedHonorRequirements } from '../src/ranked-camp.js'
import { fieldSpecies } from '../src/wildlife-catalog.js'
import { expeditionRegions } from '../src/expedition.js'

const honors = [...localHonors, ...Object.keys(verifiedHonorRequirements).map(id => honorById.get(id)).filter(Boolean)]
const requirements = honor => honor.pending ? [verifiedHonorRequirements[honor.id]]
  : honor.checks.map(requirement => checkLabel(requirement))
const placement = art => art === 'certificate' ? 'Camp humor shelf'
  : ['migration','map','observation','aurora-frame','record'].includes(art) ? 'Frame or display case' : 'Mantel'
const trophies = honors.map(honor => {
  const { art,species } = honor.pending ? { art:'legend' } : honorDisplay(honor)
  return { key:'honor:' + honor.id, name:honor.name, tier:honor.tier, category:honor.category,
    requirements:requirements(honor), ownership:honor.pending ? 'Verified Worldwide Camp receipt' : 'profile.progression.honors',
    presentation:art, ...(species ? {species} : {}), placement:placement(art) }
})
const historical = patches.map(patch => ({ key:'patch:' + patch.id, name:patch.name, requirements:patch.description,
  thresholds:patch.goals, ownership:'profile.patches', presentation:hallOfShame.includes(patch) ? 'certificate' : 'record' }))
const regional = expeditionRegions.map(region => ({ key:'region:' + region.key, name:region.name,
  ownership:'profile.migration.farthest > ' + region.index, presentation:'map' }))
const observations = Object.values(fieldSpecies).map(species => ({ key:'observe:' + species.id, name:species.name,
  ownership:'profile.wildlife.species.' + species.id + '.seen > 0', presentation:'Framed Journal artwork' }))
const discoveries = Object.entries(environmentalDiscoveries).map(([id,item]) => ({ key:'discovery:' + id, ...item,
  ownership:'profile.discoveries.entries', presentation:id === 'platte-crane-passage' ? 'bronze-flight'
    : id === 'divide-aurora' ? 'aurora-frame' : 'map' }))
const ranks = dogRanks.map(rank => ({ key:'rank:' + rank.id, name:rank.name, level:rank.level, xp:xpAt(rank.level),
  presentation:'Engraved insignia', ...(rank.level === 100 ? { requirement:'Full Master Hunter qualification' } : {}) }))
const introductions = lodgeUpgrades.map(upgrade => ({ ...upgrade, requirements:lodgeRequirements(upgrade) }))
console.log(JSON.stringify({ schema:1, tiers:lodgeTiers, trophies, historical, regional, ranks, observations, discoveries, introductions,
  otherExhibits:[
    { key:'migration:complete', requirements:'Recorded completion across all 15 territories', presentation:'Engraved migration route' },
    { key:'retrieve:mallard', requirements:'Recorded mallard retrieve', presentation:'Mallard decoy' },
    { key:'retrieve:pheasant', requirements:'Recorded pheasant retrieve', presentation:'Pheasant carving' },
  ] },null,2))
