import { rewardGroups } from './hunt-presentation.js'
import { collectionSearch, matchesCollection, primaryRoom, roomGroups } from './collection-browser.js'
import { encounterTiers, fieldSpecies, habitatEncounters } from './wildlife-catalog.js'
import { journalFieldMarks } from './journal-field-marks.js'
import { environmentalDiscoveries } from './environment-discoveries.js'
import { speciesArtwork, wildlifePortrait } from './wildlife-portrait.js'
import { causes, causeNames, hazardName } from './field-stats.js'
import { fieldHonors, hallOfShame, honorProgress, medals, patches } from './honors.js'
import { legacyTerritoryNames } from './lodge-save.js'
import { expeditionRegions } from './expedition.js'
import { stageAt } from './difficulty.js'
import { categories, personalRecordLabels } from './lodge-save.js'
import { worldwideBoard } from './camp-ui.js'
import { rankedRoom } from './ranked-ui.js'
import { node, number, meters, date, duration, rows, cards } from './lodge-elements.js'
import { careerLine, careerRoom, nearbyHonor } from './career-ui.js'
import { kennelRoom } from './kennel-ui.js'
import { courseRuleset, legacyMigrationRuleset, localCourseRuleset, masteryCourseRuleset } from './ruleset.js'
import { fieldHonorsRoom } from './honor-ui.js'
import { checkLabel, localHonors } from './field-honors.js'
import { kennelItems } from './kennel-catalog.js'
import { progressionMetrics } from './progression.js'

const emblems = {
  paw: 'M7 17c1-2 3-4 5-4s4 2 5 4c1 2 0 4-2 4-1 0-2-1-3-1s-2 1-3 1c-2 0-3-2-2-4ZM4 10a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0Zm4-4a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0Zm5 0a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0Zm4 4a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0Z',
  timber: 'M4 14 14 6a4 4 0 0 1 6 5L10 19m-6-5a4 4 0 1 1 6 5 4 4 0 0 1-6-5Zm2 1.5 1 1.5 1.5-1M12 12l4-3',
  branch: 'M3 8h18M5 8v12m14-12v12M5 12l4-4m10 8-4-8m-6 8 3 3 3-3m-3-5v8',
  bird: 'M3 8c4 0 7 2 9 5 2-3 5-5 9-5-1 4-4 7-7 8l-2 3-2-3c-3-1-6-4-7-8Z',
  trail: 'M3 20c4-1 9-2 9-5 0-4-6-3-6-6s5-4 11-5M12 21c4-1 7-3 7-6 0-5-6-5-6-6s3-2 8-3',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9L12 3Z',
  reeds: 'M7 21c0-7-1-11-3-14m8 14V4m5 17c0-6 1-10 3-13M7 15l-4-2m9 4 4-5m-2 9 6-4',
  water: 'M3 13c3-3 5 3 9 0s6 2 9 0M3 18c3-3 5 3 9 0s6 2 9 0m-9-15c-2 3-4 4-4 6 0 1 1 2 4 2s4-1 4-2c0-2-2-3-4-6Z',
}

export function insignia(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const path = document.createElementNS(svg.namespaceURI, 'path')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  path.setAttribute('d', emblems[name])
  svg.append(path)
  return svg
}

export function patchName(patch, level) {
  return patch.name + (patch.goals.length > 1 ? ' · ' + medals[level] : '')
}

function patchCard(patch, player, shame) {
  const { earned, goal, value: progress } = honorProgress(patch, player)
  const tier = earned.length - 1
  const card = node('article', null, 'patch-card')
  card.dataset.tier = earned.length ? medals[tier].toLowerCase() : 'locked'
  if (shame) card.classList.add('patch-shame')
  const badge = node('div', null, 'patch-badge')
  badge.append(insignia(patch.emblem))
  const state = tier < 0 ? 'Locked' : patch.goals.length > 1 ? medals[tier] : 'Earned'
  card.append(badge, node('p', state, 'patch-state'), node('h4', patch.name), node('p', patch.description, 'patch-copy'))
  const track = node('progress')
  track.max = goal
  track.value = progress
  track.setAttribute('aria-label', patch.name + ' progress')
  const footer = node('div', null, 'patch-progress')
  const suffix = patch.id === 'clean-paws' ? ' s' : ['marathon', 'marsh-legend'].includes(patch.id) ? ' m'
    : patch.id === 'flyway-traveler' ? ' territories' : ''
  footer.append(track, node('span', number(progress) + ' / ' + number(goal) + suffix))
  if (tier >= 0) {
    const unlocked = node('time', date(earned[tier]))
    unlocked.dateTime = earned[tier]
    footer.append(unlocked)
  }
  card.append(footer)
  return card
}

function trophies(player) {
  return [[fieldHonors, 'Field Honors', 'Good Dog', false], [hallOfShame, 'Hall of Shame', 'Bad Dog', true]]
    .map(([group, heading, subtitle, shame]) => {
      const section = node('section', null, 'patch-section')
      const headingRow = node('div', null, 'room-heading')
      headingRow.append(node('h3', heading), node('p', subtitle))
      const grid = node('div', null, 'patch-grid')
      grid.append(...group.map(patch => patchCard(patch, player, shame)))
      section.append(headingRow, grid)
      return section
    })
}

function journal(player) {
  const s = player.stats
  const most = Math.max(...causes.map(cause => s.deathsBy[cause]))
  const cause = most ? causes.filter(cause => s.deathsBy[cause] === most).map(cause => causeNames[cause]).join(' / ') : '—'
  const progress = patches.filter(patch => player.patches[patch.id]?.length).length
  const grid = node('div', null, 'record-grid')
  grid.append(...cards([
    ['Lifetime distance', meters(s.distance)], ['Completed runs', number(s.runs)],
    ['Playtime', duration(s.playtime)], ['Lifetime points', number(s.points)],
    ['Highest score', number(player.profile.best)], ['Longest run', meters(player.profile.farthest)],
    ['Longest active run', player.records.duration ? duration(player.records.duration) : '—'],
    ['Farthest territory', expeditionRegions[player.migration?.farthest - 1]?.name ?? '—'],
    ['Treats collected', number(s.treats)], ['Logs jumped', number(s.logs)],
    ['Branches cleared', number(s.slidesCleared)], ['Geese dodged', number(s.geese)],
    ['Total retrieves', number(player.profile.retrieves)], ['Deaths', number(s.deaths)],
    ['Most common cause', cause], ['Patches earned', Math.round(progress * 100 / patches.length) + '%'],
  ]))
  const breakdown = node('dl', null, 'field-list')
  breakdown.append(...rows([
    ['Mallards retrieved', number(s.ducks)], ['Pheasants retrieved', number(s.pheasants)],
    ['Jump actions', number(s.jumps)], ['Slide actions', number(s.slides)],
    ...causes.map(cause => ['Deaths · ' + causeNames[cause], number(s.deathsBy[cause])]),
    ['Consecutive losses', number(s.failureStreak)],
    ['Same hazard streak', number(s.sameHazardStreak)], ['Under 20 s streak', number(s.earlyStreak)],
  ]))
  const migration = node('dl', null, 'field-list')
  migration.append(...rows(expeditionRegions.map(region =>
    [region.name, duration(player.migration?.seconds[region.index] ?? 0)])))
  const archive = []
  if (player.legacyMigration) {
    const ten = node('dl', null, 'field-list')
    ten.append(...rows(legacyTerritoryNames.map((name, index) => [name, duration(player.legacyMigration.seconds[index])])))
    archive.push(node('h3', 'Earlier ten-territory course', 'section-title section-break'), ten)
  }
  const search = collectionSearch('Search wildlife')
  const categories = node('div', null, 'journal-categories')
  categories.setAttribute('role', 'group')
  categories.setAttribute('aria-label', 'Wildlife group')
  const groups = { all: 'All wildlife', waterfowl: 'Waterfowl', upland: 'Upland birds',
    birds: 'Other birds', mammals: 'Mammals', reptiles: 'Reptiles' }
  let group = 'all'
  for (const [key, name] of Object.entries(groups)) {
    const button = node('button', name)
    button.type = 'button'
    button.setAttribute('aria-pressed', String(key === group))
    button.addEventListener('click', () => {
      group = key
      for (const choice of categories.children) choice.setAttribute('aria-pressed', String(choice === button))
      filter()
    })
    categories.append(button)
  }
  const filters = node('div', null, 'journal-tools')
  filters.append(search, categories)
  const results = node('p', null, 'room-note journal-results')
  results.setAttribute('aria-live', 'polite')
  const guide = node('div', null, 'wildlife-guide')
  let known = 0
  const scientific = {
    mallard: 'Anas platyrhynchos', 'wood-duck': 'Aix sponsa', pintail: 'Anas acuta',
    wigeon: 'Mareca americana', gadwall: 'Mareca strepera', 'green-teal': 'Anas crecca',
    'blue-teal': 'Spatula discors', shoveler: 'Spatula clypeata', canvasback: 'Aythya valisineria',
    redhead: 'Aythya americana', ringneck: 'Aythya collaris', scaup: 'Aythya affinis',
    goldeneye: 'Bucephala clangula', bufflehead: 'Bucephala albeola',
    'hooded-merganser': 'Lophodytes cucullatus', 'common-merganser': 'Mergus merganser',
    'canada-goose': 'Branta canadensis', pheasant: 'Phasianus colchicus', eagle: 'Haliaeetus leucocephalus',
    'snow-goose': 'Anser caerulescens', 'ross-goose': 'Anser rossii',
    'white-fronted-goose': 'Anser albifrons', 'cackling-goose': 'Branta hutchinsii', crane: 'Antigone canadensis',
    deer: 'Odocoileus virginianus', heron: 'Ardea herodias', egret: 'Ardea alba',
    alligator: 'Alligator mississippiensis', moose: 'Alces alces',
  }
  for (const animal of Object.values(fieldSpecies)) {
    const observation = player.wildlife?.species[animal.id]
    const seen = Boolean(observation?.seen)
    known += Number(seen)
    const row = node('article', null, 'wildlife-card')
    row.dataset.species = animal.id
    row.dataset.category = speciesArtwork[animal.id].group
    const image = node('img')
    image.src = wildlifePortrait(animal, true)
    image.decoding = 'async'
    image.alt = ''
    image.width = 100
    image.height = 70
    image.loading = 'lazy'
    const details = node('div', null, 'journal-species-copy')
    details.append(node('strong', animal.name))
    if (scientific[animal.id]) details.append(node('i', scientific[animal.id]))
    details.append(node('p', seen ? number(observation.seen) + (observation.seen === 1 ? ' sighting' : ' sightings') : 'Unobserved',
      'journal-observation'))
    const notes = node('details')
    const summary = node('summary', 'Field notes')
    summary.setAttribute('aria-label', 'Field notes for ' + animal.name)
    notes.append(summary)
    const where = expeditionRegions.find(region => region.key === observation?.territory)?.name
    const observations = node('p', [
      seen && where ? 'First observed in ' + where : '',
      observation?.first ? observation.first.slice(0,10) : '',
      observation?.rare ? number(observation.rare) + ' rare sightings' : '',
      observation?.retrieves ? number(observation.retrieves) + ' retrieves' : '',
    ].filter(Boolean).join(' · '), 'journal-observation')
    const photo = speciesArtwork[animal.id].photo
    const full = node('img', null, 'journal-photo-detail')
    full.alt = animal.name
    full.width = 840
    full.height = 588
    full.decoding = 'async'
    notes.append(full, node('p', animal.habitat), node('p', journalFieldMarks[animal.id]))
    if (observations.textContent) notes.append(observations)
    notes.addEventListener('toggle', () => {
      if (notes.open && !full.hasAttribute('src')) full.src = './' + photo.detail
    })
    const recorded = []
    for (const region of expeditionRegions) {
      const tier = habitatEncounters[region.key].findIndex(species => species.includes(animal.id))
      if (tier < 0) continue
      const seenHere = observation?.regions?.[region.key]
      recorded.push([region.name, encounterTiers[tier] + (seenHere ? ' · ' + number(seenHere) + ' observed' : '')])
    }
    const range = node('dl', null, 'field-list')
    range.append(...rows(recorded))
    const honors = localHonors.filter(honor => honor.checks.some(check => check.key === 'seen:' + animal.id || check.key === 'retrieve:' + animal.id))
    const owned = honors.filter(honor => Object.hasOwn(player.progression.honors, honor.id)).length
    const rewards = kennelItems.filter(item => honors.some(honor => honor.id === item.honor))
    const source = node('a', 'Species reference')
    source.href = animal.source
    source.target = '_blank'
    source.rel = 'noopener'
    notes.append(range, node('p', owned + ' of ' + honors.length + ' species honors'), source)
    if (rewards.length) {
      const kinds = new Set(rewards.map(item => item.bandana ? 'bandanas' : item.id.endsWith('-vest') ? 'vests' : 'collars'))
      notes.append(node('p', 'Equipment rewards · ' + [...kinds].join(', ')))
    }
    const credit = node('a', 'Photo by ' + photo.author, 'photo-credit')
    credit.href = photo.source
    credit.target = '_blank'
    credit.rel = 'noopener'
    const terms = node('a', photo.license, 'photo-credit')
    terms.href = photo.terms
    terms.target = '_blank'
    terms.rel = 'noopener'
    notes.append(credit, terms, node('small', 'Framed and resized for the Journal', 'photo-credit'))
    row.append(image, details, notes)
    guide.append(row)
  }
  const filter = () => {
    let count = 0
    for (const row of guide.children) {
      const id = row.dataset.species
      row.hidden = (group !== 'all' && row.dataset.category !== group) ||
        !matchesCollection(search.value, fieldSpecies[id].name, scientific[id], fieldSpecies[id].habitat)
      if (!row.hidden) count++
    }
    results.textContent = count ? '' : 'No species match this search.'
  }
  search.addEventListener('input', filter)
  const values = progressionMetrics(player)
  const collections = node('details', null, 'career-ledger')
  collections.append(node('summary', 'Regional wildlife collections'))
  const regionList = node('dl', null, 'field-list')
  regionList.append(...rows(expeditionRegions.map(region => [region.name, values.get('local-species:' + region.key) + ' / ' +
    new Set(habitatEncounters[region.key].flat()).size])))
  collections.append(regionList)
  const lifetime = node('details', null, 'career-ledger')
  lifetime.append(node('summary', 'Lifetime Field Journal'), grid,
    node('h3', 'The Great Migration · territory time', 'section-title section-break'), migration, ...archive,
    node('h3', 'Field breakdown', 'section-title section-break'), breakdown)
  const discoveries = Object.entries(player.discoveries?.entries ?? {})
  const notes = node('section', null, 'journal-environment')
  notes.setAttribute('aria-label','Environmental discoveries')
  notes.id = 'journal-environment'
  notes.hidden = true
  if (discoveries.length) {
    for (const [id,first] of discoveries) {
      const feature = environmentalDiscoveries[id]
      if (!feature) continue
      const section = node('section',null,'room-note journal-discovery')
      section.append(node('strong',feature.name),node('p',feature.note),
        node('p',expeditionRegions.find(region=>region.key===feature.territory).name + ' · ' + first.slice(0,10)))
      notes.append(section)
    }
  } else notes.append(node('p','No environmental discoveries recorded.','room-note'))
  const intro = node('div', null, 'journal-guide-intro')
  const total = Object.keys(fieldSpecies).length
  const progressMeter = node('progress')
  progressMeter.max = total
  progressMeter.value = known
  progressMeter.setAttribute('aria-label', 'Wildlife observed')
  intro.append(node('h3', 'Wildlife field guide'), node('span', known + ' of ' + total + ' observed'), progressMeter)
  const select = node('div', null, 'journal-categories journal-sections')
  select.setAttribute('role','group')
  select.setAttribute('aria-label','Journal sections')
  const wildlife = node('div')
  wildlife.id = 'journal-wildlife'
  wildlife.append(intro, filters, results, guide, collections)
  const btnGuide = node('button','Wildlife')
  const btnNotes = node('button','Discoveries' + (discoveries.length ? ' · ' + discoveries.length : ''))
  btnGuide.setAttribute('aria-controls',wildlife.id)
  btnNotes.setAttribute('aria-controls',notes.id)
  const setSection = showNotes => {
    wildlife.hidden = showNotes
    notes.hidden = !showNotes
    btnGuide.setAttribute('aria-pressed',String(!showNotes))
    btnNotes.setAttribute('aria-pressed',String(showNotes))
  }
  btnGuide.addEventListener('click',() => setSection(false))
  btnNotes.addEventListener('click',() => setSection(true))
  select.append(btnGuide,btnNotes)
  setSection(false)
  return [select, wildlife, notes, lifetime]
}

function leaderboard(lodge, metric, selectMetric) {
  const controls = node('div', null, 'board-filters')
  for (const [id, label] of Object.entries(categories)) {
    const button = node('button', label)
    button.type = 'button'
    button.dataset.metric = id
    button.setAttribute('aria-pressed', String(metric === id))
    button.addEventListener('click', () => selectMetric(id))
    controls.append(button)
  }
  function board(entries) {
    const list = node('ol', null, 'camp-board')
    entries.forEach((entry, index) => {
      const row = node('li')
      const rank = node('span', String(index + 1), 'board-rank')
      rank.setAttribute('aria-label', 'Rank ' + (index + 1))
      const who = node('div', null, 'board-runner')
      who.append(node('strong', lodge.nameFor(entry.player)), node('time', date(entry.date)))
      const highlight = node('strong', metric === 'distance' ? meters(entry.distance) : number(entry[metric]), 'board-score')
      const detail = node('p', [
        number(entry.score) + ' pts', meters(entry.distance), number(entry.retrieves) + ' retrieves',
        number(entry.treats) + ' treats', number(entry.logs) + ' logs', number(entry.geese) + ' geese',
      ].filter(Boolean).join(' · '), 'board-detail')
      row.append(rank, who, highlight, detail)
      list.append(row)
    })
    return list
  }
  const entries = lodge.board(metric, masteryCourseRuleset)
  const empty = node('p', 'Finish a run to post the first score.', 'empty-board')
  const archived = [[localCourseRuleset, 'Raptor Great Migration'], [courseRuleset, 'Phase 05 Great Migration'], [legacyMigrationRuleset, 'Previous Great Migration'], ['legacy-10', 'Earlier ten-territory course']]
    .flatMap(([course, label]) => {
      const past = lodge.board(metric, course)
      return past.length ? [node('h3', label, 'section-title section-break'), board(past)] : []
    })
  return [node('h3', 'Camp Leaderboard', 'section-title'),
    node('p', 'Local to this device · Top 20 per category and course', 'room-note'), controls,
    entries.length ? board(entries) : empty, ...archived]
}

export function fillReport(ui, report, { heckle, previousBest = 0, player } = {}) {
  const wildlife = document.getElementById('report-wildlife')
  if (wildlife) {
    const animals = (report.newWildlife ?? []).map(id => fieldSpecies[id]).filter(Boolean)
    wildlife.hidden = !animals.length
    wildlife.replaceChildren()
    if (animals.length) {
      wildlife.append(node('strong', 'New in the Field Journal'))
      const discovered = node('span', null, 'report-specimens')
      for (const animal of animals) {
        const chip = node('span')
        const portrait = node('img')
        portrait.src = wildlifePortrait(animal, true)
        portrait.alt = ''
        portrait.width = 48
        portrait.height = 34
        portrait.loading = 'lazy'
        chip.append(portrait, node('span', animal.name))
        discovered.append(chip)
      }
      wildlife.append(discovered)
    }
  }
  ui['report-nickname'].textContent = report.nickname
  const stage = stageAt(report.duration)
  const scoreRecord = report.improved.includes('score')
  const record = scoreRecord || report.improved.includes('distance')
  const placement = Object.entries(report.placements).filter(([, rank]) => rank)
    .map(([metric, rank]) => '#' + rank + ' · ' + categories[metric])
  ui['report-message'].textContent = heckle
  ui['report-record'].hidden = !record
  ui['report-record'].textContent = scoreRecord ? 'New personal best' : 'New distance record'
  ui['report-best'].textContent = scoreRecord && previousBest ? number(report.score - previousBest) + ' points above your previous best'
    : scoreRecord ? 'Your first score on the board'
      : previousBest > report.score ? number(previousBest - report.score) + ' points to match your personal best'
        : previousBest && previousBest === report.score ? 'Matched your personal best' : ''
  ui['report-headline'].replaceChildren(...cards([
    ['Score', number(report.score)], ['Distance', meters(report.distance)],
    ['Survival', duration(report.duration)],
  ]))
  const region = expeditionRegions[report.territory - 1]
  ui['report-summary-context'].textContent = [
    region?.name, report.retrieves + (report.retrieves === 1 ? ' retrieve' : ' retrieves'),
    record ? ui['report-record'].textContent : null,
  ].filter(Boolean).join(' · ')
  ui['report-record'].hidden = true
  ui['report-xp-summary'].textContent = report.career && player ? '+' + number(report.career.earned) + ' XP · ' + careerLine(player) : ''
  const rewards = rewardGroups(report)
  ui['report-reward-summary'].replaceChildren(...rewards.slice(0, 4).map(group => {
    const label = (group.count > 1 || ['honor', 'gear', 'species', 'lodge'].includes(group.type) ? group.count + ' ' : '') + group.label
    const item = node('li', label)
    item.dataset.reward = group.type
    return item
  }))
  if (rewards.length > 4) ui['report-reward-summary'].append(node('li', '+' + (rewards.length - 4) + ' reward groups'))
  ui['report-details'].hidden = true
  ui['report-details-toggle'].textContent = 'Full Field Report'
  ui['report-details-toggle'].setAttribute('aria-expanded', 'false')
  const next = player && report.career && nearbyHonor(player)
  const nextHonor = ui['report-next-honor']
  nextHonor.hidden = !next
  if (next) nextHonor.textContent = 'Within reach · ' + next.name + ' · ' + checkLabel(next.checks[0])
  ui['report-tallies'].replaceChildren(...rows([
    ['Cause of death', hazardName(report.hazard)], ['Territory reached', expeditionRegions[report.territory - 1]?.name ?? '—'],
    ['Difficulty reached', 'Stage ' + stage.level + ' · ' + stage.group],
    ['Active time', duration(report.duration)], ['Treats collected', number(report.treats)],
    ['Logs jumped', number(report.logs)], ['Branches cleared', number(report.slidesCleared)],
    ['Geese dodged', number(report.geese)], ['Retrieves', number(report.retrieves)],
    ['Hunt score', number(report.score)], ['Distance', meters(report.distance)],
    ...(Number.isFinite(report.nearMisses) ? [
      ['Best treat chain', number(report.bestStreak ?? 0)],
      ['Near misses', number(report.nearMisses)], ['Best clean sequence', number(report.bestCleanStreak)],
    ] : []),
    ['Territories reached', expeditionRegions.slice(0, report.territory).map(place => place.name).join(' · ')],
    ['Species encountered', Object.entries(report.wildlife ?? {}).filter(([, item]) => item.seen)
      .map(([id, item]) => fieldSpecies[id].name + ' ×' + item.seen).join(' · ') || '—'],
  ]))
  if (report.field) ui['report-tallies'].append(...rows([
    ['Verified clears', number(Object.values(report.field.clears).reduce((sum, n) => sum + n, 0))],
    ['Lane changes', number(report.field.shifts)], ['Longest clear chain', number(report.field.chain)],
  ]))
  const highlights = [
    ['Personal records', report.improved.map(key => personalRecordLabels[key])],
    ['New patches', report.earned.map(({ patch, level }) => patchName(patch, level))],
    ['Field Honors', (report.newHonors ?? []).map(honor => honor.name)],
    ['Equipment earned', (report.gear ?? []).map(item => item.name)],
    ['Camp placement', report.preview ? [] : placement.length ? placement : ['Outside the local top 20']],
  ]
  ui['report-highlights'].replaceChildren(...highlights.filter(([, items]) => items.length).map(([title, items]) => {
    const group = node(items.length > 3 ? 'details' : 'div', null, 'report-highlight')
    group.append(node(items.length > 3 ? 'summary' : 'h3', title + (items.length > 3 ? ' · ' + items.length : '')), node('p', items.join(' · ')))
    return group
  }))
}

export function createLodgeUI(ui, lodge, { camp, rankedCamp, onPlayer, onOpen, onClose, onKennel, onAppearance, onDestination,
  onStart, onJoin, onErase, inspectDogs }) {
  const dialog = ui.lodge
  const panel = ui['lodge-panel']
  const scroll = dialog.querySelector('.lodge-scroll')
  const tabs = [...dialog.querySelectorAll('[data-room]')]
  const picker = ui['lodge-room']
  const rooms = node('nav', null, 'legacy-room-nav')
  rooms.setAttribute('aria-label','Lodge rooms')
  panel.before(rooms)
  const lodgeRooms = { overview:'Cabin', collection:'Trophies', history:'Timeline', records:'Records',
    migration:'Migration', career:'Ranks', trophies:'Honors', shame:'Camp humor' }
  let demo
  const labels = { overview: 'Lodge overview', collection: 'Trophy room', trophies: 'Field Honors', career: 'Career and Master Hunter',
    history: 'Career timeline', records: 'Personal records', migration: 'Great Migration', shame: 'Hall of Shame',
    kennel: 'Kennel', equipment: 'Equipment room', board: 'Local records', worldwide: 'Worldwide rankings', friends: 'Friends',
    'private-camps': 'Private Camps', 'camp-profile': 'Competitive profile', 'camp-archives': 'Archived standings' }
  const positions = new Map()
  const views = new Map()
  const galleryRooms = new Set(['overview','collection','migration','equipment','shame','records','history'])
  let room = 'overview'
  let target
  let request = 0
  let gallery
  let galleryLoading
  let metric = 'score'
  let rivalMetric = 'score'
  let trigger

  function selectRoom(value, detail) {
    positions.set(room, scroll.scrollTop)
    room = value
    target = typeof detail === 'string' ? detail : undefined
    renderRoom()
    if (detail === true) tabs.find(tab => tab.dataset.room === value)?.focus({ preventScroll: true })
  }

  function renderRoom() {
    const intent = ++request
    onKennel(null)
    const reading = demo ?? lodge
    const player = reading.current()
    const group = primaryRoom(room)
    if (dialog.dataset.destination !== group) {
      dialog.dataset.destination = group
      onDestination?.(group)
    }
    const title = ui['lodge-title']
    if (group === 'overview') title.replaceChildren('The ', node('em', 'Lodge'))
    else title.textContent = { kennel: 'Kennel', journal: 'Field Journal', worldwide: 'Worldwide', board: 'Camp' }[group]
    ui['close-lodge'].setAttribute('aria-label', 'Close ' + title.textContent)
    panel.setAttribute('aria-labelledby', 'tab-' + group)
    for (const tab of tabs) {
      if (tab.dataset.room === group) tab.setAttribute('aria-current', 'page')
      else tab.removeAttribute('aria-current')
    }
    rooms.hidden = group !== 'overview'
    rooms.replaceChildren(...Object.entries(lodgeRooms).map(([key,label]) => {
      const button = node('button',label)
      button.type = 'button'
      button.dataset.lodgeRoom = key
      if (key === room) button.setAttribute('aria-current','page')
      button.addEventListener('click',() => {
        selectRoom(key)
        rooms.querySelector('[data-lodge-room="'+key+'"]')?.focus({ preventScroll:true })
      })
      return button
    }))
    ui['room-picker'].hidden = group === 'overview' || room === 'worldwide' || roomGroups[group].length < 2
    picker.replaceChildren(...roomGroups[group].map(key => {
      const option = node('option', labels[key])
      option.value = key
      return option
    }))
    picker.value = room
    if (room === 'overview') views.delete(room)
    const remembered = !target && room !== 'kennel' && views.get(room)
    if (remembered) {
      panel.replaceChildren(...remembered)
      scroll.scrollTop = positions.get(room) ?? 0
      return
    }
    function selectMetric(value) {
      metric = value
      if (room === 'camp-archives') rivalMetric = value
      views.delete(room)
      renderRoom()
      panel.querySelector('[data-metric=' + value + ']')?.focus({ preventScroll: true })
    }
    let content
    let stage
    if (room === 'board' || room === 'camp-archives') {
      const isWorldwide = room === 'camp-archives'
      if (isWorldwide) metric = rivalMetric
      content = isWorldwide ? [worldwideBoard(camp, player, metric, selectMetric, { onJoin, onStart })]
        : leaderboard(lodge, metric, selectMetric)
    } else if (group === 'board' || group === 'worldwide') {
      content = [rankedRoom(room, rankedCamp, camp, player, { start: onStart, navigate: selectRoom, onJoin, onErase })]
    } else if (room === 'kennel') {
      ({ content, stage } = kennelRoom(reading, onAppearance, inspectDogs, breed => {
        if (!reading.selectBreed(breed)) return
        if (!demo) onPlayer()
        renderRoom()
        panel.querySelector('.kennel-breeds').open = true
      }, target))
    } else if (room === 'career') content = careerRoom(player, insignia)
    else if (room === 'trophies') content = fieldHonorsRoom(player, insignia, trophies(player), target, rankedCamp.honors(player.id))
    else if (room === 'journal') content = journal(player)
    else if (galleryRooms.has(room)) {
      if (!gallery) {
        const pending = node('p', 'Opening the Lodge…', 'room-note')
        pending.setAttribute('role', 'status')
        panel.replaceChildren(pending)
        galleryLoading ??= import('./lodge-gallery.js').then(module => { gallery = module.showLodgeRoom })
          .finally(() => { galleryLoading = undefined })
        galleryLoading.then(() => {
          if (dialog.open && intent === request) renderRoom()
        }).catch(() => {
          if (dialog.open && intent === request) panel.replaceChildren(node('p',
            'The Lodge room could not open. Try this tab again or use the install repair screen.', 'room-note'))
        })
        return
      }
      content = gallery(room, player, { lodge: reading, target, preview: Boolean(demo),
        competitive: demo ? [] : rankedCamp.honors(player.id),
        hunt: () => { if (demo || !onStart()) dialog.close() },
        navigate(value, detail) {
        views.delete('overview')
        selectRoom(value, detail)
        tabs.find(tab => tab.dataset.room === primaryRoom(value))?.focus({ preventScroll: true })
      } })
    }
    panel.replaceChildren(...content)
    if (stage) onKennel(stage)
    else if (room === 'trophies' || room === 'collection') views.set(room, content)
    if (!target) scroll.scrollTop = positions.get(room) ?? 0
  }

  function renderPlayers() {
    positions.clear()
    views.clear()
    const reading = demo ?? lodge
    const player = reading.current()
    ui['active-nickname'].textContent = 'Playing as ' + player.nickname
    ui.nickname.value = player.nickname
    const select = ui['local-player']
    select.replaceChildren(...reading.players().map(item => {
      const option = node('option', item.nickname)
      option.value = item.id
      return option
    }))
    select.value = player.id
    renderRoom()
  }

  ui['local-player'].addEventListener('change', event => {
    if (demo) return
    lodge.select(Number(event.currentTarget.value))
    onPlayer()
    renderPlayers()
  })
  ui['nickname-form'].addEventListener('submit', event => {
    event.preventDefault()
    if (demo) return
    if (event.submitter?.value === 'new') {
      const name = ui.nickname.value.trim()
      lodge.newPlayer(name === lodge.current().nickname ? '' : name)
    } else {
      lodge.rename(ui.nickname.value)
    }
    onPlayer()
    renderPlayers()
  })
  for (const tab of tabs) tab.addEventListener('click', () => selectRoom(tab.dataset.room))
  picker.addEventListener('change', () => selectRoom(picker.value))
  ui['camp-hunt'].addEventListener('click', () => dialog.close())

  function onConnectivity() {
    if (dialog.open && ['worldwide', 'friends', 'private-camps', 'camp-profile', 'camp-archives'].includes(room)) renderRoom()
  }
  window.addEventListener('online', onConnectivity)
  window.addEventListener('offline', onConnectivity)
  function fitViewport() {
    if (!dialog.open || !window.visualViewport) return
    const viewport = window.visualViewport
    if (viewport.scale !== 1) return
    dialog.style.setProperty('--lodge-viewport', viewport.height + 'px')
    dialog.style.setProperty('--lodge-offset', viewport.offsetTop + 'px')
  }
  window.visualViewport?.addEventListener('resize', fitViewport)
  window.visualViewport?.addEventListener('scroll', fitViewport)
  ui['close-lodge'].addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => {
    request++
    demo = undefined
    dialog.removeAttribute('data-demo-lodge')
    views.clear()
    positions.clear()
    onKennel(null)
    panel.replaceChildren()
    onClose()
    trigger?.focus({ preventScroll: true })
  })
  return {
    open(button, targetRoom = 'overview', detail, demonstration) {
      demo = demonstration
      dialog.toggleAttribute('data-demo-lodge',Boolean(demo))
      trigger = button
      room = targetRoom
      target = detail
      dialog.showModal()
      fitViewport()
      renderPlayers()
      ui['camp-profile'].open = false
      scroll.scrollTop = 0
      onOpen()
      ui['close-lodge'].focus({ preventScroll: true })
    },
  }
}
