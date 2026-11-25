import { expeditionRegions } from './expedition.js'
import { obstacles } from './obstacles.js'
import { fieldSpecies, habitatEncounters } from './wildlife-catalog.js'

export const honorCategories = ['Retrieval & Waterfowl', 'Exploration', 'Obstacle Mastery', 'Skill & Survival',
  'Lifetime', 'Regional', 'Hall of Shame', 'Wildlife & Upland', 'Secrets', 'Legendary', 'Worldwide Camp']
const [waterfowl, exploration, obstacle, skill, lifetime, regional, shame, wildlife, secret, legendary, camp] = honorCategories
export const honorTiers = ['Bronze', 'Silver', 'Gold', 'Platinum']
const honorList = []
const requirements = new Map()
const define = (key, label, unit = '', scope = 'career') => {
  requirements.set(key, { label, unit, scope })
  return key
}
const condition = (key, target) => ({ key, target })
const add = (id, name, category, checks, tier = 'Gold', pending = false) => {
  honorList.push({ id, name, category, checks, tier, reward: { medal: tier }, pending, secret: category === secret,
    qualifies: !pending && category !== shame })
}
const series = (id, name, category, key, targets) => targets.forEach((target, i) =>
  add(id + '-' + (i + 1), name + ' · ' + honorTiers[i], category, [condition(key, target)], honorTiers[i]))

export const waterfowlSpecies = Object.values(fieldSpecies).filter(animal =>
  !['pheasant','crane','wader','raptor','deer','moose','alligator'].includes(animal.family))
const waterfowlIDs = new Set(waterfowlSpecies.map(animal => animal.id))
const uplandNames = { pheasant: 'Pheasant Fanatic', crane: 'Watching the Platte', deer: 'Wood Line Watch',
  alligator: 'Backwater Sentinel', moose: 'Northwoods Neighbors', eagle: 'Above the Flyway', egret: 'White on the Water',
  heron: 'A Patient Fisher' }
for (const animal of Object.values(fieldSpecies)) {
  const isWaterfowl = waterfowlIDs.has(animal.id)
  const observation = define('seen:' + animal.id, 'Observe ' + animal.name, ' sightings')
  series('watch-' + animal.id, uplandNames[animal.id] ?? animal.name + ' Watch',
    isWaterfowl ? waterfowl : wildlife, observation, [1, 3, 8, 20])
}
series('mallard-retrieve', 'Greenhead Retriever', waterfowl, define('retrieve:mallard', 'Retrieve Mallards', ' retrieves'), [1, 20, 100, 500])
series('pheasant-retrieve', 'Rooster Run', wildlife, define('retrieve:pheasant', 'Retrieve Ring-necked Pheasants', ' retrieves'), [1, 15, 60, 250])
series('waterfowl-notebook', 'Waterfowl Notebook', waterfowl, define('waterfowl-count', 'Observe distinct waterfowl species', ' species'), [3, 7, 12, 18])
series('field-naturalist', 'Field Naturalist', wildlife, define('species-count', 'Observe distinct wildlife species', ' species'), [5, 12, 20, 26])
series('rare-journal', 'Worth the Wait', wildlife, define('rare-count', 'Observe rare or exceptional wildlife', ' sightings'), [1, 8, 25, 80])

const places = [
  'Saltwind', 'Cypress Curtain', 'Delta Backwater', 'Green Timber', 'Ozark Gravel',
  'Cornfield Commander', 'Platte Passage', 'Sandhills Roamer', 'Pothole Scout', 'Dakota Crosswind',
  'Northern Exposure', 'Aspen Parkland', 'Spruce Line', 'Rocky Approach', 'Snowline',
]
for (const region of expeditionRegions) {
  const title = places[region.index]
  const prefix = region.key
  const label = region.name
  add(prefix + '-arrival', title + ' Arrival', exploration, [condition(define('reach:' + prefix, 'Reach ' + label), 1)], 'Bronze')
  add(prefix + '-traversal', title + ' Traverse', exploration,
    [condition(define('traverse:' + prefix, 'Survive through ' + label), 1)], 'Silver')
  series(prefix + '-footing', title + ' Footing', regional,
    define('metres:' + prefix, 'Run in ' + label, ' m'), [300, 1500, 6000, 18000])
  series(prefix + '-fieldwork', title + ' Fieldwork', regional,
    define('seconds:' + prefix, 'Spend active hunt time in ' + label, ' s'), [90, 300, 900, 2400])
  const ceiling = new Set(habitatEncounters[prefix].flat()).size
  series(prefix + '-journal', title + ' Journal', regional,
    define('local-species:' + prefix, 'Observe distinct species in ' + label, ' species'), [1, 2, Math.min(5, ceiling)])
}
const obstacleTitles = {
  log: 'Deadfall Jumper', root: 'Root Reader', puddle: 'Dry Boots', branch: 'Under the Limbs',
  fence: 'Fence Line', tree: 'Woodland Reflex', drift: 'Driftwood Step', fallen: 'Windthrow Escape',
  tractor: 'Row Crop Reflex', rock: 'Stone Footing', stream: 'Creek Hart', washout: 'Floodplain Escape',
  goose: 'Goose Negotiator', 'leaning-tree': 'Split Timber', snowmobile: 'Sled Line',
}
for (const [id, hazard] of Object.entries(obstacles)) {
  const name = obstacleTitles[id]
  const uncommon = ['tractor', 'snowmobile', 'leaning-tree'].includes(id)
  series(id + '-mastery', name, obstacle, define('clear:' + id, 'Successfully avoid ' + hazard.name, ' clears'),
    uncommon ? [1, 8, 25, 60] : [1, 15, 60, 180])
  series(id + '-run', name + ' Run', obstacle,
    define('hunt-clear:' + id, 'Clear in one hunt · ' + hazard.name, ' clears', 'hunt'),
    uncommon || id === 'goose' || id === 'washout' ? [2, 3] : [3, 6])
}
const tracked = [
  ['runs', 'Field Days', 'Complete hunts', ' hunts', [5, 40, 200, 1000]],
  ['distance', 'Boot Leather', 'Cover lifetime distance', ' m', [2500, 20_000, 100_000, 750_000]],
  ['playtime', 'Time in the Field', 'Spend active time hunting', ' s', [600, 3600, 18_000, 90_000]],
  ['treats', 'Treat Trail', 'Collect treats', ' treats', [100, 1000, 10_000, 75_000]],
  ['retrieves', 'Game Carrier', 'Make successful retrieves', ' retrieves', [5, 50, 200, 800]],
  ['logs', 'Timberwork', 'Jump logs or driftwood', ' clears', [10, 75, 200, 650]],
  ['slidesCleared', 'Low Profile', 'Clear overhead hazards by sliding', ' clears', [10, 60, 180, 600]],
  ['geese', 'Flock Tactics', 'Avoid diving geese', ' clears', [5, 40, 100, 400]],
  ['points', 'Field Ledger', 'Earn lifetime hunt points', ' points', [50_000, 250_000, 1_000_000, 5_000_000]],
  ['jumps', 'Up and Over', 'Execute accepted jumps', ' jumps', [25, 120, 550, 2250]],
  ['slides', 'Down Low', 'Execute accepted slides', ' slides', [20, 100, 400, 1600]],
  ['shifts', 'Lane Craft', 'Make accepted lane changes', ' changes', [25, 200, 1000, 5000]],
  ['routes', 'Reward Line', 'Finish optional three-treat hazard routes', ' routes', [1, 8, 30, 100]],
]
for (const [key, name, label, unit, targets] of tracked) series('life-' + key, name, lifetime, define('total:' + key, label, unit), targets)

const records = [
  ['duration', 'Long Leash', 'Survive one hunt', ' s', [30, 90, 180, 300]],
  ['distance', 'Long Way Home', 'Cover distance in one hunt', ' m', [600, 2000, 5200, 9500]],
  ['score', 'Personal Standard', 'Score in one hunt', ' points', [2000, 9000, 25_000, 50_000]],
  ['treats', 'Treat Sweep', 'Collect treats in one hunt', ' treats', [30, 125, 300, 600]],
  ['retrieves', 'Full Game Bag', 'Retrieve birds in one hunt', ' retrieves', [2, 4, 7, 10]],
  ['streak', 'Held the Line', 'Build a treat streak in one hunt', ' treats', [8, 16, 30, 60]],
  ['chain', 'In Rhythm', 'Chain verified clears within eight seconds of each other', ' clears', [3, 6, 10, 16]],
  ['diversity', 'All-Round Gundog', 'Clear different obstacle types in one hunt', ' types', [3, 5, 7, 10]],
  ['jumpClears', 'Landing Lights', 'Clear hazards by jumping in one hunt', ' clears', [3, 8, 16, 28]],
  ['slidesCleared', 'Limbo Trial', 'Clear overhead hazards in one hunt', ' clears', [2, 4, 7, 12]],
  ['geese', 'Flock Slalom', 'Dodge diving geese in one hunt', ' clears', [1, 3, 5, 8]],
  ['routeCount', 'Against All Odds', 'Finish optional reward routes in one hunt', ' routes', [1, 2, 4, 7]],
]
for (const [key, name, label, unit, targets] of records) series('skill-' + key, name, skill, define('best:' + key, label, unit), targets)

for (const [key, title, label] of [
  ['water','Swamp Thing','Water hazard setbacks'], ['logs','Tree Hugger','Timber setbacks'],
  ['geese','Goose Magnet','Diving goose setbacks'], ['other','Professional Disappointment','Other trail setbacks'],
]) series('shame-' + key, title, shame, define('death:' + key, label, ' hunts'), [1, 8, 25, 60])
for (const [id, hazard] of Object.entries(obstacles))
  series('lesson-' + id, hazard.name + ' Lesson', shame, define('impact:' + id, 'Hunts ended by ' + hazard.name, ' hunts'), [1, 5])
series('short-leash', 'Short Leash', shame, define('early', 'Hunts ended before ten seconds', ' hunts'), [5, 15, 30, 60])

for (const [key, label, unit] of [
  ['time','Survive in the same hunt',' s'], ['bag','Retrieve birds in the same hunt',' retrieves'],
  ['goose','Dodge diving geese in the same hunt',' clears'], ['jump','Clear by jumping in the same hunt',' clears'],
  ['slide','Clear overhead hazards in the same hunt',' clears'], ['route','Complete optional reward routes in the same hunt',' routes'],
  ['notes','Observe distinct wildlife in the same hunt',' species'], ['treat','Collect treats in the same hunt',' treats'],
  ['chain','Chain confirmed clears in the same hunt',' clears'],
]) define('run:' + key, label, unit, 'hunt')

const hidden = [
  ['first-flight','First Flight','jump','bag',[1,1],[4,3],[9,5]],
  ['under-and-over','Under and Over','jump','slide',[2,1],[6,3],[13,5]],
  ['wing-watch','Wings and Water','bag','notes',[1,1],[3,2],[6,4]],
  ['goose-truce','A Fragile Truce','goose','bag',[1,1],[3,3],[5,5]],
  ['quiet-crossing','Quiet Crossing','time','notes',[45,2],[110,4],[220,6]],
  ['steady-paws','Steady Paws','chain','bag',[3,2],[7,4],[12,6]],
  ['long-route','The Scenic Route','route','time',[1,55],[3,145],[5,280]],
  ['flyway-feast','Flyway Feast','goose','treat',[1,50],[3,155],[5,330]],
  ['field-pocket','Field Pocket','slide','route',[1,1],[3,2],[7,4]],
  ['company','Good Company','notes','treat',[1,70],[3,180],[5,330]],
]
for (const [id, name, a, b, ...goals] of hidden)
  goals.forEach(([x,y], index) => add('secret-' + id + '-' + (index + 1), name + ' · ' + honorTiers[index], secret,
    [condition('run:' + a, x), condition('run:' + b, y)], honorTiers[index]))

define('migration-count', 'Finish the complete Great Migration', ' completions')
define('families', 'Clear distinct obstacle types over your career', ' types')
const legends = [
  ['whole-course', 'Great Migration', [['traverse:mountain',1]]],
  ['beyond-the-map', 'Beyond the Map', [['best:duration',480]]],
  ['ten-minutes', 'Wilderness Ten', [['best:duration',600]]],
  ['three-migrations', 'Flyway Regular', [['migration-count',3]]],
  ['ten-migrations', 'Stamped Passport', [['migration-count',10]]],
  ['all-obstacles', 'Master of Footing', [['families',15]]],
  ['all-waterfowl', 'Waterfowl Master', [['waterfowl-count',waterfowlSpecies.length]]],
  ['all-species', 'Legendary Expedition', [['species-count',Object.keys(fieldSpecies).length]]],
  ['lifetime-million', 'Million Metre Dog', [['total:distance',1_000_000]]],
  ['retrieve-thousand', 'Four-Digit Game Bag', [['total:retrieves',1000]]],
  ['boyd-proud','Boyd Would Be Proud',[['run:time',450],['run:bag',5]]],
  ['deep-water','The Long Retrieve',[['run:time',270],['run:bag',10]]],
  ['never-rattled','Never Rattled',[['run:time',360],['run:chain',9]]],
  ['trail-within-trail','Trail Within a Trail',[['run:time',300],['run:route',5]]],
  ['double-bag','Two Coverts',[['retrieve:mallard',250],['retrieve:pheasant',150]]],
  ['prairie-to-pines','Prairie to Pines',[['metres:prairie',15_000],['metres:boreal',15_000]]],
  ['southern-guide','Southern Guide',[['local-species:gulf',7],['local-species:cypress',7]]],
  ['north-guide','Northern Guide',[['local-species:manitoba',6],['local-species:mountain',5]]],
  ['logging-camp','Logging Camp',[['clear:log',500],['clear:branch',250],['clear:leaning-tree',50]]],
  ['perfect-notebook','Guide’s Notebook',[['species-count',25],['waterfowl-count',17],['rare-count',35]]],
]
for (const [id, name, checks] of legends) add('legend-' + id, name, legendary,
  checks.map(([key, target]) => condition(key, target)), 'Platinum')

for (const [id, name] of [
  ['placement','Camp Placement'], ['overtake','Rival Overtake'], ['distance','Verified Distance'],
  ['retrieves','Verified Retrieves'], ['score','Verified Score'],
]) {
  for (let tier = 0; tier < honorTiers.length; tier++)
    add('camp-' + id + '-' + (tier + 1), name + ' · ' + honorTiers[tier], camp, [], honorTiers[tier], true)
}
for (const [id, name] of [
  ['first-hunt','First Verified Hunt'], ['all-boards','Three Leaderboards'], ['invitational','Camp Invitational'],
  ['rival-series','Returning Rival'], ['private-camp','Private Camp Member'],
]) add('camp-' + id, name, camp, [], 'Gold', true)

export const honors = Object.freeze(honorList)
export const honorById = new Map(honors.map(honor => [honor.id, honor]))
export const honorMetrics = requirements
export const localHonors = honors.filter(honor => !honor.pending)

export function checkLabel(check) {
  const metric = requirements.get(check.key)
  return metric.label + ' · ' + check.target.toLocaleString('en-US') + metric.unit
}
