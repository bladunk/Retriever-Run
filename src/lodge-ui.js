import { encounterTiers, fieldSpecies, habitatEncounters } from './wildlife-catalog.js'
import { wildlifePortrait } from './wildlife-portrait.js'
import { causes, causeNames, hazardName } from './field-stats.js'
import { fieldHonors, hallOfShame, honorProgress, medals, patches } from './honors.js'
import { legacyTerritoryNames } from './lodge-save.js'
import { expeditionRegions } from './expedition.js'
import { stageAt } from './difficulty.js'
import { categories, personalRecordLabels } from './lodge-save.js'
import { campSwitch, worldwideBoard } from './camp-ui.js'
import { node, number, meters, date } from './lodge-elements.js'
import { careerRoom, nearbyHonor } from './career-ui.js'
import { kennelRoom } from './kennel-ui.js'
import { courseRuleset, legacyMigrationRuleset } from './ruleset.js'
import { fieldHonorsRoom } from './honor-ui.js'
import { checkLabel, localHonors, waterfowlSpecies } from './field-honors.js'
import { kennelItems } from './kennel-catalog.js'
import { progressionMetrics } from './progression.js'

function duration(seconds) {
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  return (minutes >= 60 ? Math.floor(minutes / 60) + 'h ' : '') +
    (minutes ? (minutes % 60) + 'm ' : '') + total % 60 + 's'
}

function rows(items) {
  return items.map(([name, value]) => {
    const row = node('div')
    row.append(node('dt', name), node('dd', value))
    return row
  })
}

function cards(items) {
  return items.map(([name, value]) => {
    const card = node('div', null, 'record-card')
    card.append(node('strong', value), node('span', name))
    return card
  })
}

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

function personalRecords(player) {
  const { profile, records } = player
  const grid = node('div', null, 'record-grid')
  const stats = [
    ['Highest score', profile.best ? number(profile.best) : '—'],
    ['Longest run', profile.farthest ? meters(profile.farthest) : '—'],
    ['Best treat streak', profile.streak ? number(profile.streak) : '—'],
    ...Object.keys(records).map(key => [personalRecordLabels[key],
      records[key] ? (key === 'duration' ? duration(records[key]) : number(records[key])) : '—']),
  ]
  grid.append(...cards(stats))
  return [node('h3', 'Personal Records', 'section-title'), grid]
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
    const image = node('img')
    image.src = wildlifePortrait(animal, seen)
    image.alt = ''
    image.width = 100
    image.height = 70
    image.loading = 'lazy'
    const details = node('div')
    const where = expeditionRegions.find(region => region.key === observation?.territory)?.name
    details.append(node('strong', animal.name), node('p', animal.habitat),
      node('p', seen ? number(observation.seen) + ' observations · ' + (where ?? 'First territory unavailable') : 'Unobserved'))
    if (scientific[animal.id]) details.append(node('i', scientific[animal.id]))
    if (seen && observation.first) details.append(node('p', 'First seen ' + observation.first.slice(0,10)))
    if (observation?.rare || observation?.retrieves) details.append(node('p',
      [observation.rare ? number(observation.rare) + ' rare sightings' : '',
        observation.retrieves ? number(observation.retrieves) + ' retrieves' : ''].filter(Boolean).join(' · ')))
    const notes = node('details')
    notes.append(node('summary', 'Range and honors'))
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
    details.append(notes)
    row.append(image, details)
    guide.append(row)
  }
  const values = progressionMetrics(player)
  const collections = node('details', null, 'career-ledger')
  collections.append(node('summary', 'Regional wildlife collections'))
  const regionList = node('dl', null, 'field-list')
  regionList.append(...rows(expeditionRegions.map(region => [region.name, values.get('local-species:' + region.key) + ' / ' +
    new Set(habitatEncounters[region.key].flat()).size])))
  collections.append(regionList)
  return [node('h3', 'Wildlife · ' + known + ' of ' + Object.keys(fieldSpecies).length + ' observed', 'section-title'),
    node('p', 'Waterfowl · ' + values.get('waterfowl-count') + ' of ' + waterfowlSpecies.length + ' observed', 'room-note'), collections,
    guide, node('h3', 'Lifetime Field Journal', 'section-title section-break'),
    grid, node('h3', 'The Great Migration · territory time', 'section-title section-break'), migration, ...archive,
    node('h3', 'Field breakdown', 'section-title section-break'), breakdown, ...personalRecords(player)]
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
  const entries = lodge.board(metric, courseRuleset)
  const empty = node('p', 'Finish a run to post the first score.', 'empty-board')
  const archived = [[legacyMigrationRuleset, 'Previous Great Migration'], ['legacy-10', 'Earlier ten-territory course']]
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
    const names = (report.newWildlife ?? []).map(id => fieldSpecies[id]?.name).filter(Boolean)
    wildlife.hidden = !names.length
    wildlife.textContent = names.length ? 'New in the Field Journal · ' + names.join(', ') : ''
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
    ['Personal best', number(Math.max(previousBest, scoreRecord ? report.score : 0))],
  ]))
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

export function createLodgeUI(ui, lodge, { camp, onPlayer, onOpen, onClose, onKennel, onAppearance, onStart, onJoin, inspectDogs }) {
  const dialog = ui.lodge
  const panel = ui['lodge-panel']
  const scroll = dialog.querySelector('.lodge-scroll')
  const tabs = [...dialog.querySelectorAll('[role=tab]')]
  let room = 'trophies'
  let metric = 'score'
  let rivalMetric = 'score'
  let trigger

  function renderRoom() {
    onKennel(null)
    const player = lodge.current()
    panel.setAttribute('aria-labelledby', 'tab-' + room)
    for (const tab of tabs) {
      const active = tab.dataset.room === room
      tab.setAttribute('aria-selected', String(active))
      tab.tabIndex = active ? 0 : -1
    }
    function selectMetric(value) {
      metric = value
      if (room === 'worldwide') rivalMetric = value
      renderRoom()
      panel.querySelector('[data-metric=' + value + ']')?.focus({ preventScroll: true })
    }
    function selectRoom(value, focus = false) {
      room = value
      renderRoom()
      scroll.scrollTop = 0
      if (focus) tabs.find(tab => tab.dataset.room === value).focus({ preventScroll: true })
    }
    let content
    let stage
    if (room === 'board' || room === 'worldwide') {
      const isWorldwide = room === 'worldwide'
      const switcher = campSwitch(isWorldwide, () => selectRoom('board', true), () => selectRoom('worldwide', true))
      if (isWorldwide) metric = rivalMetric
      content = isWorldwide ? [switcher, worldwideBoard(camp, player, metric, selectMetric, { onJoin, onStart })]
        : [switcher, ...leaderboard(lodge, metric, selectMetric)]
    } else if (room === 'kennel') {
      ({ content, stage } = kennelRoom(lodge, onAppearance, inspectDogs, breed => {
        if (!lodge.selectBreed(breed)) return
        onPlayer()
        renderRoom()
        panel.querySelector('.kennel-breeds').open = true
      }))
    } else if (room === 'career') content = careerRoom(player, insignia)
    else content = room === 'trophies' ? fieldHonorsRoom(player, insignia, trophies(player)) : room === 'journal' ? journal(player) : personalRecords(player)
    panel.replaceChildren(...content)
    if (stage) onKennel(stage)
  }

  function renderPlayers() {
    const player = lodge.current()
    ui['active-nickname'].textContent = 'Playing as ' + player.nickname
    ui.nickname.value = player.nickname
    const select = ui['local-player']
    select.replaceChildren(...lodge.players().map(item => {
      const option = node('option', item.nickname)
      option.value = item.id
      return option
    }))
    select.value = player.id
    renderRoom()
  }

  ui['local-player'].addEventListener('change', event => {
    lodge.select(Number(event.currentTarget.value))
    onPlayer()
    renderPlayers()
  })
  ui['nickname-form'].addEventListener('submit', event => {
    event.preventDefault()
    if (event.submitter?.value === 'new') {
      const name = ui.nickname.value.trim()
      lodge.newPlayer(name === lodge.current().nickname ? '' : name)
    } else {
      lodge.rename(ui.nickname.value)
    }
    onPlayer()
    renderPlayers()
  })
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      room = tab.dataset.room
      renderRoom()
      scroll.scrollTop = 0
    })
    tab.addEventListener('keydown', event => {
      const index = tabs.indexOf(tab)
      const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        Home: 0, End: tabs.length - 1 }[event.key]
      if (next === undefined) return
      event.preventDefault()
      tabs[next].click()
      tabs[next].focus()
    })
  }

  function onConnectivity() {
    if (dialog.open && room === 'worldwide') renderRoom()
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
    onKennel(null)
    onClose()
    trigger?.focus({ preventScroll: true })
  })
  return {
    rivalMetric: () => rivalMetric,
    open(button, targetRoom) {
      trigger = button
      if (targetRoom) room = targetRoom
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
